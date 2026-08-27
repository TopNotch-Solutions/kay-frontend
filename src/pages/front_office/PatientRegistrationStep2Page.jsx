import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RegistrationGuard from './RegistrationGuard';
import { useRegistration } from './RegistrationContext';
import RegistrationStepper from './RegistrationStepper';
import { useToast } from './context/ToastContext';
import {
  MEDICAL_CONDITIONS,
  getMedicalHistoryInvalidMap,
  validateMedicalHistory,
} from './medicalHistory';
import { withError } from './utils/fieldErrors';
import { fo } from './styles/frontOfficeModuleClasses';

function YesNoField({
  id,
  label,
  checked,
  onChange,
  details,
  detailsId,
  detailsLabel,
  detailsValue,
  onDetailsChange,
  invalid,
  detailsInvalid,
}) {
  return (
    <div className={invalid ? fo.choiceBoxError : fo.choiceBox}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{label}</p>
        <div className="flex items-center gap-4" role="group" aria-labelledby={id}>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              id={`${id}-yes`}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
              checked={checked === true}
              onChange={() => onChange(true)}
            />
            Yes
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              id={`${id}-no`}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
              checked={checked === false}
              onChange={() => onChange(false)}
            />
            No
          </label>
        </div>
      </div>
      {checked === true && details ? (
        <p className={`${fo.field} mt-3`}>
          <label className={fo.label} htmlFor={detailsId}>
            {detailsLabel} *
          </label>
          {details === 'textarea' ? (
            <textarea
              id={detailsId}
              rows={2}
              className={withError(fo.textarea, detailsInvalid)}
              value={detailsValue}
              onChange={(e) => onDetailsChange(e.target.value)}
            />
          ) : (
            <input
              id={detailsId}
              type="text"
              className={withError(fo.input, detailsInvalid)}
              value={detailsValue}
              onChange={(e) => onDetailsChange(e.target.value)}
            />
          )}
        </p>
      ) : null}
    </div>
  );
}

