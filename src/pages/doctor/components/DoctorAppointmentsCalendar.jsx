import { useMemo, useState } from 'react';
import { todayInClinicTz } from '../../../utils/clinicDate';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDateKey(dateStr) {
  if (!dateStr || dateStr === 'unknown') return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export default function DoctorAppointmentsCalendar({
  appointments = [],
  selectedDate = '',
  onSelectDate,
  className = '',
}) {
  const clinicToday = todayInClinicTz();
  const todayParts = parseDateKey(clinicToday);

  const initialMonth = useMemo(() => {
    if (selectedDate) {
      const p = parseDateKey(selectedDate);
      if (p) return { year: p.year, month: p.month };
    }
    if (todayParts) return { year: todayParts.year, month: todayParts.month };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedDate, todayParts]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  const countsByDate = useMemo(() => {
    const map = new Map();
    for (const row of appointments) {
      const key = row.follow_up?.date;
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

    const cells = [];

    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      const day = daysInPrevMonth - i;
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
      cells.push({
        day,
        dateKey: toDateKey(prevYear, prevMonth, day),
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        day,
        dateKey: toDateKey(viewYear, viewMonth, day),
        inMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      const nextIndex = cells.length - (startWeekday + daysInMonth) + 1;
      const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
      cells.push({
        day: nextIndex,
        dateKey: toDateKey(nextYear, nextMonth, nextIndex),
        inMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(dateKey) {
    if (!countsByDate.has(dateKey)) return;
    onSelectDate?.(selectedDate === dateKey ? '' : dateKey);
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ${className}`}
      aria-label="Appointments calendar"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{monthLabel(viewYear, viewMonth)}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={goPrevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={goNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="py-1 text-[0.65rem] font-bold uppercase tracking-wide text-slate-400"
          >
            {label}
          </div>
        ))}

        {calendarDays.map((cell) => {
          const count = countsByDate.get(cell.dateKey) || 0;
          const hasAppointments = count > 0;
          const isToday = cell.dateKey === clinicToday;
          const isSelected = cell.dateKey === selectedDate;

          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={!hasAppointments}
              onClick={() => handleDayClick(cell.dateKey)}
              className={[
                'relative flex h-9 flex-col items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition',
                cell.inMonth ? 'text-slate-800' : 'text-slate-300',
                hasAppointments ? 'cursor-pointer hover:bg-teal-50' : 'cursor-default',
                isSelected ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-200' : '',
                isToday && !isSelected ? 'ring-1 ring-teal-400' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={
                hasAppointments
                  ? `${cell.day}, ${count} appointment${count === 1 ? '' : 's'}`
                  : `${cell.day}`
              }
              aria-pressed={isSelected}
            >
              <span>{cell.day}</span>
              {hasAppointments ? (
                <span
                  className={[
                    'mt-0.5 block h-1.5 min-w-[1.125rem] rounded-full px-1 text-[0.55rem] font-bold leading-[0.375rem]',
                    isSelected ? 'bg-white text-teal-700' : 'bg-teal-500 text-white',
                  ].join(' ')}
                >
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 block h-1.5" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <p className="mt-3 text-center text-xs text-slate-600">
          Showing appointments for{' '}
          <button
            type="button"
            className="font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-800"
            onClick={() => onSelectDate?.('')}
          >
            {selectedDate}
          </button>
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500">
          Tap a highlighted day to filter the list
        </p>
      )}
    </div>
  );
}
