import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegistrationGuard from './RegistrationGuard';
import { useRegistration } from './RegistrationContext';
import RegistrationStepper from './RegistrationStepper';
import { useToast } from './context/ToastContext';
import { validateNationalId, validatePhone } from './utils/validation';
import { isBlank, withError } from './utils/fieldErrors';
import { fo } from './styles/frontOfficeModuleClasses';

function Step1Form() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, updateField } = useRegistration();
  const [showErrors, setShowErrors] = useState(false);

  const emailTrimmed = draft.email.trim();
  const emailInvalid = Boolean(emailTrimmed) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const telephoneError = validatePhone(draft.telephone || '', { required: false, label: 'telephone' });
  const cellError = validatePhone(draft.cell_phone || '', { required: true, label: 'cell phone' });
  const idError = validateNationalId(draft.id_number || '', { required: false });
  const today = new Date().toISOString().slice(0, 10);
  const dobIsFuture = Boolean(draft.date_of_birth) && draft.date_of_birth > today;

  const invalid = {
    first_name: isBlank(draft.first_name),
    last_name: isBlank(draft.last_name),
    sex: isBlank(draft.sex),
    date_of_birth: isBlank(draft.date_of_birth) || dobIsFuture,
    id_number: Boolean(idError),
    address: isBlank(draft.address),
    telephone: Boolean(telephoneError),
    cell_phone: Boolean(cellError) || isBlank(draft.cell_phone),
    email: emailInvalid,
  };

  function onNext(e) {
    e.preventDefault();
    setShowErrors(true);
    if (
      invalid.first_name ||
      invalid.last_name ||
      invalid.sex ||
      invalid.date_of_birth ||
      invalid.address
    ) {
      if (dobIsFuture) {
        showToast('Date of birth cannot be a future date.', 'error');
      } else {
        showToast('Please complete all required personal fields.', 'error');
      }
      return;
    }
    if (isBlank(draft.cell_phone) || cellError) {
      showToast(cellError || 'Cell phone is required for consent OTP in Step 3.', 'error');
      return;
    }
    if (idError) {
      showToast(idError, 'error');
      return;
    }
    if (telephoneError) {
      showToast(telephoneError, 'error');
      return;
    }
    if (emailInvalid) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    navigate('/front_office/registration/step-2');
  }

  const err = (key) => showErrors && invalid[key];

  return (
    <div className={fo.page}>
      <div className={fo.registrationIntro}>
        <header className={fo.header}>
          <p className={fo.kicker}>New admission</p>
          <h1 className={fo.title}>New patient registration</h1>
          <p className={fo.sub}>Step 1: Personal</p>
        </header>
        <RegistrationStepper activeStep={1} />
      </div>
      <form onSubmit={onNext} className={fo.form} noValidate>
        <article className={fo.sectionPanel}>
          <h3 className={fo.sectionTitle}>Personal details</h3>
          <div className={`${fo.fieldRow} mt-4`}>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-fn">
                First name *
              </label>
              <input
                id="fo-fn"
                className={withError(fo.input, err('first_name'))}
                autoComplete="given-name"
                value={draft.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
              />
            </p>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-ln">
                Last name *
              </label>
              <input
                id="fo-ln"
                className={withError(fo.input, err('last_name'))}
                autoComplete="family-name"
                value={draft.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
              />
            </p>
          </div>

          <div className={`${fo.fieldRow} mt-4`}>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-sex">
                Sex *
              </label>
              <select
                id="fo-sex"
                className={withError(fo.select, err('sex'))}
                value={draft.sex}
                onChange={(e) => updateField('sex', e.target.value)}
              >
                <option value="" disabled>
                  Select sex
                </option>
                <option value="f">Female</option>
                <option value="m">Male</option>
                <option value="x">Other</option>
              </select>
            </p>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-dob">
                Date of birth *
              </label>
              <input
                id="fo-dob"
                type="date"
                max={today}
                className={withError(fo.input, err('date_of_birth'))}
                value={draft.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
              />
            </p>
          </div>

          <p className={`${fo.field} mt-4`}>
            <label className={fo.label} htmlFor="fo-id">
              National ID number <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="fo-id"
              className={withError(fo.input, err('id_number'))}
              autoComplete="off"
              inputMode="numeric"
              value={draft.id_number}
              onChange={(e) => updateField('id_number', e.target.value)}
            />
          </p>

          <p className={`${fo.field} mt-4`}>
            <label className={fo.label} htmlFor="fo-addr">
              Address *
            </label>
            <textarea
              id="fo-addr"
              rows={3}
              className={withError(fo.textarea, err('address'))}
              autoComplete="street-address"
              value={draft.address}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </p>

          <div className={`${fo.fieldRow} mt-4`}>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-tel">
                Telephone <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="fo-tel"
                type="tel"
                className={withError(fo.input, err('telephone'))}
                autoComplete="tel"
                value={draft.telephone}
                onChange={(e) => updateField('telephone', e.target.value)}
              />
            </p>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-cell">
                Cell phone *
              </label>
              <input
                id="fo-cell"
                type="tel"
                className={withError(fo.input, err('cell_phone'))}
                autoComplete="tel-national"
                value={draft.cell_phone}
                onChange={(e) => updateField('cell_phone', e.target.value)}
              />
            </p>
          </div>

          <p className={`${fo.field} mt-4`}>
            <label className={fo.label} htmlFor="fo-postal">
              Postal address
            </label>
            <textarea
              id="fo-postal"
              rows={2}
              className={fo.textarea}
              autoComplete="postal-code"
              value={draft.postal_address}
              onChange={(e) => updateField('postal_address', e.target.value)}
            />
          </p>

          <p className={`${fo.field} mt-4`}>
            <label className={fo.label} htmlFor="fo-email">
              Email address
            </label>
            <input
              id="fo-email"
              type="email"
              className={withError(fo.input, err('email'))}
              autoComplete="email"
              placeholder="name@example.com"
              value={draft.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </p>
        </article>

        <footer className={fo.actions}>
          <Link to="/front_office" className={fo.btnOutline}>
            Cancel
          </Link>
          <button type="submit" className={fo.btnPrimary}>
            Next step →
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function PatientRegistrationStep1Page() {
  return (
    <RegistrationGuard>
      <Step1Form />
    </RegistrationGuard>
  );
}
