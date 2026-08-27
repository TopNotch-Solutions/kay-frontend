import { useEffect, useMemo, useState } from 'react';
import {
  createConsultation,
  updateConsultation,
  getConsultationsByVisit,
} from '../../../api/doctor';
import { completeQueueEntry } from '../../../api/queue';
import { checkMedicationStock, getMedicationCatalog } from '../../../api/inventory';
import { vitalsToIntakeForm, emptyMedLine, commitMedLineToList, buildPrescriptionItemPayload } from '../doctorConsultForm';
import {
  emptyDoctorVitalsForm,
  emptyDentalExamForm,
  emptyFollowUpForm,
  vitalsToDoctorForm,
  dentalExamToForm,
  followUpToForm,
  buildDoctorVitalsPayload,
  buildDentalExamPayload,
} from '../doctorDentalExamForm';
import DoctorConsultationForm from './DoctorConsultationForm';
import { confirmAction } from '../../../utils/confirmAction';
import ConsultationMedicalHistoryPanel from '../../../components/patient/ConsultationMedicalHistoryPanel';

function parseStoredDiagnoses(diagnosisText) {
  if (!diagnosisText || typeof diagnosisText !== 'string') return [];
  return diagnosisText
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*[—–-]\s*(.+)$/i);
      if (m) return { code: m[1].toUpperCase(), label: m[2].trim() };
      return null;
    })
    .filter(Boolean);
}

function prescriptionItemsToLines(consultation) {
  const prescriptions = consultation?.prescriptions;
  if (!Array.isArray(prescriptions) || !prescriptions.length) {
    const fromActions = (() => {
      const raw = consultation?.actions_taken;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      return Array.isArray(parsed?.prescriptions) ? parsed.prescriptions : [];
    })();
    return fromActions.map((item) => ({
      medication_name: item.medication_name || '',
      generic_name: item.generic_name || '',
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      quantity: item.quantity || 1,
      instructions: item.instructions || '',
      schedule_type: item.schedule_type || 'once_off',
      recurring_day_of_month: item.recurring_day_of_month ?? '',
      recurring_weekdays: item.recurring_weekdays || [],
      recurring_dates: item.recurring_dates || [],
      stock_status: item.stock_status || (item.is_available === false ? 'out_of_stock' : 'in_stock'),
      stock_label: item.stock_label || (item.is_available === false ? 'Out of stock' : 'In stock'),
      quantity_in_stock: item.stock_at_prescribe ?? item.quantity_in_stock ?? 0,
      can_dispense: item.is_available !== false && item.can_dispense !== false,
    }));
  }

  const lines = [];
  prescriptions.forEach((rx) => {
    (rx.items || []).forEach((item) => {
      lines.push({
        medication_name: item.medication_name || '',
        generic_name: '',
        dosage: item.dosage || '',
        frequency: item.frequency || '',
        quantity: item.quantity || 1,
        instructions: item.instructions || '',
        schedule_type: item.schedule_type || 'once_off',
        recurring_day_of_month: item.recurring_day_of_month ?? '',
        recurring_weekdays: item.recurring_weekdays || [],
        recurring_dates: item.recurring_dates || [],
        stock_status: item.is_available === false ? 'out_of_stock' : 'in_stock',
        stock_label: item.is_available === false ? 'Out of stock' : 'In stock',
        quantity_in_stock: item.stock_at_prescribe ?? 0,
        can_dispense: item.is_available !== false,
      });
    });
  });
  return lines;
}

