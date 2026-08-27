import { IntakeInput, IntakeTextarea } from '../../nurse/components/IntakeField';
import { nurse as c } from '../../nurse/styles/nurseClasses';

function tomorrowIsoDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DoctorFollowUpSection({ followUp, onFollowUpChange, error = '' }) {
  function setField(key, value) {
    onFollowUpChange({ ...followUp, [key]: value });
  }

  const minDate = tomorrowIsoDate();

  return (
    <section className={c.sectionPanel} aria-labelledby="doc-follow-up-heading">
      <h3 id="doc-follow-up-heading" className={c.sectionTitle}>
        Follow-up
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Optional — schedule a return visit (must be a future date). The patient receives an SMS
        reminder 1 day before and 3 hours before the appointment.
      </p>
      <div className="mt-4 space-y-4">
        <div className={c.vitalsGrid}>
          <IntakeInput
            id="doc-follow-up-date"
            label="Follow-up date"
            type="date"
            min={minDate}
            required={false}
            showRequiredMark={false}
            error={error}
            className={c.input}
            value={followUp.date}
            onChange={(e) => setField('date', e.target.value)}
          />
          <IntakeInput
            id="doc-follow-up-time"
            label="Follow-up time"
            type="time"
            required={false}
            showRequiredMark={false}
            className={c.input}
            value={followUp.time}
            onChange={(e) => setField('time', e.target.value)}
          />
        </div>
        <IntakeTextarea
          id="doc-follow-up-notes"
          label="Follow-up notes"
          required={false}
          showRequiredMark={false}
          className={c.textarea}
          rows={3}
          placeholder="Reason for follow-up, instructions for the patient, or what to review next visit…"
          value={followUp.notes}
          onChange={(e) => setField('notes', e.target.value)}
        />
      </div>
    </section>
  );
}
