import { formatDateTime, formatLabel, formatVitalsLine, patientAge } from '../../pages/front_office/utils/ehrUtils';
import { formatDob, patientName } from '../../pages/front_office/patientUtils';
import { MEDICAL_CONDITIONS } from '../../pages/front_office/medicalHistory';
import {
  displayValue,
  formatClinicalObjectLines,
  formatScalarValue,
  parseJsonValue,
  pushDetail,
} from './clinicalDetailFormatters';
import { formatPrescriptionScheduleLabel } from '../../utils/prescriptionSchedule';
import {
  formatDentalChartingSummary,
  hasDentalCharting,
} from '../../pages/doctor/dentalChartConfig';

function asObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function yn(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function formatRegistrationMedicalHistory(history) {
  if (!history || typeof history !== 'object') return [];
  const lines = [];
  pushDetail(
    lines,
    'Treated by a doctor',
    history.treated_by_doctor === true
      ? `Yes${history.treated_by_doctor_for ? ` — ${history.treated_by_doctor_for}` : ''}`
      : yn(history.treated_by_doctor)
  );
  pushDetail(
    lines,
    'On medication',
    history.on_medication === true
      ? `Yes${history.medication_kind ? ` — ${history.medication_kind}` : ''}`
      : yn(history.on_medication)
  );
  if (history.hospitalized === true) {
    const whenWhy = [history.hospitalized_when, history.hospitalized_why].filter(Boolean).join('; ');
    pushDetail(lines, 'Hospitalized', whenWhy ? `Yes — ${whenWhy}` : 'Yes');
  } else {
    pushDetail(lines, 'Hospitalized', yn(history.hospitalized));
  }

  const activeConditions = MEDICAL_CONDITIONS.filter((c) => history.conditions?.[c.key] === true)
    .map((c) => c.label);
  pushDetail(lines, 'Conditions', activeConditions.length ? activeConditions.join(', ') : 'None reported');
  pushDetail(lines, 'Other disease', history.other_disease);
  pushDetail(lines, 'Allergy details', history.allergy_specify);
  if (history.pregnant === true || history.pregnant === false) {
    pushDetail(
      lines,
      'Pregnant',
      history.pregnant === true
        ? `Yes${history.pregnant_months ? ` — ${history.pregnant_months} months` : ''}`
        : 'No'
    );
  }
  return lines;
}

const DEPARTMENT_LABELS = {
  doctor: 'Doctor',
};

/** Kay One medical book: doctor consultations only. */
const BOOK_DEPARTMENTS = new Set(['doctor']);

const DISPOSITION_LABELS = {
  complete: 'Consultation completed',
  follow_up: 'Follow-up scheduled',
  discharge: 'Discharged',
};

const ACTIONS_TAKEN_SKIP_KEYS = new Set([
  'source',
  // Shown via dedicated formatters — avoid duplicate dumps
  'doctor_vitals',
  'dental_exam',
  'follow_up',
]);

function formatActionsTakenLines(raw) {
  const parsed = parseJsonValue(raw);
  if (parsed == null) return [];
  if (typeof parsed === 'string') {
    return [{ label: 'Actions taken', value: parsed }];
  }
  if (Array.isArray(parsed)) {
    return [{ label: 'Actions taken', value: parsed.map((item) => formatScalarValue(item) || String(item)).join('; ') }];
  }

  const lines = [];
  if (parsed.doctor_vitals) {
    lines.push(...vitalsDetailLines(parsed.doctor_vitals));
  }
  const disposition = parsed.clinic_disposition || parsed.disposition;
  if (disposition) {
    let outcome = DISPOSITION_LABELS[disposition] || formatLabel(disposition);
    if (parsed.documentation_type === 'patient_refused_care') {
      outcome = 'Patient declined care';
    }
    pushDetail(lines, 'Outcome', outcome);
  }

  pushDetail(lines, 'Discharge reason', parsed.discharge_reason);
  if (parsed.follow_up_date) {
    pushDetail(lines, 'Follow-up date', formatDateTime(parsed.follow_up_date));
  }
  if (parsed.prescribed != null) {
    pushDetail(lines, 'Prescription issued', formatScalarValue(parsed.prescribed));
  }
  if (parsed.visit_classification) {
    pushDetail(lines, 'Visit classification', formatLabel(parsed.visit_classification));
  }

  const handled = new Set([
    'clinic_disposition',
    'disposition',
    'documentation_type',
    'discharge_reason',
    'follow_up_date',
    'prescribed',
    'visit_classification',
    'routed_to',
    'nurse_intake',
    'hospital_outpatient_disposition',
    ...ACTIONS_TAKEN_SKIP_KEYS,
  ]);

  Object.entries(parsed).forEach(([key, value]) => {
    if (handled.has(key) || ACTIONS_TAKEN_SKIP_KEYS.has(key)) return;
    if (value === true) return;
    if (value == null || value === '') return;
    if (typeof value === 'object') {
      formatClinicalObjectLines({ [key]: value }).forEach((line) => {
        pushDetail(lines, line.label, line.value);
      });
      return;
    }
    pushDetail(lines, formatLabel(key), formatScalarValue(value));
  });

  return lines;
}

function vitalsDetailLines(vitals) {
  if (!vitals) return [];
  const lines = [];
  const summary = formatVitalsLine(vitals);
  if (summary) lines.push({ label: 'Vitals', value: summary });
  if (vitals.height != null) pushDetail(lines, 'Height', `${vitals.height} cm`);
  [
    ['visit_classification', 'Visit classification'],
    ['chief_complaint', 'Chief complaint'],
    ['onset_at', 'Onset'],
    ['aggravating_factors', 'Aggravating factors'],
    ['alleviating_factors', 'Alleviating factors'],
    ['allergies', 'Allergies'],
    ['current_medications', 'Current medications'],
    ['immunization_status', 'Immunization status'],
    ['social_history', 'Social history'],
    ['physical_examination', 'Physical examination'],
    ['notes', 'Notes'],
  ].forEach(([key, label]) => {
    let value = vitals[key];
    if (value == null || value === '') return;
    if (key === 'visit_classification') value = formatLabel(value);
    if (key === 'onset_at') value = formatDateTime(value);
    pushDetail(lines, label, value);
  });
  return lines;
}

function consultationDetailLines(rows) {
  const lines = [];
  (rows || []).forEach((row) => {
    pushDetail(lines, 'Diagnosis', row.diagnosis);
    pushDetail(lines, 'Notes', row.notes);
    if (row.dental_exam) {
      lines.push(...dentalExamDetailLines(row.dental_exam));
    }
    if (row.actions_taken) {
      lines.push(...formatActionsTakenLines(row.actions_taken));
    }
    if (row.created_at) pushDetail(lines, 'Recorded', formatDateTime(row.created_at));
  });
  return lines;
}

function dentalExamDetailLines(raw) {
  const exam = asObject(raw);
  if (!exam) return [];
  const lines = [];
  const extra = exam.extra_oral || {};
  const intra = exam.intra_oral || {};
  const inv = exam.investigations || {};

  const EXTRA_LABELS = {
    head_and_face: 'Extra-oral · Head & face',
    tmj: 'Extra-oral · TMJ',
    lymph_nodes: 'Extra-oral · Lymph nodes',
    lips_and_perioral: 'Extra-oral · Lips & perioral',
  };
  const INTRA_LABELS = {
    soft_tissues_mucosa: 'Intra-oral · Soft tissues & mucosa',
    gingiva_periodontium: 'Intra-oral · Gingiva & periodontium',
    occlusion_mobility: 'Intra-oral · Occlusion & mobility',
    dentition: 'Intra-oral · Dentition',
  };

  Object.entries(EXTRA_LABELS).forEach(([key, label]) => {
    pushDetail(lines, label, extra[key]);
  });
  Object.entries(INTRA_LABELS).forEach(([key, label]) => {
    pushDetail(lines, label, intra[key]);
  });

  if (hasDentalCharting(exam.dental_charting)) {
    lines.push(...formatDentalChartingSummary(exam.dental_charting));
  }

  if (inv.xray_performed) {
    pushDetail(lines, 'Investigation · X-ray', inv.xray_results || 'Performed');
  }
  if (inv.blood_test_performed) {
    pushDetail(lines, 'Investigation · Blood test', inv.blood_test_results || 'Performed');
  }

  const followUp = exam.follow_up || {};
  if (followUp.date || followUp.time || followUp.notes) {
    const when = [followUp.date, followUp.time].filter(Boolean).join(' ');
    if (when) pushDetail(lines, 'Follow-up', when);
    pushDetail(lines, 'Follow-up notes', followUp.notes);
  }
  return lines;
}

function prescriptionDetailLines(prescriptions) {
  const lines = [];
  (prescriptions || []).forEach((rx) => {
    (rx.items || []).forEach((item) => {
      const parts = [
        item.dosage,
        item.frequency,
        item.quantity != null ? `Qty ${item.quantity}` : null,
        item.instructions,
        formatPrescriptionScheduleLabel(item),
      ].filter(Boolean);
      lines.push({
        label: item.medication_name || 'Medication',
        value: parts.length ? parts.join(' · ') : displayValue(rx.status),
      });
    });
    if (!rx.items?.length && rx.status) {
      lines.push({ label: 'Prescription', value: formatLabel(rx.status) });
    }
  });
  return lines;
}

export function isBookDepartment(department) {
  return BOOK_DEPARTMENTS.has(department);
}

/** Doctor clinical only: vitals, consultation (incl. dental), prescriptions. */
export function formatStopClinicalDetails(stop) {
  const clinical = stop?.clinical;
  const lines = [];
  if (!clinical) return lines;

  if (clinical.vitals) lines.push(...vitalsDetailLines(clinical.vitals));
  if (clinical.consultations?.length) lines.push(...consultationDetailLines(clinical.consultations));
  if (clinical.prescriptions?.length) lines.push(...prescriptionDetailLines(clinical.prescriptions));

  return lines;
}

function findDentalChartInClinical(clinical) {
  for (const row of clinical?.consultations || []) {
    const exam = asObject(row.dental_exam);
    if (exam?.dental_charting && hasDentalCharting(exam.dental_charting)) {
      return exam.dental_charting;
    }
  }
  return null;
}

export function buildConsultationSteps(visit) {
  return (visit.stops || [])
    .filter((stop) => isBookDepartment(stop.department))
    .map((stop, index) => {
      const clinical = { ...(stop.clinical || {}) };
      // Prefer visit vitals when doctor stop has none (Kay One doctor intake).
      if (!clinical.vitals && visit.vitals) {
        clinical.vitals = visit.vitals;
      }
      return {
        id: `${stop.department}-${index}`,
        label: stop.department_label || DEPARTMENT_LABELS[stop.department] || formatLabel(stop.department),
        department: stop.department,
        timestamp: stop.arrived_at || stop.started_at,
        startedAt: stop.started_at,
        completedAt: stop.completed_at,
        dentalChart: findDentalChartInClinical(clinical),
        details: formatStopClinicalDetails({ ...stop, clinical }),
      };
    });
}

function visitsWithVitals(visits) {
  return (visits || []).filter((v) => v.vitals && vitalsDetailLines(v.vitals).length > 0);
}

function latestVitalsFromHistory(visits) {
  for (const visit of visitsWithVitals(visits)) return visit.vitals;
  return null;
}

function collectAllergies(visits) {
  const seen = new Set();
  const items = [];
  visitsWithVitals(visits).forEach((visit) => {
    const text = visit.vitals?.allergies?.trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      items.push(text);
    }
  });
  return items;
}