function Step2Form() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, updateField, patchDraft } = useRegistration();
  const [showErrors, setShowErrors] = useState(false);
  const isFemale = draft.sex === 'f' || draft.sex === 'female';
  const invalidMap = getMedicalHistoryInvalidMap(draft);
  const mark = (key) => showErrors && Boolean(invalidMap[key]);

  function setCondition(key, value) {
    patchDraft({
      conditions: {
        ...draft.conditions,
        [key]: value,
      },
    });
  }

  function onNext(e) {
    e.preventDefault();
    setShowErrors(true);
    const error = validateMedicalHistory(draft);
    if (error) {
      showToast(error, 'error');
      return;
    }
    navigate('/front_office/registration/step-3');
  }

  return (
    <div className={`${fo.page} max-w-4xl`}>
      <div className={fo.registrationIntro}>
        <header className={fo.header}>
          <h1 className={fo.title}>Patient registration</h1>
          <p className={fo.sub}>Step 2: Medical</p>
        </header>
        <RegistrationStepper activeStep={2} />
      </div>

      <form onSubmit={onNext} className={fo.form} noValidate>
        <article className={fo.sectionPanel}>
          <h3 className={fo.sectionTitle}>Medical aid</h3>
          <div className={`${fo.fieldRow} mt-4`}>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-aid-name">
                Medical aid name
              </label>
              <input
                id="fo-aid-name"
                className={fo.input}
                value={draft.medical_aid_name}
                onChange={(e) => {
                  const name = e.target.value;
                  patchDraft({
                    medical_aid_name: name,
                    payment_type: name.trim() ? 'private' : draft.payment_type,
                  });
                }}
              />
            </p>
            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-aid-member">
                Membership number
              </label>
              <input
                id="fo-aid-member"
                className={fo.input}
                value={draft.membership_number}
                onChange={(e) => updateField('membership_number', e.target.value)}
              />
            </p>
          </div>
        </article>

        <article className={fo.sectionPanel}>
          <h3 className={fo.sectionTitle}>Medical history</h3>
          <div className="mt-4 space-y-3">
            <YesNoField
              id="fo-treated"
              label="1. Are you being treated by a doctor?"
              checked={draft.treated_by_doctor}
              invalid={mark('treated_by_doctor')}
              detailsInvalid={mark('treated_by_doctor_for')}
              onChange={(v) =>
                patchDraft({
                  treated_by_doctor: v,
                  treated_by_doctor_for: v ? draft.treated_by_doctor_for : '',
                })
              }
              details="text"
              detailsId="fo-treated-for"
              detailsLabel="If yes, what for?"
              detailsValue={draft.treated_by_doctor_for}
              onDetailsChange={(v) => updateField('treated_by_doctor_for', v)}
            />

            <YesNoField
              id="fo-meds"
              label="2. Are you on any medication?"
              checked={draft.on_medication}
              invalid={mark('on_medication')}
              detailsInvalid={mark('medication_kind')}
              onChange={(v) =>
                patchDraft({
                  on_medication: v,
                  medication_kind: v ? draft.medication_kind : '',
                })
              }
              details="textarea"
              detailsId="fo-meds-kind"
              detailsLabel="If yes, what kind?"
              detailsValue={draft.medication_kind}
              onDetailsChange={(v) => updateField('medication_kind', v)}
            />

            <div className={mark('hospitalized') ? fo.choiceBoxError : fo.choiceBox}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                  3. Have you ever been hospitalized?
                </p>
                <div className="flex items-center gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                      checked={draft.hospitalized === true}
                      onChange={() => patchDraft({ hospitalized: true })}
                    />
                    Yes
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                      checked={draft.hospitalized === false}
                      onChange={() =>
                        patchDraft({
                          hospitalized: false,
                          hospitalized_when: '',
                          hospitalized_why: '',
                        })
                      }
                    />
                    No
                  </label>
                </div>
              </div>
              {draft.hospitalized === true ? (
                <div className={`${fo.fieldRow} mt-3`}>
                  <p className={fo.field}>
                    <label className={fo.label} htmlFor="fo-hosp-when">
                      a) When? *
                    </label>
                    <input
                      id="fo-hosp-when"
                      className={withError(fo.input, mark('hospitalized_when'))}
                      value={draft.hospitalized_when}
                      onChange={(e) => updateField('hospitalized_when', e.target.value)}
                    />
                  </p>
                  <p className={fo.field}>
                    <label className={fo.label} htmlFor="fo-hosp-why">
                      b) Why? *
                    </label>
                    <input
                      id="fo-hosp-why"
                      className={withError(fo.input, mark('hospitalized_why'))}
                      value={draft.hospitalized_why}
                      onChange={(e) => updateField('hospitalized_why', e.target.value)}
                    />
                  </p>
                </div>
              ) : null}
            </div>

            <div className={mark('conditionsTable') ? fo.tableError : fo.tableOk}>
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  4. Are you suffering or have you ever suffered from any of the following
                  conditions?
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Condition</th>
                      <th className="w-24 px-4 py-3 text-center font-semibold">Yes</th>
                      <th className="w-24 px-4 py-3 text-center font-semibold">No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {MEDICAL_CONDITIONS.map((row) => {
                      const value = draft.conditions?.[row.key];
                      const rowInvalid = showErrors && invalidMap.conditions?.[row.key];
                      return (
                        <tr
                          key={row.key}
                          className={rowInvalid ? fo.rowError : 'hover:bg-slate-50/80'}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${row.label} Yes`}
                              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                              checked={value === true}
                              onChange={() => setCondition(row.key, true)}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${row.label} No`}
                              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                              checked={value === false}
                              onChange={() => setCondition(row.key, false)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-other-disease">
                5. Any other disease *
              </label>
              <textarea
                id="fo-other-disease"
                rows={2}
                className={withError(fo.textarea, mark('other_disease'))}
                placeholder='Enter details, or "None"'
                value={draft.other_disease}
                onChange={(e) => updateField('other_disease', e.target.value)}
              />
            </p>

            <p className={fo.field}>
              <label className={fo.label} htmlFor="fo-allergy-spec">
                6. If any allergy, please specify *
              </label>
              <textarea
                id="fo-allergy-spec"
                rows={2}
                className={withError(fo.textarea, mark('allergy_specify'))}
                placeholder='Enter details, or "None"'
                value={draft.allergy_specify}
                onChange={(e) => updateField('allergy_specify', e.target.value)}
              />
            </p>

            {isFemale ? (
              <div className={mark('pregnant') ? fo.choiceBoxError : fo.choiceBox}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                    7. Women: are you pregnant?
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                        checked={draft.pregnant === true}
                        onChange={() => patchDraft({ pregnant: true })}
                      />
                      Yes
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                        checked={draft.pregnant === false}
                        onChange={() =>
                          patchDraft({
                            pregnant: false,
                            pregnant_months: '',
                          })
                        }
                      />
                      No
                    </label>
                  </div>
                </div>
                {draft.pregnant === true ? (
                  <p className={`${fo.field} mt-3`}>
                    <label className={fo.label} htmlFor="fo-pregnant-months">
                      If yes, how many months? *
                    </label>
                    <input
                      id="fo-pregnant-months"
                      type="number"
                      min="1"
                      max="10"
                      className={withError(fo.input, mark('pregnant_months'))}
                      value={draft.pregnant_months}
                      onChange={(e) => updateField('pregnant_months', e.target.value)}
                    />
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>

        <footer className={fo.actions}>
          <Link to="/front_office/registration/step-1" className={fo.btnOutline}>
            ← Back
          </Link>
          <button type="submit" className={fo.btnPrimary}>
            Save and continue →
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function PatientRegistrationStep2Page() {
  return (
    <RegistrationGuard>
      <Step2Form />
    </RegistrationGuard>
  );
}
