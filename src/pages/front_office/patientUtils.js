export function patientName(p) {
  if (!p) return 'Unknown';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
}

export function patientInitials(p) {
  const name = patientName(p);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export function formatSexLabel(sex) {
  if (!sex) return '—';
  const s = String(sex);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDob(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function maskId(id) {
  if (!id || id.length < 4) return id || '—';
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function formatDepartmentLabel(department) {
  if (!department) return 'the facility';
  return String(department).replace(/_/g, ' ');
}

export function activeVisitLocation(patient) {
  const visit = patient?.active_visit;
  if (!visit) return null;
  return formatDepartmentLabel(visit.queue_department || visit.current_department);
}

/** Patient has an open visit and is waiting or being seen in the doctor queue. */
export function isPatientInDoctorQueue(patient) {
  const visit = patient?.active_visit;
  if (!visit) return false;
  if (visit.in_doctor_queue) return true;
  const dept = visit.queue_department || visit.current_department;
  if (dept !== 'doctor') return false;
  const status = visit.queue_status;
  return status === 'waiting' || status === 'in_progress';
}

export function isDoctorConsultationInProgress(patient) {
  const visit = patient?.active_visit;
  if (!visit) return false;
  if (visit.consultation_in_progress) return true;
  return isPatientInDoctorQueue(patient) && visit.queue_status === 'in_progress';
}

export function mapSexToApi(value) {
  if (value === 'f' || value === 'female') return 'female';
  if (value === 'm' || value === 'male') return 'male';
  return 'other';
}

export const REGISTRATION_STORAGE_KEY = 'fo_registration_draft_v2';
export const REGISTRATION_ALLOWED_KEY = 'fo_registration_allowed';