function collectMedications(visits) {
  const meds = [];
  const seen = new Set();
  visitsWithVitals(visits).forEach((visit) => {
    const text = visit.vitals?.current_medications?.trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      meds.push(text);
    }
  });
  return meds;
}

function extractChronicHistory(visits) {
  const notes = [];
  visitsWithVitals(visits).forEach((visit) => {
    const vitals = visit.vitals;
    ['social_history', 'physical_examination'].forEach((key) => {
      const text = vitals[key]?.trim();
      if (text) {
        notes.push({
          date: visit.created_at,
          visit: visit.visit_number,
          text,
          source: formatLabel(key),
        });
      }
    });
  });
  return notes.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildConsultation(visit) {
  const steps = buildConsultationSteps(visit);
  const lastStep = [...steps].reverse().find((s) => s.completedAt || s.timestamp);

  return {
    id: visit.id,
    visitNumber: visit.visit_number,
    visitType: formatLabel(visit.visit_type),
    startedAt: visit.created_at,
    startedAtLabel: formatDateTime(visit.created_at),
    completedAt: visit.completed_at,
    completedAtLabel: visit.completed_at ? formatDateTime(visit.completed_at) : null,
    lastActivityAt: lastStep?.completedAt || lastStep?.timestamp || visit.created_at,
    lastActivityLabel: formatDateTime(lastStep?.completedAt || lastStep?.timestamp || visit.created_at),
    stepCount: steps.length,
    steps,
  };
}

function buildBookPagesList(identity, consultations) {
  const pages = [{ kind: 'identity', identity }];
  consultations.forEach((consultation, index) => {
    pages.push({
      kind: 'consultation',
      consultation,
      consultationIndex: index,
    });
  });
  return pages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
}

export function buildBookSpreads(pages) {
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i] || null,
      right: pages[i + 1] || null,
      spreadNumber: spreads.length + 1,
    });
  }
  return spreads;
}

