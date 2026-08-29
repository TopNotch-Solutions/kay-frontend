import DoctorVitalsAndExamForm from './DoctorVitalsAndExamForm';
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
  diagnosis,
  onDiagnosisChange,
  clinicalNotes,
  onClinicalNotesChange,
  followUp,
  onFollowUpChange,
  followUpError = '',
  medLine,
  medFieldErrors,
  onMedFieldChange,
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
          <IntakeTextarea
            id="doc-diagnosis"
            label="Diagnosis"
            required={false}
            showRequiredMark={false}
            className={c.textarea}
            placeholder="Enter diagnosis or clinical impression…"
            value={diagnosis}
            onChange={(e) => onDiagnosisChange(e.target.value)}
          />
          <IntakeTextarea
            id="doc-clinical-notes"
            label="Clinical notes and treatment plan"
            required={false}
            showRequiredMark={false}
            className={c.textarea}
            placeholder="Detail the treatment plan, counseling provided, and clinical reasoning…"
            value={clinicalNotes}
            onChange={(e) => onClinicalNotesChange(e.target.value)}
          />
        </div>
      </section>

      <DoctorPrescriptionSection
        medLine={medLine}
        medFieldErrors={medFieldErrors}
        onMedFieldChange={onMedFieldChange}
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
