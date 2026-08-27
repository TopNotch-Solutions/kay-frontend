import { Link } from 'react-router-dom';
import ReturningPatientCardShell from '../../../../components/patient/ReturningPatientCardShell';
import { useToast } from '../../context/ToastContext';
import { activeVisitLocation } from '../../patientUtils';
import { DOCTOR_DESTINATION, routingLabel } from '../../constants/routingOptions';
import { lookup } from '../../styles/lookupClasses';

export default function ReturningPatientCard({
  patient,
  onCheckIn,
  checkInLoading,
  checkInPatientId,
}) {
  const { showToast } = useToast();
  const busy = checkInLoading && checkInPatientId === patient.id;
  const hasActiveVisit = Boolean(patient.has_active_visit || patient.active_visit);
  const activeLocation = activeVisitLocation(patient);
  const checkInBlocked = hasActiveVisit;
  const doctorLabel = routingLabel(DOCTOR_DESTINATION);

  async function handleCheckIn() {
    if (checkInBlocked) {
      showToast(
        `This patient already has an active visit${activeLocation ? ` in ${activeLocation}` : ''}. `
        + 'They must complete their current consultation before a new check-in.',
        'error'
      );
      return;
    }
    await onCheckIn(patient, {
      routing_destination: DOCTOR_DESTINATION,
      is_emergency: false,
    });
  }

  return (
    <ReturningPatientCardShell
      patient={patient}
      hasActiveVisit={hasActiveVisit}
      activeLocation={activeLocation}
      activeVisitNumber={patient.active_visit?.visit_number}
      footer={(
        <>
          <button
            type="button"
            className={lookup.returningFooterPrimary}
            disabled={checkInLoading || checkInBlocked || busy}
            onClick={handleCheckIn}
          >
            {busy ? 'Routing…' : `Route to ${doctorLabel}`}
          </button>
          <Link
            to={`/front_office/patient/${patient.id}`}
            className={lookup.returningFooterSecondary}
          >
            View EHR
          </Link>
        </>
      )}
    >
      <p className="text-sm text-slate-600">
        Returning patients are routed to the <strong>{doctorLabel}</strong> queue.
      </p>
    </ReturningPatientCardShell>
  );
}
