import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendConsentOtp, verifyConsentOtp } from '../../api/frontOffice';
import RegistrationGuard from './RegistrationGuard';
import { useRegistration } from './RegistrationContext';
import RegistrationStepper from './RegistrationStepper';
import { useToast } from './context/ToastContext';
import { isBlank, withError } from './utils/fieldErrors';
import { validatePhone } from './utils/validation';
import { fo } from './styles/frontOfficeModuleClasses';

const RELATIONSHIP_OPTIONS = [
  { value: 'Self', label: 'Self (mine)' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Other', label: 'Other' },
];

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function patientFullName(draft) {
  return [draft.first_name, draft.last_name].filter(Boolean).join(' ').trim();
}

function Step3Form() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, updateField, patchDraft } = useRegistration();
  const [showErrors, setShowErrors] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fullName = useMemo(() => patientFullName(draft), [draft.first_name, draft.last_name]);
  const cellPhone = (draft.cell_phone || draft.telephone || '').trim();
  const isSelf = draft.consent_relationship === 'Self';

  useEffect(() => {
    const registrationDate = todayIsoDate();
    const patch = {};
    if (draft.consent_date !== registrationDate) patch.consent_date = registrationDate;
    if (!draft.consent_relationship) patch.consent_relationship = 'Self';
    if (!draft.consent_patient_full_name && fullName) {
      patch.consent_patient_full_name = fullName;
    }
    if (
      (!draft.consent_signer_name || draft.consent_relationship === 'Self') &&
      fullName &&
      (draft.consent_relationship === 'Self' || !draft.consent_relationship)
    ) {
      patch.consent_signer_name = fullName;
    }
    if (Object.keys(patch).length) patchDraft(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fullName) return;
    if (!draft.consent_patient_full_name) {
      updateField('consent_patient_full_name', fullName);
    }
  }, [fullName, draft.consent_patient_full_name, updateField]);

  function handleRelationshipChange(value) {
    if (value === 'Self') {
      patchDraft({
        consent_relationship: value,
        consent_signer_name: draft.consent_patient_full_name || fullName,
        consent_otp_verified: false,
      });
      setOtpCode('');
      return;
    }
    patchDraft({
      consent_relationship: value,
      consent_otp_verified: false,
    });
    setOtpCode('');
  }

  const phoneError = validatePhone(cellPhone, { required: true, label: 'cell phone number' });
  const invalid = {
    consent_patient_full_name: isBlank(draft.consent_patient_full_name),
    consent_signer_name: isBlank(draft.consent_signer_name),
    consent_relationship: isBlank(draft.consent_relationship),
    consent_date: isBlank(draft.consent_date),
    cell_phone: Boolean(phoneError),
    consent_otp: !draft.consent_otp_verified,
  };
  const err = (key) => showErrors && invalid[key];

  async function handleSendOtp() {
    if (phoneError) {
      setShowErrors(true);
      showToast(phoneError, 'error');
      return;
    }
    setSendingOtp(true);
    try {
      const data = await sendConsentOtp(cellPhone);
      patchDraft({
        consent_otp_sent: true,
        consent_otp_verified: false,
        consent_otp_phone: cellPhone,
      });
      setOtpCode('');
      showToast(data?.message || `OTP sent to ${cellPhone}`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to send OTP', 'error');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!draft.consent_otp_sent) {
      showToast('Send an OTP first.', 'error');
      return;
    }
    if (!otpCode.trim()) {
      setShowErrors(true);
      showToast('Enter the OTP received on the cell phone.', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      await verifyConsentOtp({ phone: cellPhone, otp: otpCode.trim() });
      patchDraft({
        consent_otp_verified: true,
        consent_otp_phone: cellPhone,
      });
      showToast('OTP verified — consent signature accepted.', 'success');
    } catch (e) {
      patchDraft({ consent_otp_verified: false });
      showToast(e.message || 'OTP verification failed', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  }

  function onNext(e) {
    e.preventDefault();
    setShowErrors(true);
    if (invalid.consent_patient_full_name) {
      showToast('Patient / dependant full name is required.', 'error');
      return;
    }
    if (invalid.consent_relationship) {
      showToast('Select relationship to patient.', 'error');
      return;
    }
    if (invalid.consent_signer_name) {
      showToast('Patient name / Guardian is required.', 'error');
      return;
    }
    if (invalid.consent_date) {
      showToast('Consent date is required.', 'error');
      return;
    }
    if (phoneError) {
      showToast(
        'A valid cell phone number from Step 1 is required to send the OTP signature.',
        'error'
      );
      return;
    }
    if (!draft.consent_otp_verified) {
      showToast('Verify the OTP to sign the consent before continuing.', 'error');
      return;
    }
    navigate('/front_office/registration/step-4');
  }

  return (
    <div className={fo.page}>
      <div className={fo.registrationIntro}>
        <header className={fo.header}>
          <p className={fo.kicker}>New admission</p>
          <h1 className={fo.title}>Patient registration</h1>
          <p className={fo.sub}>Step 3: Consent</p>
        </header>
        <RegistrationStepper activeStep={3} />
        <div className={fo.progressWrap}>
          <div className={fo.progressTrack} aria-hidden>
            <div className={fo.progressFill} style={{ width: '75%' }} />
          </div>
          <span className={fo.progressLabel}>75% complete</span>
        </div>
      </div>

      <form onSubmit={onNext} className={fo.form} noValidate>
        <article className={fo.sectionPanel}>
          <h3 className={fo.sectionTitle}>Treatment consent</h3>
          <div
            className={`mt-4 rounded-xl border bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ${
              err('consent_patient_full_name') ? 'border-red-500' : 'border-slate-200'
            }`}
          >
            <p>
              I hereby permit dental treatment for myself / dependant:{' '}
              <input
                type="text"
                aria-label="Patient or dependant full name"
                className={withError(
                  `${fo.input} mt-2 inline-block max-w-full font-semibold`,
                  err('consent_patient_full_name')
                )}
                value={draft.consent_patient_full_name || ''}
                onChange={(e) => {
                  const name = e.target.value;
                  const patch = {
                    consent_patient_full_name: name,
                    consent_otp_verified: false,
                  };
                  if (isSelf) patch.consent_signer_name = name;
                  patchDraft(patch);
                  setOtpCode('');
                }}
              />
            </p>
            <p className="mt-3">
              I take full responsibility for the payment for the care rendered. I give the dentist
              the discretion to the best treatment that can be offered.
            </p>
          </div>

          <div className={`${fo.fieldRow} mt-5`}>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-consent-relationship">
                Relationship to patient *
              </label>
              <select
                id="fo-consent-relationship"
                className={withError(fo.select, err('consent_relationship'))}
                value={draft.consent_relationship || ''}
                onChange={(e) => handleRelationshipChange(e.target.value)}
              >
                <option value="" disabled>
                  Select relationship
                </option>
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </p>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-consent-date">
                Date *
              </label>
              <input
                id="fo-consent-date"
                type="date"
                className={withError(fo.input, err('consent_date'))}
                value={draft.consent_date || todayIsoDate()}
                readOnly
                aria-readonly="true"
              />
            </p>
          </div>

          <p className={`${fo.field} mt-4`}>
            <label className={fo.label} htmlFor="fo-consent-signer">
              Patient name / Guardian *
            </label>
            <input
              id="fo-consent-signer"
              className={withError(fo.input, err('consent_signer_name'))}
              value={draft.consent_signer_name || ''}
              readOnly={isSelf}
              onChange={(e) => {
                if (isSelf) return;
                patchDraft({
                  consent_signer_name: e.target.value,
                  consent_otp_verified: false,
                });
                setOtpCode('');
              }}
            />
            <span className="mt-1 block text-xs text-slate-500">
              {isSelf
                ? 'Locked to the patient name because relationship is Self (mine).'
                : 'Editable when signing for a dependant — change if the relationship is not Self.'}
            </span>
          </p>
        </article>

        <article className={`${fo.sectionPanel} mt-4`}>
          <h3 className={fo.sectionTitle}>OTP signature</h3>
          <p className="mt-1 text-sm text-slate-600">
            The OTP sent to the patient&apos;s cell phone is the digital signature for this consent.
          </p>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              err('cell_phone') ? 'border-red-500 bg-rose-50/40' : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <p className="text-sm font-medium text-slate-800">Cell phone</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {cellPhone || 'No cell phone captured in Step 1'}
            </p>
            {!cellPhone ? (
              <p className="mt-2 text-sm text-red-600">
                Go back to Personal details and enter a cell phone number before sending OTP.
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={fo.btnPrimary}
              disabled={sendingOtp || !cellPhone}
              onClick={handleSendOtp}
            >
              {sendingOtp ? 'Sending OTP…' : draft.consent_otp_sent ? 'Resend OTP' : 'Send OTP'}
            </button>
            {draft.consent_otp_verified ? (
              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                OTP verified — signed
              </span>
            ) : null}
          </div>

          <div
            className={`mt-4 rounded-xl border p-4 ${
              err('consent_otp') ? 'border-red-500 bg-rose-50/40' : 'border-slate-200'
            }`}
          >
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-consent-otp">
                Enter OTP *
              </label>
              <input
                id="fo-consent-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={withError(fo.input, err('consent_otp') && !draft.consent_otp_verified)}
                placeholder="6-digit code"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  if (draft.consent_otp_verified) {
                    updateField('consent_otp_verified', false);
                  }
                }}
              />
            </p>
            <button
              type="button"
              className={`${fo.btnOutline} mt-3`}
              disabled={verifyingOtp || !draft.consent_otp_sent}
              onClick={handleVerifyOtp}
            >
              {verifyingOtp ? 'Verifying…' : 'Verify OTP signature'}
            </button>
          </div>
        </article>

        <footer className={fo.actions}>
          <Link to="/front_office/registration/step-2" className={fo.btnOutline}>
            Back
          </Link>
          <button type="submit" className={fo.btnPrimary}>
            Continue
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function PatientRegistrationStep3Page() {
  return (
    <RegistrationGuard>
      <Step3Form />
    </RegistrationGuard>
  );
}
