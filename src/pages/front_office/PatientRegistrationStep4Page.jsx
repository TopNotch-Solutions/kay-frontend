import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { confirmAction } from '../../utils/confirmAction';
import RegistrationGuard from './RegistrationGuard';
import { useRegistration } from './RegistrationContext';
import RegistrationStepper from './RegistrationStepper';
import RegistrationSummaryCard from './components/RegistrationSummaryCard';
import { DOCTOR_DESTINATION, routingLabel } from './constants/routingOptions';
import { useToast } from './context/ToastContext';
import { fo } from './styles/frontOfficeModuleClasses';

function Step4Form() {
  const { showToast } = useToast();
  const { draft, updateField, submitRegistration, submitting, submitError } = useRegistration();
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (draft.routing_destination !== DOCTOR_DESTINATION) {
      updateField('routing_destination', DOCTOR_DESTINATION);
    }
  }, [draft.routing_destination, updateField]);

  const canFinishRoute = draft.routing_destination === DOCTOR_DESTINATION;
  const routingInvalid = showErrors && !canFinishRoute;
  const doctorLabel = routingLabel(DOCTOR_DESTINATION);

  async function onFinish(e) {
    e.preventDefault();
    setShowErrors(true);
    if (draft.routing_destination !== DOCTOR_DESTINATION) {
      updateField('routing_destination', DOCTOR_DESTINATION);
    }
    if (!(await confirmAction({
      title: 'Finish registration?',
      text: `Register ${draft.first_name} ${draft.last_name} and route new to ${doctorLabel}?`,
      icon: 'question',
      confirmButtonText: `Finish & route new to ${doctorLabel}`,
    }))) return;
    await submitRegistration();
  }

  return (
    <div className={fo.page}>
      <div className={fo.registrationIntro}>
        <header className={fo.header}>
          <h1 className={fo.title}>Patient registration</h1>
          <p className={fo.sub}>Step 4: Review, route &amp; submit</p>
        </header>
        <RegistrationStepper activeStep={4} />
        <div className={fo.progressWrap}>
          <div className={fo.progressTrack} aria-hidden>
            <div className={fo.progressFill} style={{ width: '100%' }} />
          </div>
          <span className={fo.progressLabel}>Ready to submit</span>
        </div>
      </div>

      <article className={fo.sectionPanel}>
        <h3 className={fo.sectionTitle}>Summary</h3>
        <div className="mt-4">
          <RegistrationSummaryCard draft={draft} />
        </div>
      </article>

      <article
        className={`${fo.sectionPanel} mt-4 ${
          routingInvalid ? 'border-2 border-red-500' : ''
        }`}
      >
        <h3 className={fo.sectionTitle}>Routing</h3>
        <p className="mt-2 text-sm text-slate-600">
          All new patients are routed to the <strong>{doctorLabel}</strong> queue.
        </p>
      </article>

      {submitError ? (
        <p role="alert" className={fo.error}>
          {submitError}
        </p>
      ) : null}

      <footer className={fo.actions}>
        <Link to="/front_office/registration/step-3" className={fo.btnOutline}>
          Back
        </Link>
        <button type="button" className={fo.btnPrimary} disabled={submitting} onClick={onFinish}>
          {submitting ? 'Finishing…' : `Finish & route new to ${doctorLabel}`}
        </button>
      </footer>
    </div>
  );
}

export default function PatientRegistrationStep4Page() {
  return (
    <RegistrationGuard>
      <Step4Form />
    </RegistrationGuard>
  );
}
