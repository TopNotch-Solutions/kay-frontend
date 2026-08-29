/** Kay One Dental — doctor vitals + extra/intra-oral exam form helpers. */

import { emptyDentalCharting, hasDentalCharting, normalizeDentalCharting } from './dentalChartConfig';

export function emptyDoctorVitalsForm() {
  return {
    chief_complaint: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    pulse_rate: '',
    respiratory_rate: '',
    temperature: '',
    blood_glucose: '',
  };
}

export function emptyDentalExamForm() {
  return {
    extra_oral: {
      head_and_face: '',
      tmj: '',
      lymph_nodes: '',
      lips_and_perioral: '',
    },
    intra_oral: {
      soft_tissues_mucosa: '',
      gingiva_periodontium: '',
      occlusion_mobility: '',
      dentition: '',
    },
    investigations: {
      xray_performed: false,
      xray_results: '',
      blood_test_performed: false,
      blood_test_results: '',
    },
    dental_charting: emptyDentalCharting(),
  };
}

function str(value) {
  return value == null ? '' : String(value);
}

export function vitalsToDoctorForm(vitals) {
  if (!vitals) return emptyDoctorVitalsForm();
  return {
    chief_complaint: str(vitals.chief_complaint),
    blood_pressure_systolic: str(vitals.blood_pressure_systolic),
    blood_pressure_diastolic: str(vitals.blood_pressure_diastolic),
    pulse_rate: str(vitals.pulse_rate),
    respiratory_rate: str(vitals.respiratory_rate),
    temperature: str(vitals.temperature),
    blood_glucose: str(vitals.blood_glucose),
  };
}

export function dentalExamToForm(raw) {
  const empty = emptyDentalExamForm();
  if (!raw || typeof raw !== 'object') return empty;
  const investigations = raw.investigations || {};
  return {
    extra_oral: {
      ...empty.extra_oral,
      ...(raw.extra_oral || {}),
      head_and_face: str(raw.extra_oral?.head_and_face),
      tmj: str(raw.extra_oral?.tmj),
      lymph_nodes: str(raw.extra_oral?.lymph_nodes),
      lips_and_perioral: str(raw.extra_oral?.lips_and_perioral),
    },
    intra_oral: {
      ...empty.intra_oral,
      ...(raw.intra_oral || {}),
      soft_tissues_mucosa: str(raw.intra_oral?.soft_tissues_mucosa),
      gingiva_periodontium: str(raw.intra_oral?.gingiva_periodontium),
      occlusion_mobility: str(raw.intra_oral?.occlusion_mobility),
      dentition: str(raw.intra_oral?.dentition),
    },
    investigations: {
      xray_performed: Boolean(investigations.xray_performed),
      xray_results: str(investigations.xray_results),
      blood_test_performed: Boolean(investigations.blood_test_performed),
      blood_test_results: str(investigations.blood_test_results),
    },
    dental_charting: normalizeDentalCharting(raw.dental_charting),
  };
}

function numOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildDoctorVitalsPayload(form) {
  const chief = String(form.chief_complaint || '').trim();
  return {
    chief_complaint: chief || null,
    blood_pressure_systolic: numOrNull(form.blood_pressure_systolic),
    blood_pressure_diastolic: numOrNull(form.blood_pressure_diastolic),
    pulse_rate: numOrNull(form.pulse_rate),
    respiratory_rate: numOrNull(form.respiratory_rate),
    temperature: numOrNull(form.temperature),
    blood_glucose: numOrNull(form.blood_glucose),
  };
}

export function emptyFollowUpForm() {
  return {
    date: '',
    time: '',
    notes: '',
  };
}

export function followUpToForm(raw) {
  if (!raw || typeof raw !== 'object') return emptyFollowUpForm();
  return {
    date: str(raw.date || raw.follow_up_date),
    time: str(raw.time || raw.follow_up_time),
    notes: str(raw.notes || raw.follow_up_notes),
  };
}

export function buildFollowUpPayload(form) {
  const date = String(form?.date || '').trim() || null;
  const time = String(form?.time || '').trim() || null;
  const notes = String(form?.notes || '').trim() || null;
  if (!date && !time && !notes) return null;
  return { date, time, notes };
}

export function buildDentalExamPayload(form, followUpForm) {
  const trim = (v) => {
    const s = String(v || '').trim();
    return s || null;
  };
  const limit = (v, max = 700) => {
    const s = trim(v);
    return s ? s.slice(0, max) : null;
  };
  const investigations = form.investigations || {};
  const xrayPerformed = Boolean(investigations.xray_performed);
  const bloodTestPerformed = Boolean(investigations.blood_test_performed);
  const follow_up = buildFollowUpPayload(followUpForm ?? form.follow_up);
  return {
    extra_oral: {
      head_and_face: trim(form.extra_oral?.head_and_face),
      tmj: trim(form.extra_oral?.tmj),
      lymph_nodes: trim(form.extra_oral?.lymph_nodes),
      lips_and_perioral: trim(form.extra_oral?.lips_and_perioral),
    },
    intra_oral: {
      soft_tissues_mucosa: trim(form.intra_oral?.soft_tissues_mucosa),
      gingiva_periodontium: trim(form.intra_oral?.gingiva_periodontium),
      occlusion_mobility: trim(form.intra_oral?.occlusion_mobility),
      dentition: trim(form.intra_oral?.dentition),
    },
    investigations: {
      xray_performed: xrayPerformed,
      xray_results: xrayPerformed ? limit(investigations.xray_results) : null,
      blood_test_performed: bloodTestPerformed,
      blood_test_results: bloodTestPerformed ? limit(investigations.blood_test_results) : null,
    },
    ...(hasDentalCharting(form.dental_charting)
      ? { dental_charting: normalizeDentalCharting(form.dental_charting) }
      : {}),
    ...(follow_up ? { follow_up } : {}),
  };
}

export const EXTRA_ORAL_FIELDS = [
  {
    key: 'head_and_face',
    label: 'Head & Face',
    hint: 'Symmetry, skin lesions, swelling',
  },
  {
    key: 'tmj',
    label: 'Temporomandibular Joint (TMJ)',
    hint: 'Movement, clicking, tenderness',
  },
  {
    key: 'lymph_nodes',
    label: 'Lymph Nodes',
    hint: 'Submandibular, cervical, pre/post-auricular palpation',
  },
  {
    key: 'lips_and_perioral',
    label: 'Lips and Perioral Tissues',
    hint: 'Ulcerations, abnormalities',
  },
];

export const INTRA_ORAL_FIELDS = [
  {
    key: 'soft_tissues_mucosa',
    label: 'Soft Tissues & Mucosa',
    hint: 'Palate, tongue, floor of the mouth, cheeks',
  },
  {
    key: 'gingiva_periodontium',
    label: 'Gingiva & Periodontium',
    hint: 'Color, contour, bleeding, recession',
  },
  {
    key: 'occlusion_mobility',
    label: 'Occlusion & Mobility',
    hint: 'Bite alignment, tooth stability',
  },
  {
    key: 'dentition',
    label: 'Dentition',
    hint: 'Carious lesions, existing restorations, fractures',
  },
];
