import { apiRequest } from './client';

export function getFrontOfficeSupervisorMetrics() {
  return apiRequest('/api/v1/front-office/supervisor-metrics');
}

export function getFrontOfficeRoutingOptions() {
  return apiRequest('/api/v1/front-office/routing-options');
}

export function getMyRegistrationsToday() {
  return apiRequest('/api/v1/front-office/my-registrations');
}

export function sendConsentOtp(phone) {
  return apiRequest('/api/v1/front-office/consent/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyConsentOtp({ phone, otp }) {
  return apiRequest('/api/v1/front-office/consent/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
}