export default function DoctorWorkspace({
  patient,
  actionLoading,
  setActionLoading,
  onToast,
  onActionError,
  onDone,
}) {
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnoses, setDiagnoses] = useState([]);
  const [icdInput, setIcdInput] = useState('');
  const [vitalsForm, setVitalsForm] = useState(() => emptyDoctorVitalsForm());
  const [dentalExam, setDentalExam] = useState(() => emptyDentalExamForm());
  const [followUp, setFollowUp] = useState(() => emptyFollowUpForm());
  const [consultationId, setConsultationId] = useState(null);
  const [medLine, setMedLine] = useState(emptyMedLine);
  const [prescriptionLines, setPrescriptionLines] = useState([]);
  const [medFieldErrors, setMedFieldErrors] = useState({});
  const [diagnosisErrors, setDiagnosisErrors] = useState({});
  const [complaintError, setComplaintError] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [routingError, setRoutingError] = useState('');
  const [medCatalog, setMedCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [liveStock, setLiveStock] = useState(null);
  const [stockChecking, setStockChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError('');
    getMedicationCatalog()
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setMedCatalog(list);
        if (list.length === 0) {
          setCatalogError('No medications in catalog. Run backend migration and medication catalog seed.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMedCatalog([]);
          setCatalogError(err.message || 'Could not load medication catalog.');
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const name = medLine.medication_name?.trim();
    const qty = Number(medLine.quantity) || 1;
    if (!name) {
      setLiveStock(null);
      return undefined;
    }

    let cancelled = false;
    setStockChecking(true);
    const timer = setTimeout(() => {
      checkMedicationStock(name, qty)
        .then((data) => {
          if (!cancelled) setLiveStock(data);
        })
        .catch(() => {
          if (!cancelled) setLiveStock(null);
        })
        .finally(() => {
          if (!cancelled) setStockChecking(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [medLine.medication_name, medLine.quantity]);

  const intakeForm = useMemo(
    () => vitalsToIntakeForm(patient?.vitals),
    [patient?.vitals, patient?.entryId]
  );

  useEffect(() => {
    setVitalsForm(vitalsToDoctorForm(patient?.vitals));
  }, [patient?.vitals, patient?.entryId]);

  useEffect(() => {
    setClinicalNotes('');
    setDiagnoses([]);
    setIcdInput('');
    setConsultationId(null);
    setDentalExam(emptyDentalExamForm());
    setFollowUp(emptyFollowUpForm());
    setMedLine(emptyMedLine());
    setPrescriptionLines([]);
    setLiveStock(null);
    setMedFieldErrors({});
    setDiagnosisErrors({});
    setComplaintError('');
    setFollowUpError('');
    setRoutingError('');

    if (!patient?.visitId) return;
    getConsultationsByVisit(patient.visitId)
      .then((list) => {
        const latest = Array.isArray(list) ? list[0] : null;
        if (latest?.id) setConsultationId(latest.id);
        if (latest?.notes) setClinicalNotes(latest.notes);
        if (latest?.dental_exam) {
          setDentalExam(dentalExamToForm(latest.dental_exam));
          setFollowUp(followUpToForm(latest.dental_exam.follow_up));
        }
        const restored = parseStoredDiagnoses(latest?.diagnosis);
        if (restored.length) setDiagnoses(restored);
        else if (latest?.diagnosis?.trim()) setIcdInput(latest.diagnosis.trim());
        const rxLines = prescriptionItemsToLines(latest);
        if (rxLines.length) setPrescriptionLines(rxLines);
      })
      .catch(() => {});
  }, [patient?.entryId, patient?.visitId]);

  function setMedField(key, value) {
    setMedLine((prev) => ({ ...prev, [key]: value }));
    setMedFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleMedicationSelect(medicationName) {
    const entry = medCatalog.find(
      (c) => c.name === medicationName || c.medication_name === medicationName
    );
    setMedLine((prev) => ({
      ...prev,
      medication_name: medicationName,
      generic_name: entry?.generic || entry?.generic_name || '',
    }));
    setMedFieldErrors((prev) => {
      if (!prev.medication_name) return prev;
      const next = { ...prev };
      delete next.medication_name;
      return next;
    });
  }

  function clearDiagnosisError(key) {
    setDiagnosisErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateChiefComplaint() {
    if (!(vitalsForm.chief_complaint || '').trim()) {
      setComplaintError('Enter the chief complaint before completing the consultation.');
      document.getElementById('doc-complaint-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    setComplaintError('');
    return true;
  }

  function validateFollowUp() {
    const hasTime = Boolean((followUp.time || '').trim());
    const hasNotes = Boolean((followUp.notes || '').trim());
    const hasDate = Boolean((followUp.date || '').trim());
    if ((hasTime || hasNotes) && !hasDate) {
      setFollowUpError('Select a follow-up date when time or notes are set.');
      document.getElementById('doc-follow-up-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    if (hasDate) {
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const d = String(tomorrow.getDate()).padStart(2, '0');
      const minDate = `${y}-${m}-${d}`;
      if (followUp.date < minDate) {
        setFollowUpError('Follow-up date must be a future date (tomorrow or later).');
        document.getElementById('doc-follow-up-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return false;
      }
    }
    setFollowUpError('');
    return true;
  }

  function selectIcd({ code, description }) {
    if (!code) return;
    clearDiagnosisError('icd');
    clearDiagnosisError('diagnoses');
    const label = description || code;
    if (!diagnoses.some((d) => d.code === code)) {
      setDiagnoses((d) => [...d, { code, label }]);
    }
    setIcdInput('');
  }

  function removeDiagnosis(code) {
    setDiagnoses((d) => d.filter((x) => x.code !== code));
    clearDiagnosisError('diagnoses');
    clearDiagnosisError('icd');
  }

  function buildDiagnosisForSave() {
    const tagPart = diagnoses.map((d) => `${d.code} — ${d.label}`).join('; ');
    const free = icdInput.trim();
    if (tagPart && free) return `${tagPart}; ${free}`;
    return tagPart || free || null;
  }

  async function ensureConsultation() {
    const diagnosis = buildDiagnosisForSave();
    const prescriptionItems = prescriptionLines.map((item) => buildPrescriptionItemPayload(item));
    const payload = {
      diagnosis: diagnosis || null,
      notes: clinicalNotes || null,
      actions_taken: {
        nurse_intake: intakeForm,
        doctor_vitals: vitalsForm,
        dental_exam: dentalExam,
        follow_up: followUp,
      },
      dental_exam: buildDentalExamPayload(dentalExam, followUp),
      vitals: buildDoctorVitalsPayload(vitalsForm),
      prescription_items: prescriptionItems,
    };
    if (consultationId) {
      await updateConsultation(consultationId, payload);
      return consultationId;
    }
    const created = await createConsultation({
      visit_id: patient.visitId,
      ...payload,
    });
    setConsultationId(created.id);
    return created.id;
  }

  function addMedToList() {
    commitMedLineToList({
      medLine,
      liveStock,
      setPrescriptionLines,
      setMedFieldErrors,
      setMedLine,
      setLiveStock,
    });
  }

  function removeMedLine(index) {
    setPrescriptionLines((lines) => lines.filter((_, i) => i !== index));
  }

  async function handleCompleteConsultation() {
    if (!validateChiefComplaint()) return;
    if (!validateFollowUp()) return;

    if (!(await confirmAction({
      title: 'Complete consultation?',
      text: `Complete consultation for ${patient.name} and remove them from your queue?`,
      icon: 'question',
      confirmButtonText: 'Complete consultation',
    }))) return;

    setActionLoading(true);
    onActionError('');
    setRoutingError('');
    try {
      await ensureConsultation();
      await completeQueueEntry(patient.entryId, {});
      setPrescriptionLines([]);
      setMedLine(emptyMedLine());
      setLiveStock(null);
      onToast(`Consultation completed for ${patient.name}.`);
      onDone();
    } catch (err) {
      const msg = err.message || 'Failed to complete consultation';
      setRoutingError(msg);
      onActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <ConsultationMedicalHistoryPanel
        patientId={patient?.patient?.id}
        visitId={patient?.visitId}
        showStatSummaryButton
      />

      <DoctorConsultationForm
        vitalsForm={vitalsForm}
        onVitalsChange={(next) => {
          setVitalsForm(next);
          if ((next.chief_complaint || '').trim()) setComplaintError('');
        }}
        dentalExam={dentalExam}
        onDentalExamChange={setDentalExam}
        complaintError={complaintError}
        allergy={patient.allergy}
        icdInput={icdInput}
        onIcdInputChange={(value) => {
          setIcdInput(value);
          if (value.trim()) {
            clearDiagnosisError('icd');
            clearDiagnosisError('diagnoses');
          }
        }}
        onSelectIcd={selectIcd}
        diagnoses={diagnoses}
        diagnosisErrors={diagnosisErrors}
        onRemoveDiagnosis={removeDiagnosis}
        clinicalNotes={clinicalNotes}
        onClinicalNotesChange={(value) => {
          setClinicalNotes(value);
          if (value.trim()) clearDiagnosisError('clinicalNotes');
        }}
        followUp={followUp}
        onFollowUpChange={(next) => {
          setFollowUp(next);
          if ((next.date || '').trim()) setFollowUpError('');
        }}
        followUpError={followUpError}
        catalog={medCatalog}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        medLine={medLine}
        medFieldErrors={medFieldErrors}
        onMedFieldChange={setMedField}
        onMedicationSelect={handleMedicationSelect}
        liveStock={liveStock}
        stockChecking={stockChecking}
        prescriptionLines={prescriptionLines}
        onAddMedToList={addMedToList}
        onRemoveMedLine={removeMedLine}
        actionLoading={actionLoading}
        onCompleteConsultation={handleCompleteConsultation}
        routingError={routingError}
      />
    </>
  );
}
