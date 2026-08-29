import { IntakeInput, IntakeTextarea } from '../../nurse/components/IntakeField';
import { nurse as c } from '../../nurse/styles/nurseClasses';
import {
  EXTRA_ORAL_FIELDS,
  INTRA_ORAL_FIELDS,
} from '../doctorDentalExamForm';
import DoctorDentalChart from './DoctorDentalChart';

export default function DoctorVitalsAndExamForm({
  vitalsForm,
  onVitalsChange,
  dentalExam,
  onDentalExamChange,
  complaintError = '',
}) {
  function setVital(key, value) {
    onVitalsChange({ ...vitalsForm, [key]: value });
  }

  function setExtraOral(key, value) {
    onDentalExamChange({
      ...dentalExam,
      extra_oral: { ...dentalExam.extra_oral, [key]: value },
    });
  }

  function setIntraOral(key, value) {
    onDentalExamChange({
      ...dentalExam,
      intra_oral: { ...dentalExam.intra_oral, [key]: value },
    });
  }

  function setInvestigation(patch) {
    onDentalExamChange({
      ...dentalExam,
      investigations: {
        ...(dentalExam.investigations || {}),
        ...patch,
      },
    });
  }

  function setDentalCharting(charting) {
    onDentalExamChange({
      ...dentalExam,
      dental_charting: charting,
    });
  }

  const investigations = dentalExam.investigations || {};

  return (
    <div className="space-y-4">
      <section className={c.sectionPanel} aria-labelledby="doc-complaint-heading">
        <h3 id="doc-complaint-heading" className={c.sectionTitle}>
          Complaint
        </h3>
        <div className="mt-4">
          <IntakeTextarea
            id="doc-chief-complaint"
            label="Chief complaint"
            required
            showRequiredMark
            error={complaintError}
            className={c.textarea}
            rows={3}
            placeholder="Patient’s main reason for the visit…"
            value={vitalsForm.chief_complaint || ''}
            onChange={(e) => setVital('chief_complaint', e.target.value)}
          />
        </div>
      </section>

      <section className={c.sectionPanel} aria-labelledby="doc-vitals-heading">
        <h3 id="doc-vitals-heading" className={c.sectionTitle}>
          Vitals
        </h3>
        <div className={`${c.vitalsGrid} mt-4`}>
          <IntakeInput
            id="doc-bp-sys"
            label="Blood pressure (systolic)"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="numeric"
            placeholder="mmHg"
            value={vitalsForm.blood_pressure_systolic}
            onChange={(e) => setVital('blood_pressure_systolic', e.target.value)}
          />
          <IntakeInput
            id="doc-bp-dia"
            label="Blood pressure (diastolic)"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="numeric"
            placeholder="mmHg"
            value={vitalsForm.blood_pressure_diastolic}
            onChange={(e) => setVital('blood_pressure_diastolic', e.target.value)}
          />
          <IntakeInput
            id="doc-pulse"
            label="Heart rate / Pulse"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="numeric"
            placeholder="BPM"
            value={vitalsForm.pulse_rate}
            onChange={(e) => setVital('pulse_rate', e.target.value)}
          />
          <IntakeInput
            id="doc-rr"
            label="Respiratory rate"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="numeric"
            placeholder="/min"
            value={vitalsForm.respiratory_rate}
            onChange={(e) => setVital('respiratory_rate', e.target.value)}
          />
          <IntakeInput
            id="doc-temp"
            label="Temperature"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="°C"
            value={vitalsForm.temperature}
            onChange={(e) => setVital('temperature', e.target.value)}
          />
          <IntakeInput
            id="doc-glucose"
            label="Blood glucose level"
            required={false}
            showRequiredMark={false}
            className={c.input}
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="mmol/L or mg/dL"
            value={vitalsForm.blood_glucose}
            onChange={(e) => setVital('blood_glucose', e.target.value)}
          />
        </div>
      </section>

      <section className={c.sectionPanel} aria-labelledby="doc-extra-oral-heading">
        <h3 id="doc-extra-oral-heading" className={c.sectionTitle}>
          Extra-oral exam
        </h3>
        <div className="mt-4 space-y-4">
          {EXTRA_ORAL_FIELDS.map((field) => (
            <IntakeTextarea
              key={field.key}
              id={`doc-extra-${field.key}`}
              label={field.label}
              required={false}
              showRequiredMark={false}
              className={c.textarea}
              rows={2}
              placeholder={field.hint}
              value={dentalExam.extra_oral?.[field.key] || ''}
              onChange={(e) => setExtraOral(field.key, e.target.value)}
            />
          ))}
        </div>
      </section>

      <section className={c.sectionPanel} aria-labelledby="doc-intra-oral-heading">
        <h3 id="doc-intra-oral-heading" className={c.sectionTitle}>
          Intra-oral exam
        </h3>
        <div className="mt-4 space-y-4">
          {INTRA_ORAL_FIELDS.map((field) => (
            <IntakeTextarea
              key={field.key}
              id={`doc-intra-${field.key}`}
              label={field.label}
              required={false}
              showRequiredMark={false}
              className={c.textarea}
              rows={2}
              placeholder={field.hint}
              value={dentalExam.intra_oral?.[field.key] || ''}
              onChange={(e) => setIntraOral(field.key, e.target.value)}
            />
          ))}
        </div>
      </section>

      <section className={c.sectionPanel} aria-labelledby="doc-dental-chart-heading">
        <h3 id="doc-dental-chart-heading" className={c.sectionTitle}>
          Digital dental chart
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Kay-One Dental Studio — chart pre-treatment condition and completed treatment. Select a tool,
          then click teeth to mark fillings, caries, extractions, or root canals.
        </p>
        <div className="mt-4">
          <DoctorDentalChart
            value={dentalExam.dental_charting}
            onChange={setDentalCharting}
          />
        </div>
      </section>

      <section className={c.sectionPanel} aria-labelledby="doc-investigations-heading">
        <h3 id="doc-investigations-heading" className={c.sectionTitle}>
          Investigation and results
        </h3>
        <div className="mt-4 space-y-4">
          <div className={c.choiceBox || 'rounded-xl border border-slate-200 bg-slate-50/60 p-4'}>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                checked={Boolean(investigations.xray_performed)}
                onChange={(e) =>
                  setInvestigation({
                    xray_performed: e.target.checked,
                    xray_results: e.target.checked ? investigations.xray_results || '' : '',
                  })
                }
              />
              X-Ray results
            </label>
            {investigations.xray_performed ? (
              <div className="mt-3">
                <IntakeTextarea
                  id="doc-xray-results"
                  label="X-Ray findings / description"
                  required={false}
                  showRequiredMark={false}
                  className={c.textarea}
                  rows={3}
                  maxLength={700}
                  placeholder="Describe X-Ray findings…"
                  value={investigations.xray_results || ''}
                  onChange={(e) => setInvestigation({ xray_results: e.target.value.slice(0, 700) })}
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {(investigations.xray_results || '').length}/700
                </p>
              </div>
            ) : null}
          </div>

          <div className={c.choiceBox || 'rounded-xl border border-slate-200 bg-slate-50/60 p-4'}>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                checked={Boolean(investigations.blood_test_performed)}
                onChange={(e) =>
                  setInvestigation({
                    blood_test_performed: e.target.checked,
                    blood_test_results: e.target.checked
                      ? investigations.blood_test_results || ''
                      : '',
                  })
                }
              />
              Blood test results
            </label>
            {investigations.blood_test_performed ? (
              <div className="mt-3">
                <IntakeTextarea
                  id="doc-blood-test-results"
                  label="Blood test findings / description"
                  required={false}
                  showRequiredMark={false}
                  className={c.textarea}
                  rows={3}
                  maxLength={700}
                  placeholder="Describe blood test findings…"
                  value={investigations.blood_test_results || ''}
                  onChange={(e) =>
                    setInvestigation({ blood_test_results: e.target.value.slice(0, 700) })
                  }
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {(investigations.blood_test_results || '').length}/700
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
