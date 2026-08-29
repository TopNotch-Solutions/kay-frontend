import { useEffect, useMemo, useState } from 'react';
import {
  createConsultation,
  updateConsultation,
  getConsultationsByVisit,
} from '../../../api/doctor';
import { completeQueueEntry } from '../../../api/queue';
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
import { isFollowUpDateInFuture } from '../../../utils/clinicDate';
import ConsultationMedicalHistoryPanel from '../../../components/patient/ConsultationMedicalHistoryPanel';

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
      dosage: item.dosage || '',
      frequency: item.frequency || '',
      quantity: item.quantity || 1,
      instructions: item.instructions || '',
      schedule_type: item.schedule_type || 'once_off',
      recurring_day_of_month: item.recurring_day_of_month ?? '',
      recurring_weekdays: item.recurring_weekdays || [],
      recurring_dates: item.recurring_dates || [],
    }));
  }

  const lines = [];
  prescriptions.forEach((rx) => {
    (rx.items || []).forEach((item) => {
      lines.push({
        medication_name: item.medication_name || '',
        dosage: item.dosage || '',
        frequency: item.frequency || '',
        quantity: item.quantity || 1,
        instructions: item.instructions || '',
        schedule_type: item.schedule_type || 'once_off',
        recurring_day_of_month: item.recurring_day_of_month ?? '',
        recurring_weekdays: item.recurring_weekdays || [],
        recurring_dates: item.recurring_dates || [],
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
  const [diagnosis, setDiagnosis] = useState('');
  const [vitalsForm, setVitalsForm] = useState(() => emptyDoctorVitalsForm());
  const [dentalExam, setDentalExam] = useState(() => emptyDentalExamForm());
  const [followUp, setFollowUp] = useState(() => emptyFollowUpForm());
  const [consultationId, setConsultationId] = useState(null);
  const [medLine, setMedLine] = useState(emptyMedLine);
  const [prescriptionLines, setPrescriptionLines] = useState([]);
  const [medFieldErrors, setMedFieldErrors] = useState({});
  const [complaintError, setComplaintError] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [routingError, setRoutingError] = useState('');

  const intakeForm = useMemo(
    () => vitalsToIntakeForm(patient?.vitals),
    [patient?.vitals, patient?.entryId]
  );

  useEffect(() => {
    setVitalsForm(vitalsToDoctorForm(patient?.vitals));
  }, [patient?.vitals, patient?.entryId]);

  useEffect(() => {
    setClinicalNotes('');
    setDiagnosis('');
    setConsultationId(null);
    setDentalExam(emptyDentalExamForm());
    setFollowUp(emptyFollowUpForm());
    setMedLine(emptyMedLine());
    setPrescriptionLines([]);
    setMedFieldErrors({});
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
        if (latest?.diagnosis?.trim()) setDiagnosis(latest.diagnosis.trim());
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
      if (!isFollowUpDateInFuture(followUp.date)) {
        setFollowUpError('Follow-up date must be a future date (tomorrow or later).');
        document.getElementById('doc-follow-up-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return false;
      }
    }
    setFollowUpError('');
    return true;
  }

  async function ensureConsultation() {
    const diagnosisValue = diagnosis.trim() || null;
    const prescriptionItems = prescriptionLines.map((item) => buildPrescriptionItemPayload(item));
    const payload = {
      diagnosis: diagnosisValue,
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
      setPrescriptionLines,
      setMedFieldErrors,
      setMedLine,
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
        diagnosis={diagnosis}
        onDiagnosisChange={setDiagnosis}
        clinicalNotes={clinicalNotes}
        onClinicalNotesChange={setClinicalNotes}
        followUp={followUp}
        onFollowUpChange={(next) => {
          setFollowUp(next);
          if ((next.date || '').trim()) setFollowUpError('');
        }}
        followUpError={followUpError}
        medLine={medLine}
        medFieldErrors={medFieldErrors}
        onMedFieldChange={setMedField}
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