function buildIdentity(patient, visits, allergies, medications, latestVitals) {
  const vitalsCount = visitsWithVitals(visits).length;
  const medicalHistory = asObject(patient?.medical_history) || {};
  const consent = asObject(patient?.consent) || {};
  const cellPhone = patient?.cell_phone || patient?.phone || null;
  const telephone = patient?.telephone || null;

  return {
    fullName: patientName(patient),
    firstName: displayValue(patient?.first_name),
    lastName: displayValue(patient?.last_name),
    patientId: patient?.patient_number || '—',
    nationalId: patient?.id_number || '—',
    tempId: patient?.temp_id?.trim() || null,
    dateOfBirth: formatDob(patient?.date_of_birth),
    age: patientAge(patient?.date_of_birth),
    gender: formatLabel(patient?.sex),
    telephone: displayValue(telephone),
    cellPhone: displayValue(cellPhone),
    phone: displayValue(cellPhone || telephone),
    address: displayValue(patient?.address),
    postalAddress: displayValue(patient?.postal_address),
    email: displayValue(patient?.email),
    medicalAidName: displayValue(patient?.medical_aid_name),
    membershipNumber: displayValue(patient?.membership_number),
    medicalHistoryLines: formatRegistrationMedicalHistory(medicalHistory),
    consent: {
      patientFullName: displayValue(consent.patient_full_name || patientName(patient)),
      signerName: displayValue(consent.signer_name || patient?.emergency_contact_name),
      relationship: displayValue(consent.relationship),
      date: consent.date ? formatDob(consent.date) : '—',
      otpVerified: Boolean(consent.otp_verified),
      otpPhone: displayValue(consent.otp_phone || cellPhone),
    },
    isEmergency: Boolean(patient?.is_emergency),
    registeredAt: patient?.created_at ? formatDateTime(patient.created_at) : '—',
    updatedAt: patient?.updated_at ? formatDateTime(patient.updated_at) : '—',
    emergencyContact: {
      name: consent.signer_name || patient?.emergency_contact_name || '—',
      phone: consent.otp_phone || patient?.emergency_contact_phone || cellPhone || '—',
    },
    criticalAlerts: [],
    visitCount: visits.length,
    vitalsCount,
    latestVitalsLine: formatVitalsLine(latestVitals),
    allergies,
    medications,
  };
}

