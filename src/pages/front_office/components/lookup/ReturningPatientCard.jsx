import { Link } from 'react-router-dom';
import ReturningPatientCardShell from '../../../../components/patient/ReturningPatientCardShell';
import { useToast } from '../../context/ToastContext';
import {
  activeVisitLocation,
  isDoctorConsultationInProgress,
  isPatientInDoctorQueue,
} from '../../patientUtils';
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
  const inDoctorQueue = isPatientInDoctorQueue(patient);
  const consultationOpen = isDoctorConsultationInProgress(patient);
  const checkInBlocked = hasActiveVisit;
  const doctorLabel = routingLabel(DOCTOR_DESTINATION);
  const visitNumber = patient.active_visit?.visit_number;

  let activeVisitVariant = 'warning';
  let activeVisitTitle = 'Active visit in progress';
  let activeVisitMessage = null;
  let routeButtonLabel = `Route to ${doctorLabel}`;

  if (inDoctorQueue) {
    activeVisitVariant = 'info';
    activeVisitTitle = consultationOpen
      ? 'Consultation in progress'
      : 'Already in doctor queue';
    activeVisitMessage = (
      <>
        {visitNumber ? <span className="font-mono">{visitNumber}</span> : null}
        {visitNumber ? ' · ' : null}
        {consultationOpen
          ? 'A doctor is currently consulting this patient. Complete the consultation in the doctor module before a new check-in.'
          : 'This patient is already waiting in the doctor queue for this visit. They do not need to be routed again — ask the doctor to complete the consultation.'}
      </>
    );
    routeButtonLabel = consultationOpen ? 'Consultation in progress' : 'Already in doctor queue';
  }

  async function handleCheckIn() {
    if (checkInBlocked) {
      if (inDoctorQueue) {
        showToast(
          consultationOpen
            ? 'This patient’s consultation is already open with a doctor.'
            : 'This patient is already waiting in the doctor queue for their current visit.',
          'error'
        );
        return;
      }
      showToast(
        `This patient already has an active visit${activeLocation ? ` in ${activeLocation}` : ''}. `
        + 'They must complete their current visit before a new check-in.',
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
      activeVisitVariant={activeVisitVariant}
      activeVisitTitle={activeVisitTitle}
      activeVisitMessage={activeVisitMessage}
      activeLocation={activeLocation}
      activeVisitNumber={visitNumber}
      footer={(
        <>
          <button
            type="button"
            className={lookup.returningFooterPrimary}
            disabled={checkInLoading || checkInBlocked || busy}
            onClick={handleCheckIn}
          >
            {busy ? 'Routing…' : routeButtonLabel}
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
