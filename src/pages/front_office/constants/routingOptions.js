/** Kay One Dental — front office routes patients to the doctor only. */
export const DOCTOR_DESTINATION = 'doctor';

export const ROUTING_DESTINATIONS = [
  { value: DOCTOR_DESTINATION, label: 'Doctor' },
];

export const HOSPITAL_ROUTING_DESTINATIONS = [
  { value: DOCTOR_DESTINATION, label: 'Doctor' },
];

export function isPharmacyRouting() {
  return false;
}

export function isMalePatient(sex) {
  if (!sex) return false;
  const value = String(sex).toLowerCase();
  return value === 'male' || value === 'm';
}

export function formatRoutingDestinationList(destinations = ROUTING_DESTINATIONS) {
  if (!destinations.length) return 'doctor';
  const labels = destinations.map((d) => d.label.toLowerCase());
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, or ${labels[labels.length - 1]}`;
}

/** Always doctor-only for Kay One Dental. */
export function getRoutingDestinationsForPatient() {
  return ROUTING_DESTINATIONS;
}

export function routingLabel(value, destinations = ROUTING_DESTINATIONS) {
  return destinations.find((d) => d.value === value)?.label
    || ROUTING_DESTINATIONS.find((d) => d.value === value)?.label
    || (value === DOCTOR_DESTINATION ? 'Doctor' : value);
}