export function buildIdentityFields(identity) {
  const fields = [
    { label: 'First name', value: identity.firstName },
    { label: 'Last name', value: identity.lastName },
    { label: 'Patient number', value: identity.patientId, mono: true },
    { label: 'National ID', value: identity.nationalId, mono: true },
    { label: 'Date of birth', value: identity.dateOfBirth },
    { label: 'Age', value: identity.age != null ? `${identity.age} years` : '—' },
    { label: 'Sex', value: identity.gender },
    { label: 'Telephone', value: identity.telephone },
    { label: 'Cell phone', value: identity.cellPhone },
    { label: 'Email', value: identity.email },
    { label: 'Address', value: identity.address, fullWidth: true },
    { label: 'Postal address', value: identity.postalAddress, fullWidth: true },
    { label: 'Medical aid', value: identity.medicalAidName },
    { label: 'Membership number', value: identity.membershipNumber, mono: true },
    { label: 'Registered', value: identity.registeredAt },
    { label: 'Visits on file', value: String(identity.visitCount ?? 0) },
  ];

  if (identity.tempId) {
    fields.splice(4, 0, { label: 'Temporary ID', value: identity.tempId, mono: true });
  }

  return fields;
}

export function buildStatSummary(patient, history) {
  const visits = history?.visits || [];
  const allergies = collectAllergies(visits);
  const medications = collectMedications(visits);
  const lastVitals = latestVitalsFromHistory(visits);

  return {
    allergies: allergies.length ? allergies : ['None recorded'],
    medications: medications.length ? medications : ['None recorded'],
    diagnoses: [],
    lastVitals: formatVitalsLine(lastVitals) || 'No vitals on file',
    patientName: patientName(patient),
    patientId: patient?.patient_number || patient?.id_number || '—',
    vitalsCount: visitsWithVitals(visits).length,
  };
}

