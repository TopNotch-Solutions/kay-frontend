import DoctorVitalsAndExamForm from './DoctorVitalsAndExamForm';
import DoctorIcd10Search from './DoctorIcd10Search';
import DoctorPrescriptionSection from './DoctorPrescriptionSection';
import DoctorFollowUpSection from './DoctorFollowUpSection';
import { IntakeTextarea } from '../../nurse/components/IntakeField';
import { nurse as c } from '../../nurse/styles/nurseClasses';

export default function DoctorConsultationForm({
  vitalsForm,
  onVitalsChange,
  dentalExam,
  onDentalExamChange,
  complaintError = '',
  allergy,
  icdInput,
  onIcdInputChange,
  onSelectIcd,
  diagnoses,
  diagnosisErrors = {},
  onRemoveDiagnosis,
  clinicalNotes,
  onClinicalNotesChange,
  followUp,
  onFollowUpChange,
  followUpError = '',
  catalog,
  catalogLoading,
  catalogError = '',
  medLine,
  medFieldErrors,
  onMedFieldChange,
  onMedicationSelect,
  liveStock,
  stockChecking,
  prescriptionLines,
  onAddMedToList,
  onRemoveMedLine,
  actionLoading,
  onCompleteConsultation,
  routingError,
}) {
  return (
    <>
      {allergy ? (
        <section className={c.sectionPanel} aria-label="Allergy alert">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            Allergy: {allergy}
          </p>
        </section>
      ) : null}

      <DoctorVitalsAndExamForm
        vitalsForm={vitalsForm}
        onVitalsChange={onVitalsChange}
        dentalExam={dentalExam}
        onDentalExamChange={onDentalExamChange}
        complaintError={complaintError}
      />

      <section className={c.sectionPanel} aria-labelledby="doc-diagnosis-heading">
        <h3 id="doc-diagnosis-heading" className={c.sectionTitle}>
          Diagnosis / clinical impression
        </h3>
        <p className="mt-1 text-sm text-slate-500">Optional</p>
        <div className="mt-4 space-y-4">
          <DoctorIcd10Search
            value={icdInput}
            onChange={onIcdInputChange}
            onSelect={onSelectIcd}
            error={diagnosisErrors.icd}
          />
          {diagnoses.length > 0 ? (
            <div className={c.tagList}>
              {diagnoses.map((d) => (
                <span key={d.code} className={c.tag}>
                  {d.code} - {d.label}
                  <button
                    type="button"
                    className={c.tagRemove}
                    aria-label={`Remove ${d.code}`}
                    onClick={() => onRemoveDiagnosis(d.code)}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <IntakeTextarea
            id="doc-clinical-notes"
            label="Clinical notes and treatment plan"
            required={false}
            showRequiredMark={false}
            error={diagnosisErrors.clinicalNotes}
            className={c.textarea}
            placeholder="Detail the treatment plan, counseling provided, and clinical reasoning…"
            value={clinicalNotes}
            onChange={(e) => onClinicalNotesChange(e.target.value)}
          />
        </div>
      </section>

      <DoctorPrescriptionSection
        catalog={catalog}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        medLine={medLine}
        medFieldErrors={medFieldErrors}
        onMedFieldChange={onMedFieldChange}
        onMedicationSelect={onMedicationSelect}
        liveStock={liveStock}
        stockChecking={stockChecking}
        prescriptionLines={prescriptionLines}
        onAddMedToList={onAddMedToList}
        onRemoveMedLine={onRemoveMedLine}
        actionLoading={actionLoading}
        hideSubmitButton
      />

      <DoctorFollowUpSection
        followUp={followUp}
        onFollowUpChange={onFollowUpChange}
        error={followUpError}
      />

      <section className={c.sectionPanel} aria-labelledby="doc-routing-heading">
        <h3 id="doc-routing-heading" className={c.sectionTitle}>
          Complete consultation
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Chief complaint is required. All other fields, including prescription, are optional.
        </p>
        {routingError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {routingError}
          </p>
        ) : null}
        <button
          type="button"
          className={`${c.btnAction} ${c.btnComplete} mt-4 max-w-md`}
          disabled={actionLoading}
          onClick={onCompleteConsultation}
        >
          {actionLoading ? 'Completing…' : 'Complete consultation'}
        </button>
      </section>
    </>
  );
}
