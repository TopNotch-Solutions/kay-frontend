import { useState } from 'react';
import { IntakeInput } from '../../nurse/components/IntakeField';
import { nurse as c } from '../../nurse/styles/nurseClasses';
import {
  SCHEDULE_TYPES,
  SCHEDULE_TYPE_OPTIONS,
  formatPrescriptionScheduleLabel,
  formatRecurringDateLabel,
  normalizeRecurringDates,
  todayIsoDate,
} from '../../../utils/prescriptionSchedule';

export default function DoctorPrescriptionSection({
  medLine,
  medFieldErrors,
  onMedFieldChange,
  prescriptionLines,
  onAddMedToList,
  onRemoveMedLine,
  actionLoading,
  onSendToPharmacy = () => {},
  hideSubmitButton = false,
}) {
  const hasPrescription = prescriptionLines.length > 0;
  const [dateDraft, setDateDraft] = useState(todayIsoDate());
  const selectedDates = normalizeRecurringDates(medLine.recurring_dates);

  function addRecurringDate(isoDate) {
    const next = normalizeRecurringDates([...selectedDates, isoDate]);
    onMedFieldChange('recurring_dates', next);
  }

  function removeRecurringDate(isoDate) {
    onMedFieldChange(
      'recurring_dates',
      selectedDates.filter((d) => d !== isoDate)
    );
  }

  return (
    <section className={c.sectionPanel} aria-labelledby="doc-rx-heading">
      <h3 id="doc-rx-heading" className={c.sectionTitle}>
        Prescribe medication
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Add medications to the prescription list. All fields except medication name and dosage are optional.
      </p>

      <div className="mt-4 space-y-4">
        <div className={c.vitalsGrid}>
          <IntakeInput
            id="doc-med-name"
            label="Medication"
            required
            error={medFieldErrors.medication_name}
            className={c.input}
            placeholder="Enter medication name"
            value={medLine.medication_name}
            onChange={(e) => onMedFieldChange('medication_name', e.target.value)}
          />

          <IntakeInput
            id="doc-med-dose"
            label="Dosage"
            required={false}
            error={medFieldErrors.dosage}
            className={c.input}
            placeholder="e.g. 500mg TDS"
            value={medLine.dosage}
            onChange={(e) => onMedFieldChange('dosage', e.target.value)}
          />
          <IntakeInput
            id="doc-med-freq"
            label="Frequency"
            required={false}
            error={null}
            className={c.input}
            placeholder="e.g. Three times daily"
            value={medLine.frequency}
            onChange={(e) => onMedFieldChange('frequency', e.target.value)}
          />
          <IntakeInput
            id="doc-med-qty"
            label="Quantity"
            required={false}
            error={null}
            className={c.input}
            inputMode="numeric"
            value={medLine.quantity}
            onChange={(e) => onMedFieldChange('quantity', e.target.value)}
          />
        </div>

        <IntakeInput
          id="doc-med-inst"
          label="Instructions"
          required={false}
          error={null}
          className={c.input}
          placeholder="Optional instructions"
          value={medLine.instructions}
          onChange={(e) => onMedFieldChange('instructions', e.target.value)}
        />

        <fieldset className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-600">
            Dispensing schedule
          </legend>
          <p className="mt-1 text-xs text-slate-500">
            Choose whether this medication is given once or on a recurring schedule for future pharmacy visits.
          </p>
          <div className="mt-3 space-y-2">
            {SCHEDULE_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="med-schedule-type"
                  className="mt-0.5"
                  checked={(medLine.schedule_type || SCHEDULE_TYPES.ONCE_OFF) === opt.value}
                  onChange={() => onMedFieldChange('schedule_type', opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {(medLine.schedule_type || SCHEDULE_TYPES.ONCE_OFF) === SCHEDULE_TYPES.MONTHLY_DAY ? (
            <div className="mt-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Day of month *</span>
                <select
                  className={`${c.input} mt-1 w-full max-w-xs`}
                  value={medLine.recurring_day_of_month || ''}
                  onChange={(e) => onMedFieldChange('recurring_day_of_month', e.target.value)}
                >
                  <option value="">Select day…</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day)}>
                      {day}
                    </option>
                  ))}
                </select>
                {medFieldErrors.recurring_day_of_month ? (
                  <p className="mt-1 text-xs text-red-600">{medFieldErrors.recurring_day_of_month}</p>
                ) : null}
              </label>
            </div>
          ) : null}

          {(medLine.schedule_type || SCHEDULE_TYPES.ONCE_OFF) === SCHEDULE_TYPES.RECURRING_DATES ? (
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-700">Collection dates *</span>
              <p className="mt-1 text-xs text-slate-500">
                Pick specific days the patient should return for this medication — e.g. today, next
                Sunday, then Wednesday the week after. Continues until you mark the patient as better.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="block min-w-[10rem] flex-1">
                  <span className="sr-only">Date</span>
                  <input
                    type="date"
                    className={`${c.input} mt-0 w-full`}
                    value={dateDraft}
                    onChange={(e) => setDateDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={c.btnSecondary}
                  onClick={() => {
                    if (!dateDraft) return;
                    addRecurringDate(dateDraft);
                  }}
                >
                  Add date
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-teal-700 hover:underline"
                  onClick={() => {
                    const today = todayIsoDate();
                    setDateDraft(today);
                    addRecurringDate(today);
                  }}
                >
                  Add today
                </button>
              </div>
              {selectedDates.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {selectedDates.map((isoDate) => (
                    <li
                      key={isoDate}
                      className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {formatRecurringDateLabel(isoDate)}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700 hover:underline"
                        onClick={() => removeRecurringDate(isoDate)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {medFieldErrors.recurring_dates ? (
                <p className="mt-1 text-xs text-red-600">{medFieldErrors.recurring_dates}</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <button type="button" className={c.btnSecondary} onClick={onAddMedToList}>
          + Add to prescription list
        </button>

        {prescriptionLines.length > 0 ? (
          <ul className="space-y-2">
            {prescriptionLines.map((line, i) => (
              <li
                key={`${line.medication_name}-${i}`}
                className="rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span>
                      <strong>{line.medication_name}</strong>
                      {' '}
                      — {line.dosage}
                      {line.frequency ? ` (${line.frequency})` : ''} ×{line.quantity}
                    </span>
                    <p className="mt-1 text-xs font-medium text-indigo-800">
                      {formatPrescriptionScheduleLabel(line)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-slate-500 hover:text-red-600"
                    onClick={() => onRemoveMedLine(i)}
                    aria-label="Remove medication"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {hasPrescription && !hideSubmitButton ? (
          <button
            type="button"
            className={`${c.btnAction} ${c.btnPharmacy}`}
            disabled={actionLoading}
            onClick={onSendToPharmacy}
          >
            Send to pharmacy
          </button>
        ) : null}
      </div>
    </section>
  );
}