export function buildBookModel(patient, history) {
  const visits = history?.visits || [];
  const allergies = collectAllergies(visits);
  const registrationHistory = asObject(patient?.medical_history) || {};
  if (registrationHistory.allergy_specify) {
    const allergyText = String(registrationHistory.allergy_specify).trim();
    if (allergyText && !/^none$/i.test(allergyText) && !allergies.includes(allergyText)) {
      allergies.unshift(allergyText);
    }
  }
  const medications = collectMedications(visits);
  const chronic = extractChronicHistory(visits);
  const latestVitals = latestVitalsFromHistory(visits);
  const consultations = visits
    .map(buildConsultation)
    .filter((c) => c.stepCount > 0);
  const identity = buildIdentity(patient, visits, allergies, medications, latestVitals);

  const criticalAlerts = [];
  if (allergies.length) criticalAlerts.push({ type: 'Allergy', text: allergies.join('; ') });
  if (registrationHistory.conditions) {
    const active = MEDICAL_CONDITIONS.filter((c) => registrationHistory.conditions?.[c.key] === true)
      .map((c) => c.label);
    if (active.length) {
      criticalAlerts.push({ type: 'Medical conditions', text: active.join('; ') });
    }
  }
  if (chronic.length) {
    criticalAlerts.push({ type: 'Clinical history', text: chronic[0].text.slice(0, 200) });
  }
  if (patient?.is_emergency) {
    criticalAlerts.push({ type: 'Flag', text: 'Patient flagged as emergency on registration' });
  }

  identity.criticalAlerts = criticalAlerts;

  const pages = buildBookPagesList(identity, consultations);
  const spreads = buildBookSpreads(pages);

  return {
    identity,
    consultations,
    pages,
    spreads,
    totalPages: pages.length,
    statSummary: buildStatSummary(patient, history),
    meta: {
      totalVisits: visits.length,
      vitalsCaptures: visitsWithVitals(visits).length,
      latestVitals: formatVitalsLine(latestVitals),
      allergies,
      medications,
    },
  };
}

/** @deprecated Use buildBookModel — kept for any legacy imports */
export function buildBookPages(patient, history) {
  const model = buildBookModel(patient, history);
  return {
    pages: [{ kind: 'spread', ...model }],
    chapterPageIndex: {},
    statSummary: model.statSummary,
    meta: model.meta,
  };
}

export function displayValueSafe(value) {
  return displayValue(value);
}

export function formatStepTime(step) {
  if (step.completedAt) return formatDateTime(step.completedAt);
  if (step.startedAt) return formatDateTime(step.startedAt);
  if (step.timestamp) return formatDateTime(step.timestamp);
  return '—';
}
