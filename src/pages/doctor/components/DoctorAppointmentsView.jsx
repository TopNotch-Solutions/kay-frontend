import { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { cancelDoctorAppointment, cancelDoctorAppointmentsByDate, getDoctorAppointments } from '../../../api/doctor';
import { patientName, patientInitials } from '../../front_office/patientUtils';
import { nurse as c } from '../../nurse/styles/nurseClasses';
import {
  isFollowUpDateInFuture,
  minFollowUpDateInClinicTz,
  todayInClinicTz,
} from '../../../utils/clinicDate';
import DoctorAppointmentsCalendar from './DoctorAppointmentsCalendar';

const DEFAULT_APPOINTMENTS_API = {
  getAppointments: () => getDoctorAppointments(),
  cancelAppointment: cancelDoctorAppointment,
  cancelAppointmentsByDate: cancelDoctorAppointmentsByDate,
};

function formatAppointmentTime(time) {
  if (!time) return null;
  const m = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function formatDateHeading(dateStr) {
  if (!dateStr) return 'Upcoming';
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target - today) / (24 * 60 * 60 * 1000));
    const label = d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (diff === 0) return `Today · ${label}`;
    if (diff === 1) return `Tomorrow · ${label}`;
    return label;
  } catch {
    return dateStr;
  }
}

function initialsFromPatient(patient) {
  return patientInitials(patient) || '?';
}

function CalendarIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h3l1.2 4.8a1 1 0 01-.5 1.1l-2.1 1.2a12 12 0 005.9 5.9l1.2-2.1a1 1 0 011.1-.5L20 15.5V18.5a2 2 0 01-2.2 2 17 17 0 01-15-6.7A17 17 0 016.5 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyCalendarIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-300">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 10h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function appointmentSortKey(row) {
  const at = row.follow_up?.at;
  if (at) {
    const ms = new Date(at).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  const date = row.follow_up?.date || '';
  const time = row.follow_up?.time || '09:00';
  const parsed = new Date(`${date}T${time}`);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function sortAppointments(rows, sortOrder) {
  const sorted = [...rows].sort((a, b) => appointmentSortKey(a) - appointmentSortKey(b));
  return sortOrder === 'desc' ? sorted.reverse() : sorted;
}

async function promptCancelOrReschedule(patientLabel, currentFollowUp) {
  const minDate = minFollowUpDateInClinicTz();
  const defaultDate =
    currentFollowUp?.date && isFollowUpDateInFuture(currentFollowUp.date)
      ? currentFollowUp.date
      : minDate;
  const defaultTime = currentFollowUp?.time || '09:00';

  const result = await Swal.fire({
    title: 'Cancel appointment?',
    html: `
      <p class="mb-3 text-sm text-slate-600 text-left">
        The patient <strong>${patientLabel}</strong> will receive an SMS with your reason.
      </p>
      <label for="swal-cancel-reason" class="mb-1 block text-left text-sm font-semibold text-slate-700">
        Reason
      </label>
      <textarea
        id="swal-cancel-reason"
        class="swal2-textarea !mx-0 !w-full text-sm"
        rows="3"
        maxlength="500"
        placeholder="Explain why this appointment is cancelled or moved…"
      ></textarea>
      <label class="mt-4 flex items-center gap-2 text-left text-sm font-semibold text-slate-800">
        <input type="checkbox" id="swal-reschedule-check" class="h-4 w-4 rounded border-slate-300 text-teal-600" />
        Reschedule to a new date
      </label>
      <div id="swal-reschedule-fields" class="mt-3 hidden space-y-2 text-left">
        <div>
          <label for="swal-reschedule-date" class="mb-1 block text-xs font-semibold text-slate-600">
            New follow-up date
          </label>
          <p class="mb-1 text-xs text-slate-500">Must be a future date (tomorrow or later).</p>
          <input
            type="date"
            id="swal-reschedule-date"
            min="${minDate}"
            value="${defaultDate}"
            class="swal2-input !mx-0 !w-full text-sm"
          />
        </div>
        <div>
          <label for="swal-reschedule-time" class="mb-1 block text-xs font-semibold text-slate-600">
            New time
          </label>
          <input
            type="time"
            id="swal-reschedule-time"
            value="${defaultTime}"
            class="swal2-input !mx-0 !w-full text-sm"
          />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Keep appointment',
    confirmButtonColor: '#0d9488',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
    didOpen: () => {
      const check = document.getElementById('swal-reschedule-check');
      const fields = document.getElementById('swal-reschedule-fields');
      const confirmBtn = Swal.getConfirmButton();
      const toggle = () => {
        fields.classList.toggle('hidden', !check.checked);
        if (confirmBtn) {
          confirmBtn.textContent = check.checked ? 'Reschedule appointment' : 'Cancel appointment';
          confirmBtn.style.backgroundColor = check.checked ? '#0d9488' : '#b91c1c';
        }
      };
      check.addEventListener('change', toggle);
      toggle();
    },
    preConfirm: () => {
      const reasonEl = document.getElementById('swal-cancel-reason');
      const reason = reasonEl?.value?.trim() || '';
      if (!reason) {
        Swal.showValidationMessage('A reason is required.');
        return false;
      }
      const reschedule = document.getElementById('swal-reschedule-check')?.checked;
      if (!reschedule) {
        return { reason, reschedule: false };
      }
      const date = document.getElementById('swal-reschedule-date')?.value;
      const time = document.getElementById('swal-reschedule-time')?.value;
      if (!date) {
        Swal.showValidationMessage('Choose a new follow-up date.');
        return false;
      }
      if (!isFollowUpDateInFuture(date)) {
        Swal.showValidationMessage('Follow-up date must be a future date (tomorrow or later).');
        return false;
      }
      return {
        reason,
        reschedule: true,
        follow_up_date: date,
        follow_up_time: time || null,
      };
    },
  });

  if (!result.isConfirmed) return null;
  return result.value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function defaultRescheduleDate(currentDate) {
  if (currentDate && isFollowUpDateInFuture(currentDate)) return currentDate;
  return minFollowUpDateInClinicTz();
}

function defaultRescheduleTime(currentTime) {
  const formatted = formatAppointmentTime(currentTime);
  return formatted || '09:00';
}

function buildBulkRescheduleRowsHtml(rows, minDate) {
  return rows
    .map((row) => {
      const id = escapeHtml(row.consultation_id);
      const name = escapeHtml(patientName(row.patient) || 'Patient');
      const patientNumber = escapeHtml(row.patient?.patient_number || '—');
      const defaultDate = defaultRescheduleDate(row.follow_up?.date);
      const defaultTime = defaultRescheduleTime(row.follow_up?.time);
      return `
        <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <p class="text-sm font-semibold text-slate-900">${name}</p>
          <p class="text-xs text-slate-500">${patientNumber}</p>
          <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label for="swal-bulk-date-${id}" class="mb-1 block text-xs font-semibold text-slate-600">
                New date
              </label>
              <input
                type="date"
                id="swal-bulk-date-${id}"
                data-consultation-id="${id}"
                min="${minDate}"
                value="${defaultDate}"
                class="swal2-input swal-bulk-patient-date !mx-0 !w-full text-sm"
              />
            </div>
            <div>
              <label for="swal-bulk-time-${id}" class="mb-1 block text-xs font-semibold text-slate-600">
                New time
              </label>
              <input
                type="time"
                id="swal-bulk-time-${id}"
                data-consultation-id="${id}"
                value="${defaultTime}"
                class="swal2-input swal-bulk-patient-time !mx-0 !w-full text-sm"
              />
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function promptBulkCancel(dayLabel, rows) {
  const count = rows.length;
  const minDate = minFollowUpDateInClinicTz();
  const rescheduleRowsHtml = buildBulkRescheduleRowsHtml(rows, minDate);

  const result = await Swal.fire({
    title: `Cancel ${count} appointment${count === 1 ? '' : 's'}?`,
    width: '40rem',
    html: `
      <p class="mb-3 text-sm text-slate-600 text-left">
        This will cancel <strong>${count}</strong> follow-up appointment${count === 1 ? '' : 's'} scheduled for
        <strong>${escapeHtml(dayLabel)}</strong>. Each patient will receive an SMS with your reason.
      </p>
      <label for="swal-bulk-cancel-reason" class="mb-1 block text-left text-sm font-semibold text-slate-700">
        Reason
      </label>
      <textarea
        id="swal-bulk-cancel-reason"
        class="swal2-textarea !mx-0 !w-full text-sm"
        rows="3"
        maxlength="500"
        placeholder="Explain why these appointments are cancelled or moved…"
      ></textarea>
      <label class="mt-4 flex items-center gap-2 text-left text-sm font-semibold text-slate-800">
        <input type="checkbox" id="swal-bulk-reschedule-check" class="h-4 w-4 rounded border-slate-300 text-teal-600" />
        Reschedule each patient individually
      </label>
      <div id="swal-bulk-reschedule-fields" class="mt-3 hidden max-h-72 space-y-2 overflow-y-auto text-left">
        <p class="text-xs text-slate-500">Set a new follow-up date and time for each patient below.</p>
        ${rescheduleRowsHtml}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: `Cancel ${count} appointment${count === 1 ? '' : 's'}`,
    cancelButtonText: 'Keep appointments',
    confirmButtonColor: '#b91c1c',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
    didOpen: () => {
      const check = document.getElementById('swal-bulk-reschedule-check');
      const fields = document.getElementById('swal-bulk-reschedule-fields');
      const confirmBtn = Swal.getConfirmButton();
      const toggle = () => {
        fields.classList.toggle('hidden', !check.checked);
        if (confirmBtn) {
          const label = count === 1 ? 'appointment' : 'appointments';
          confirmBtn.textContent = check.checked
            ? `Reschedule ${count} ${label}`
            : `Cancel ${count} ${label}`;
          confirmBtn.style.backgroundColor = check.checked ? '#0d9488' : '#b91c1c';
        }
      };
      check.addEventListener('change', toggle);
      toggle();
    },
    preConfirm: () => {
      const reason = document.getElementById('swal-bulk-cancel-reason')?.value?.trim() || '';
      if (!reason) {
        Swal.showValidationMessage('A reason is required.');
        return false;
      }
      const reschedule = document.getElementById('swal-bulk-reschedule-check')?.checked;
      if (!reschedule) {
        return { reason, reschedule: false };
      }

      const reschedules = [];
      for (const row of rows) {
        const consultationId = row.consultation_id;
        const dateInput = document.getElementById(`swal-bulk-date-${consultationId}`);
        const timeInput = document.getElementById(`swal-bulk-time-${consultationId}`);
        const followUpDate = dateInput?.value?.trim() || '';
        const followUpTime = timeInput?.value?.trim() || '';
        const label = patientName(row.patient) || 'Patient';

        if (!followUpDate) {
          Swal.showValidationMessage(`Choose a new date for ${label}.`);
          return false;
        }
        if (!followUpTime) {
          Swal.showValidationMessage(`Choose a new time for ${label}.`);
          return false;
        }
        if (!isFollowUpDateInFuture(followUpDate)) {
          Swal.showValidationMessage(`Follow-up date for ${label} must be a future date (tomorrow or later).`);
          return false;
        }

        reschedules.push({
          consultation_id: consultationId,
          follow_up_date: followUpDate,
          follow_up_time: followUpTime,
        });
      }

      return {
        reason,
        reschedule: true,
        reschedules,
      };
    },
  });

  if (!result.isConfirmed) return null;
  return result.value;
}

function AppointmentCard({ row, busy, onCancel, showDoctorColumn = false }) {
  const name = patientName(row.patient);
  const timeLabel = formatAppointmentTime(row.follow_up?.time);
  const notes = row.follow_up?.notes || row.diagnosis;
  const doctorLabel = row.doctor?.name
    || [row.doctor?.first_name, row.doctor?.last_name].filter(Boolean).join(' ').trim();

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-5"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-50 opacity-80 transition group-hover:bg-teal-100/80" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-bold text-white shadow-md shadow-teal-900/20 ring-4 ring-white"
            aria-hidden
          >
            {initialsFromPatient(row.patient)}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-900">{name}</h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">
              {row.patient?.patient_number || '—'}
            </p>
            {row.patient?.phone ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                <PhoneIcon />
                {row.patient.phone}
              </p>
            ) : null}
            {showDoctorColumn && doctorLabel ? (
              <p className="mt-1.5 text-xs font-medium text-slate-600">
                Doctor: <span className="font-semibold text-slate-800">{doctorLabel}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="inline-flex items-center gap-2 rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50 to-white px-3 py-2 text-left sm:text-right">
            <CalendarIcon className="h-4 w-4 shrink-0 text-teal-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Follow-up</p>
              <p className="text-sm font-semibold text-slate-900">
                {row.follow_up?.display || row.follow_up?.date || '—'}
              </p>
              {timeLabel ? (
                <p className="text-xs font-medium tabular-nums text-slate-600">{timeLabel}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-red-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
            disabled={busy}
            onClick={() => onCancel(row)}
          >
            {busy ? 'Updating…' : 'Cancel / reschedule'}
          </button>
        </div>
      </div>

      {notes ? (
        <div className="relative mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">Notes</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{notes}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function DoctorAppointmentsView({
  onToast,
  api = DEFAULT_APPOINTMENTS_API,
  showDoctorColumn = false,
  supportsDoctorFilter = false,
  scheduleKicker = 'Schedule',
  scheduleTitle = 'Follow-up appointments',
  scheduleDescription = 'Upcoming return visits you scheduled. Cancelling sends the patient an SMS with your reason.',
}) {
  const [appointments, setAppointments] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedDate, setSelectedDate] = useState('');
  const [bulkCancellingDate, setBulkCancellingDate] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  const clinicToday = todayInClinicTz();

  const countsByDate = useMemo(() => {
    const map = new Map();
    for (const row of appointments) {
      const key = row.follow_up?.date;
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [appointments]);

  const todayCount = countsByDate.get(clinicToday) || 0;
  const selectedDateCount = selectedDate ? (countsByDate.get(selectedDate) || 0) : 0;

  const doctorOptions = useMemo(() => {
    if (!supportsDoctorFilter) return [];
    const map = new Map();
    for (const row of appointments) {
      if (!row.doctor?.id) continue;
      const label = row.doctor.name
        || [row.doctor.first_name, row.doctor.last_name].filter(Boolean).join(' ').trim()
        || 'Doctor';
      map.set(row.doctor.id, label);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [appointments, supportsDoctorFilter]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAppointments(
        supportsDoctorFilter && doctorFilter ? { doctorId: doctorFilter } : undefined
      );
      setAppointments(data.appointments || []);
      setCount(data.count ?? (data.appointments || []).length);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
      setAppointments([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [api, supportsDoctorFilter, doctorFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filtered = useMemo(() => {
    let rows = appointments;
    if (selectedDate) {
      rows = rows.filter((row) => row.follow_up?.date === selectedDate);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = patientName(row.patient).toLowerCase();
      const num = (row.patient?.patient_number || '').toLowerCase();
      const phone = (row.patient?.phone || '').toLowerCase();
      return name.includes(q) || num.includes(q) || phone.includes(q);
    });
  }, [appointments, search, selectedDate]);

  const sortedFiltered = useMemo(
    () => sortAppointments(filtered, sortOrder),
    [filtered, sortOrder]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of sortedFiltered) {
      const key = row.follow_up?.date || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    const entries = [...map.entries()];
    entries.sort(([a], [b]) => {
      const cmp = a.localeCompare(b);
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return entries;
  }, [sortedFiltered, sortOrder]);

  async function handleCancel(row) {
    const label = patientName(row.patient) || 'the patient';
    const payload = await promptCancelOrReschedule(label, row.follow_up);
    if (!payload) return;

    setActionId(row.consultation_id);
    try {
      const result = await api.cancelAppointment(row.consultation_id, payload);
      if (payload.reschedule) {
        onToast?.(
          result?.sms_sent
            ? 'Appointment rescheduled — SMS sent to patient.'
            : 'Appointment rescheduled. No cell phone on file for SMS.'
        );
      } else {
        onToast?.(
          result?.sms_sent
            ? 'Appointment cancelled — SMS sent to patient.'
            : 'Appointment cancelled. No cell phone on file for SMS.'
        );
      }
      await loadAppointments();
    } catch (err) {
      await Swal.fire({
        title: payload.reschedule ? 'Could not reschedule' : 'Could not cancel',
        text: err.message || 'Request failed.',
        icon: 'error',
        confirmButtonColor: '#0d9488',
      });
    } finally {
      setActionId(null);
    }
  }

  async function handleCancelDay(dateKey) {
    const rows = appointments.filter((row) => row.follow_up?.date === dateKey);
    const count = rows.length;
    if (!count) return;

    const dayLabel = formatDateHeading(dateKey);
    const payload = await promptBulkCancel(dayLabel, rows);
    if (!payload) return;

    setBulkCancellingDate(dateKey);
    try {
      const result = await api.cancelAppointmentsByDate({
        date: dateKey,
        reason: payload.reason,
        reschedule: payload.reschedule,
        reschedules: payload.reschedules,
        ...(supportsDoctorFilter && doctorFilter ? { doctor_id: doctorFilter } : {}),
      });
      const processed = result?.processed_count ?? count;
      const smsSent = result?.sms_sent_count ?? 0;
      const failures = result?.failures?.length ?? 0;
      const isReschedule = Boolean(payload.reschedule);
      const action = isReschedule ? 'Rescheduled' : 'Cancelled';

      if (failures > 0) {
        onToast?.(`${action} ${processed} appointment${processed === 1 ? '' : 's'}. ${failures} could not be updated.`);
      } else if (smsSent === processed) {
        onToast?.(`${action} ${processed} appointment${processed === 1 ? '' : 's'} — SMS sent to each patient.`);
      } else if (smsSent > 0) {
        onToast?.(`${action} ${processed} appointment${processed === 1 ? '' : 's'}. SMS sent to ${smsSent} patient${smsSent === 1 ? '' : 's'}.`);
      } else {
        onToast?.(`${action} ${processed} appointment${processed === 1 ? '' : 's'}. No cell phones on file for SMS.`);
      }

      if (selectedDate === dateKey && !isReschedule) {
        setSelectedDate('');
      }
      await loadAppointments();
    } catch (err) {
      await Swal.fire({
        title: payload.reschedule ? 'Could not reschedule appointments' : 'Could not cancel appointments',
        text: err.message || 'Request failed.',
        icon: 'error',
        confirmButtonColor: '#0d9488',
      });
    } finally {
      setBulkCancellingDate('');
    }
  }

  const bulkBusy = Boolean(bulkCancellingDate);

  return (
    <div className={`${c.main} overflow-y-auto`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
        <header
          className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 text-white shadow-lg shadow-teal-900/15"
        >
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-200/90">
                  {scheduleKicker}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {scheduleTitle}
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-teal-100/90">
                  {scheduleDescription}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold tabular-nums ring-1 ring-white/20 backdrop-blur-sm">
                  {count} upcoming
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60"
                  disabled={loading}
                  onClick={loadAppointments}
                >
                  {loading ? 'Refreshing…' : 'Refresh'}
                </button>
                {todayCount > 0 ? (
                  <button
                    type="button"
                    className="rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-red-500/30 disabled:opacity-60"
                    disabled={loading || bulkBusy}
                    onClick={() => handleCancelDay(clinicToday)}
                  >
                    {bulkCancellingDate === clinicToday
                      ? 'Updating…'
                      : `Cancel / reschedule all today (${todayCount})`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Search appointments</span>
            <input
              type="search"
              className={c.searchInput}
              placeholder="Search by name, patient ID, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {supportsDoctorFilter ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Doctor</span>
                <select
                  className={`${c.select} min-w-[11rem] py-2 text-sm`}
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                  aria-label="Filter appointments by doctor"
                >
                  <option value="">All doctors</option>
                  {doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Sort by date</span>
              <select
                className={`${c.select} min-w-[11rem] py-2 text-sm`}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Sort appointments by date"
              >
                <option value="asc">Soonest first</option>
                <option value="desc">Latest first</option>
              </select>
            </label>
            {search.trim() || selectedDate ? (
              <p className="text-sm text-slate-500 tabular-nums">
                {filtered.length} of {count} shown
                {selectedDate ? (
                  <button
                    type="button"
                    className="ml-2 font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800"
                    onClick={() => setSelectedDate('')}
                  >
                    Clear date
                  </button>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">Loading appointments…</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <EmptyCalendarIcon />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No upcoming appointments</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              When you schedule a follow-up during a consultation, it will appear here for review
              and cancellation.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${c.sectionPanel} text-center`}>
            <p className={c.hint}>No appointments match your search.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateKey, rows]) => (
              <section key={dateKey} aria-labelledby={`appt-date-${dateKey}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <h3
                    id={`appt-date-${dateKey}`}
                    className="text-sm font-bold uppercase tracking-wide text-slate-700"
                  >
                    {formatDateHeading(dateKey === 'unknown' ? null : dateKey)}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-slate-600">
                    {rows.length}
                  </span>
                  {dateKey !== 'unknown' ? (
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center rounded-lg border border-red-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                      disabled={bulkBusy || actionId !== null}
                      onClick={() => handleCancelDay(dateKey)}
                    >
                      {bulkCancellingDate === dateKey
                        ? 'Updating…'
                        : `Cancel / reschedule all (${rows.length})`}
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <li key={row.consultation_id}>
                      <AppointmentCard
                        row={row}
                        busy={actionId === row.consultation_id}
                        onCancel={handleCancel}
                        showDoctorColumn={showDoctorColumn}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
          </div>

          <aside className="w-full shrink-0 space-y-3 lg:sticky lg:top-6 lg:w-80">
            <DoctorAppointmentsCalendar
              appointments={appointments}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {selectedDate && selectedDateCount > 0 ? (
              <button
                type="button"
                className="w-full rounded-xl border border-red-200/90 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                disabled={bulkBusy || loading}
                onClick={() => handleCancelDay(selectedDate)}
              >
                {bulkCancellingDate === selectedDate
                  ? 'Updating appointments…'
                  : `Cancel / reschedule all on ${formatDateHeading(selectedDate)} (${selectedDateCount})`}
              </button>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
