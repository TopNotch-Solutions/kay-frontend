import { apiRequest, getApiBase, handleUnauthorized } from './client';
import { ensureAccessTokenFresh, getAccessToken, handleSessionExpired } from './authSession';
import { disconnectSocket } from './socket';

async function fetchPatientList(params = {}, isRetry = false) {
  if (!isRetry) {
    const ready = await ensureAccessTokenFresh();
    if (!ready) {
      disconnectSocket();
      handleSessionExpired();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  const qs = q.toString();
  const token = getAccessToken();
  const res = await fetch(`${getApiBase()}/api/v1/patients${qs ? `?${qs}` : ''}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    await handleUnauthorized(isRetry);
    return fetchPatientList(params, true);
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return {
    patients: json.data || [],
    pagination: json.pagination || {
      total: (json.data || []).length,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: 1,
    },
  };
}

export function listPatients({ page = 1, limit = 20, search } = {}) {
  return fetchPatientList({ page, limit, search });
}

export function searchPatients({ id_number, date_of_birth, name }) {
  const qs = new URLSearchParams();
  if (id_number) qs.set('id_number', id_number);
  if (date_of_birth) qs.set('date_of_birth', date_of_birth);
  if (name) qs.set('name', name);
  return apiRequest(`/api/v1/patients/search?${qs}`);
}

export function getPatient(id) {
  return apiRequest(`/api/v1/patients/${id}`);
}

export function getPatientHistory(id) {
  return apiRequest(`/api/v1/patients/${id}/history`);
}

export function getClinicalMedicalHistory(patientId) {
  return apiRequest(`/api/v1/patients/${patientId}/clinical-medical-history`);
}

export function getMedicalCard(patientId, { visit_id, exclude_payment } = {}) {
  const q = new URLSearchParams();
  if (visit_id) q.set('visit_id', visit_id);
  if (exclude_payment) q.set('exclude_payment', '1');
  const qs = q.toString();
  return apiRequest(`/api/v1/patients/${patientId}/medical-card${qs ? `?${qs}` : ''}`);
}

export function registerPatient(body) {
  return apiRequest('/api/v1/patients', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function registerEmergencyPatient(body) {
  return apiRequest('/api/v1/patients/emergency', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createPatientVisit(patientId, intake = {}) {
  const body = {};
  if (intake.mode_of_arrival) body.mode_of_arrival = intake.mode_of_arrival;
  if (intake.accompanied_by) body.accompanied_by = intake.accompanied_by;
  if (intake.is_emergency) body.is_emergency = true;
  if (intake.immediate_triage) body.immediate_triage = true;
  if (intake.routing_destination) body.routing_destination = intake.routing_destination;
  return apiRequest(`/api/v1/patients/${patientId}/visits`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updatePatient(patientId, body) {
  return apiRequest(`/api/v1/patients/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
