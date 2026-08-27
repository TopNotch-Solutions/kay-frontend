/** Medical history questionnaire for front-office registration step 2. */

export const MEDICAL_CONDITIONS = [
  { key: 'heart_disease', label: 'Heart disease' },
  { key: 'rheumatic_fever', label: 'Rheumatic fever' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'bleeding_disorder', label: 'Bleeding disorder' },
  { key: 'blood_pressure', label: 'High or low blood pressure' },
  { key: 'kidney_disease', label: 'Kidney disease or infection' },
  { key: 'tb', label: 'TB' },
  { key: 'venereal_disease', label: 'Venereal disease' },
  { key: 'epilepsy', label: 'Epilepsy / convulsions' },
  { key: 'allergies', label: 'Allergies of any kind' },
  { key: 'liver_disease', label: 'Liver disease / hepatitis / jaundice' },
];

export function emptyMedicalConditions() {
  return MEDICAL_CONDITIONS.reduce((acc, row) => {
    acc[row.key] = null;
    return acc;
  }, {});
}

export function defaultMedicalHistory() {
  return {
    medical_aid_name: '',
    membership_number: '',
    treated_by_doctor: null,
    treated_by_doctor_for: '',
    on_medication: null,
    medication_kind: '',
    hospitalized: null,
    hospitalized_when: '',
    hospitalized_why: '',
    conditions: emptyMedicalConditions(),
    other_disease: '',
    allergy_specify: '',
    pregnant: null,
    pregnant_months: '',
  };
}

function isAnsweredBool(value) {
  return value === true || value === false;
}

/**
 * Returns an error message if any medical question is unanswered; otherwise null.
 */
export function validateMedicalHistory(draft) {
  if (!isAnsweredBool(draft.treated_by_doctor)) {
    return 'Please answer question 1: Are you being treated by a doctor?';
  }
  if (draft.treated_by_doctor && !(draft.treated_by_doctor_for || '').trim()) {
    return 'Question 1: please specify what you are being treated for.';
  }

  if (!isAnsweredBool(draft.on_medication)) {
    return 'Please answer question 2: Are you on any medication?';
  }
  if (draft.on_medication && !(draft.medication_kind || '').trim()) {
    return 'Question 2: please specify what kind of medication.';
  }

  if (!isAnsweredBool(draft.hospitalized)) {
    return 'Please answer question 3: Have you ever been hospitalized?';
  }
  if (draft.hospitalized) {
    if (!(draft.hospitalized_when || '').trim()) {
      return 'Question 3a: please specify when you were hospitalized.';
    }
    if (!(draft.hospitalized_why || '').trim()) {
      return 'Question 3b: please specify why you were hospitalized.';
    }
  }

  for (const row of MEDICAL_CONDITIONS) {
    if (!isAnsweredBool(draft.conditions?.[row.key])) {
      return `Question 4: please answer Yes or No for "${row.label}".`;
    }
  }

  if (!(draft.other_disease || '').trim()) {
    return 'Question 5: please answer any other disease (enter "None" if not applicable).';
  }

  if (!(draft.allergy_specify || '').trim()) {
    return 'Question 6: please specify allergies (enter "None" if not applicable).';
  }

  const sex = String(draft.sex || '').toLowerCase();
  if (sex === 'f' || sex === 'female') {
    if (!isAnsweredBool(draft.pregnant)) {
      return 'Question 7: please answer whether you are pregnant.';
    }
    if (draft.pregnant && !(draft.pregnant_months || '').toString().trim()) {
      return 'Question 7: please enter how many months pregnant.';
    }
  }

  return null;
}

/** Map of field keys → true when invalid (for red borders). */
export function getMedicalHistoryInvalidMap(draft) {
  const sex = String(draft.sex || '').toLowerCase();
  const isFemale = sex === 'f' || sex === 'female';
  const invalid = {
    treated_by_doctor: !isAnsweredBool(draft.treated_by_doctor),
    treated_by_doctor_for:
      draft.treated_by_doctor === true && !(draft.treated_by_doctor_for || '').trim(),
    on_medication: !isAnsweredBool(draft.on_medication),
    medication_kind: draft.on_medication === true && !(draft.medication_kind || '').trim(),
    hospitalized: !isAnsweredBool(draft.hospitalized),
    hospitalized_when: draft.hospitalized === true && !(draft.hospitalized_when || '').trim(),
    hospitalized_why: draft.hospitalized === true && !(draft.hospitalized_why || '').trim(),
    other_disease: !(draft.other_disease || '').trim(),
    allergy_specify: !(draft.allergy_specify || '').trim(),
    pregnant: isFemale && !isAnsweredBool(draft.pregnant),
    pregnant_months:
      isFemale && draft.pregnant === true && !(draft.pregnant_months || '').toString().trim(),
    conditions: {},
  };

  let anyConditionMissing = false;
  for (const row of MEDICAL_CONDITIONS) {
    const missing = !isAnsweredBool(draft.conditions?.[row.key]);
    invalid.conditions[row.key] = missing;
    if (missing) anyConditionMissing = true;
  }
  invalid.conditionsTable = anyConditionMissing;
  return invalid;
}

/** Format medical questionnaire into a readable note stored with the patient record. */
export function formatMedicalHistoryNotes(draft) {
  const lines = ['--- Medical history ---'];

  const aid = (draft.medical_aid_name || '').trim();
  const member = (draft.membership_number || '').trim();
  if (aid || member) {
    lines.push(`Medical aid: ${aid || '—'}${member ? ` · Membership #: ${member}` : ''}`);
  }

  const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : 'Unanswered');

  lines.push(
    `1. Treated by a doctor: ${yn(draft.treated_by_doctor)}${
      draft.treated_by_doctor && draft.treated_by_doctor_for
        ? ` — What for: ${draft.treated_by_doctor_for.trim()}`
        : ''
    }`
  );
  lines.push(
    `2. On medication: ${yn(draft.on_medication)}${
      draft.on_medication && draft.medication_kind
        ? ` — Kind: ${draft.medication_kind.trim()}`
        : ''
    }`
  );
  if (draft.hospitalized === true) {
    lines.push(
      `3. Hospitalized: Yes — When: ${(draft.hospitalized_when || '').trim() || '—'}; Why: ${(draft.hospitalized_why || '').trim() || '—'}`
    );
  } else {
    lines.push(`3. Hospitalized: ${yn(draft.hospitalized)}`);
  }

  const answeredConditions = MEDICAL_CONDITIONS.map((c) => {
    const v = draft.conditions?.[c.key];
    return `${c.label}: ${yn(v)}`;
  });
  lines.push(`4. Conditions: ${answeredConditions.join('; ')}`);

  lines.push(`5. Any other disease: ${(draft.other_disease || '').trim() || '—'}`);
  lines.push(`6. Allergy specify: ${(draft.allergy_specify || '').trim() || '—'}`);

  const sex = String(draft.sex || '').toLowerCase();
  if (sex === 'f' || sex === 'female') {
    if (draft.pregnant === true) {
      lines.push(
        `7. Pregnant: Yes — Months: ${(draft.pregnant_months || '').toString().trim() || '—'}`
      );
    } else {
      lines.push(`7. Pregnant: ${yn(draft.pregnant)}`);
    }
  }

  return lines.join('\n');
}
