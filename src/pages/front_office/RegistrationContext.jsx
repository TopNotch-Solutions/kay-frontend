import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../../api/patients';
import { mapSexToApi, REGISTRATION_ALLOWED_KEY, REGISTRATION_STORAGE_KEY } from './patientUtils';
import { validateNationalId, validatePhone } from './utils/validation';
import { defaultMedicalHistory, formatMedicalHistoryNotes } from './medicalHistory';

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const defaultDraft = () => ({
  first_name: '',
  last_name: '',
  date_of_birth: '',
  sex: '',
  id_number: '',
  payment_type: 'state',
  physical_notes: '',
  telephone: '',
  cell_phone: '',
  phone: '',
  address: '',
  postal_address: '',
  email: '',
  city: '',
  region: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  is_emergency: false,
  routing_destination: 'doctor',
  consent_patient_full_name: '',
  consent_signer_name: '',
  consent_relationship: 'Self',
  consent_date: todayIsoDate(),
  consent_otp_sent: false,
  consent_otp_verified: false,
  consent_otp_phone: '',
  ...defaultMedicalHistory(),
});

const RegistrationContext = createContext(null);

export function RegistrationProvider({ children }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
      if (!raw) return defaultDraft();
      const parsed = JSON.parse(raw);
      return {
        ...defaultDraft(),
        ...parsed,
        consent_date: (parsed.consent_date || '').trim() || todayIsoDate(),
        conditions: {
          ...defaultDraft().conditions,
          ...(parsed.conditions || {}),
        },
      };
    } catch {
      return defaultDraft();
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const persist = useCallback((next) => {
    const merged = {
      ...defaultDraft(),
      ...next,
      conditions: {
        ...defaultDraft().conditions,
        ...(next.conditions || {}),
      },
    };
    setDraft(merged);
    sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(merged));
  }, []);

  const updateField = useCallback(
    (key, value) => {
      persist({ ...draft, [key]: value });
    },
    [draft, persist]
  );

  const patchDraft = useCallback(
    (patch) => {
      persist({ ...draft, ...patch });
    },
    [draft, persist]
  );

  const loadPrefill = useCallback(
    (prefill) => {
      const next = {
        ...defaultDraft(),
        ...prefill,
      };
      persist(next);
      sessionStorage.setItem(REGISTRATION_ALLOWED_KEY, '1');
    },
    [persist]
  );

  const clearDraft = useCallback(() => {
    const empty = defaultDraft();
    setDraft(empty);
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    sessionStorage.removeItem(REGISTRATION_ALLOWED_KEY);
  }, []);

  const buildPayload = useCallback(() => {
    const cellPhone = (draft.cell_phone || '').trim();
    const telephone = (draft.telephone || '').trim();
    const primaryPhone = cellPhone || telephone || (draft.phone || '').trim();
    const hasMedicalAid = Boolean((draft.medical_aid_name || '').trim());
    const consentSigner = (draft.consent_signer_name || '').trim();

    const medical_history = {
      treated_by_doctor: draft.treated_by_doctor,
      treated_by_doctor_for: (draft.treated_by_doctor_for || '').trim() || null,
      on_medication: draft.on_medication,
      medication_kind: (draft.medication_kind || '').trim() || null,
      hospitalized: draft.hospitalized,
      hospitalized_when: (draft.hospitalized_when || '').trim() || null,
      hospitalized_why: (draft.hospitalized_why || '').trim() || null,
      conditions: { ...(draft.conditions || {}) },
      other_disease: (draft.other_disease || '').trim() || null,
      allergy_specify: (draft.allergy_specify || '').trim() || null,
      pregnant: draft.pregnant,
      pregnant_months: (draft.pregnant_months || '').toString().trim() || null,
      notes: formatMedicalHistoryNotes(draft),
    };

    const consent = {
      patient_full_name: (draft.consent_patient_full_name || '').trim() || null,
      signer_name: consentSigner || null,
      relationship: (draft.consent_relationship || '').trim() || null,
      date: (draft.consent_date || '').trim() || null,
      otp_verified: Boolean(draft.consent_otp_verified),
      otp_phone: (draft.consent_otp_phone || primaryPhone || '').trim() || null,
      statement:
        'I hereby permit dental treatment for myself/dependant. I take full responsibility for payment for the care rendered. I give the dentist the discretion to the best treatment that can be offered.',
    };

    return {
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      sex: mapSexToApi(draft.sex),
      date_of_birth: draft.date_of_birth || null,
      id_number: draft.id_number.trim() || null,
      phone: primaryPhone || null,
      telephone: telephone || null,
      cell_phone: cellPhone || primaryPhone || null,
      address: draft.address.trim() || null,
      postal_address: draft.postal_address.trim() || null,
      email: draft.email.trim() || null,
      medical_aid_name: (draft.medical_aid_name || '').trim() || null,
      membership_number: (draft.membership_number || '').trim() || null,
      medical_history,
      consent,
      payment_type: hasMedicalAid || draft.payment_type === 'private' ? 'private' : 'state',
      emergency_contact_name: consentSigner || null,
      emergency_contact_phone: primaryPhone || null,
      category: 'known',
      is_emergency: false,
      routing_destination: 'doctor',
    };
  }, [draft]);

  const submitRegistration = useCallback(async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildPayload();
      if (!payload.first_name || !payload.last_name || !payload.sex) {
        throw new Error('First name, last name, and sex are required.');
      }
      if (!payload.routing_destination) {
        throw new Error('Select a routing destination before finishing registration.');
      }
      payload.routing_destination = 'doctor';
      if (!draft.consent_otp_verified) {
        throw new Error('Consent OTP must be verified before finishing registration.');
      }
      const idError = validateNationalId(payload.id_number || '', { required: false });
      if (idError) throw new Error(idError);
      const phoneError = validatePhone(payload.phone || '', { required: true, label: 'cell phone number' });
      if (phoneError) throw new Error(phoneError);
      if (!payload.emergency_contact_name) {
        throw new Error('Consent signer (patient name / guardian) is required.');
      }
      const data = await registerPatient(payload);
      clearDraft();
      navigate('/front_office', {
        replace: true,
        state: {
          notice: `Patient ${payload.first_name} ${payload.last_name} registered (${data.patient?.patient_number || ''}) and routed to queue.`,
        },
      });
      return data;
    } catch (err) {
      setSubmitError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }, [buildPayload, clearDraft, navigate, draft.consent_otp_verified]);

  const value = useMemo(
    () => ({
      draft,
      updateField,
      patchDraft,
      loadPrefill,
      clearDraft,
      submitRegistration,
      submitting,
      submitError,
    }),
    [draft, updateField, patchDraft, loadPrefill, clearDraft, submitRegistration, submitting, submitError]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
