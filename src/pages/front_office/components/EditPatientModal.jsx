import { useEffect, useState } from 'react';
import { getPatient, updatePatient } from '../../../api/patients';
import { useToast } from '../context/ToastContext';
import {
  MEDICAL_CONDITIONS,
  emptyMedicalConditions,
  formatMedicalHistoryNotes,
} from '../medicalHistory';
import { validateNationalId, validatePhone } from '../utils/validation';
import { lookup } from '../styles/lookupClasses';
import { fo } from '../styles/frontOfficeModuleClasses';

function asObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function str(value) {
  return value == null ? '' : String(value);
}

function normalizeDob(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function mapSex(sex) {
  if (sex === 'female' || sex === 'f') return 'female';
  if (sex === 'male' || sex === 'm') return 'male';
  return 'other';
}

function buildFormFromPatient(p) {
  const history = asObject(p.medical_history) || {};
  const isUnknown = p.category === 'unknown';

  return {
    first_name: isUnknown ? '' : str(p.first_name),
    last_name: isUnknown ? '' : str(p.last_name),
    date_of_birth: normalizeDob(p.date_of_birth),
    sex: mapSex(p.sex),
    id_number: str(p.id_number),
    address: str(p.address),
    telephone: str(p.telephone),
    cell_phone: str(p.cell_phone || p.phone),
    postal_address: str(p.postal_address),
    email: str(p.email),
    medical_aid_name: str(p.medical_aid_name),
    membership_number: str(p.membership_number),
    treated_by_doctor:
      history.treated_by_doctor === true || history.treated_by_doctor === false
        ? history.treated_by_doctor
        : null,
    treated_by_doctor_for: str(history.treated_by_doctor_for),
    on_medication:
      history.on_medication === true || history.on_medication === false
        ? history.on_medication
        : null,
    medication_kind: str(history.medication_kind),
    hospitalized:
      history.hospitalized === true || history.hospitalized === false
        ? history.hospitalized
        : null,
    hospitalized_when: str(history.hospitalized_when),
    hospitalized_why: str(history.hospitalized_why),
    conditions: {
      ...emptyMedicalConditions(),
      ...(history.conditions || {}),
    },
    other_disease: str(history.other_disease),
    allergy_specify: str(history.allergy_specify),
    pregnant:
      history.pregnant === true || history.pregnant === false ? history.pregnant : null,
    pregnant_months: str(history.pregnant_months),
  };
}

function YesNoRow({ label, value, onChange, details, detailsValue, onDetailsChange, detailsLabel }) {
  return (
    <div className={fo.choiceBox}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{label}</p>
        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
              checked={value === true}
              onChange={() => onChange(true)}
            />
            Yes
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
              checked={value === false}
              onChange={() => onChange(false)}
            />
            No
          </label>
        </div>
      </div>
      {value === true && details ? (
        <p className={`${fo.field} mt-3`}>
          <span className={fo.label}>{detailsLabel}</span>
          {details === 'textarea' ? (
            <textarea
              rows={2}
              className={fo.textarea}
              value={detailsValue}
              onChange={(e) => onDetailsChange(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className={fo.input}
              value={detailsValue}
              onChange={(e) => onDetailsChange(e.target.value)}
            />
          )}
        </p>
      ) : null}
    </div>
  );
}

export default function EditPatientModal({ registration, onClose, onSaved }) {
  const { showToast } = useToast();
  const listPatient = registration.patient;
  const [patient, setPatient] = useState(listPatient);
  const [form, setForm] = useState(() => buildFormFromPatient(listPatient));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const full = await getPatient(listPatient.id);
        if (cancelled) return;
        setPatient(full);
        setForm(buildFormFromPatient(full));
      } catch (err) {
        if (cancelled) return;
        // Fall back to list payload if detail fetch fails
        setPatient(listPatient);
        setForm(buildFormFromPatient(listPatient));
        showToast(err.message || 'Could not refresh patient details; using list data.', 'info');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [listPatient, showToast]);

  const isUnknown = patient?.category === 'unknown';
  const isFemale = form.sex === 'female';

  function patch(partial) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function setCondition(key, value) {
    setForm((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast('First name and last name are required.', 'error');
      return;
    }
    const idError = validateNationalId(form.id_number || '', { required: false });
    if (idError) {
      showToast(idError, 'error');
      return;
    }
    const cellError = validatePhone(form.cell_phone || '', { required: true, label: 'cell phone' });
    if (cellError) {
      showToast(cellError, 'error');
      return;
    }
    const telError = validatePhone(form.telephone || '', { required: false, label: 'telephone' });
    if (telError) {
      showToast(telError, 'error');
      return;
    }
    if (!form.address.trim()) {
      showToast('Address is required.', 'error');
      return;
    }

    const cellPhone = form.cell_phone.trim();
    const hasMedicalAid = Boolean(form.medical_aid_name.trim());
    const medical_history = {
      treated_by_doctor: form.treated_by_doctor,
      treated_by_doctor_for: form.treated_by_doctor_for.trim() || null,
      on_medication: form.on_medication,
      medication_kind: form.medication_kind.trim() || null,
      hospitalized: form.hospitalized,
      hospitalized_when: form.hospitalized_when.trim() || null,
      hospitalized_why: form.hospitalized_why.trim() || null,
      conditions: { ...(form.conditions || {}) },
      other_disease: form.other_disease.trim() || null,
      allergy_specify: form.allergy_specify.trim() || null,
      pregnant: isFemale ? form.pregnant : null,
      pregnant_months: isFemale ? (String(form.pregnant_months || '').trim() || null) : null,
    };
    medical_history.notes = formatMedicalHistoryNotes({
      ...form,
      medical_aid_name: form.medical_aid_name,
      membership_number: form.membership_number,
      ...medical_history,
      sex: form.sex === 'female' ? 'f' : form.sex === 'male' ? 'm' : 'x',
    });

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth || null,
      sex: form.sex,
      id_number: form.id_number.trim() || null,
      address: form.address.trim() || null,
      telephone: form.telephone.trim() || null,
      cell_phone: cellPhone,
      phone: cellPhone,
      postal_address: form.postal_address.trim() || null,
      email: form.email.trim() || null,
      medical_aid_name: form.medical_aid_name.trim() || null,
      membership_number: form.membership_number.trim() || null,
      medical_history,
      payment_type: hasMedicalAid ? 'private' : 'state',
      emergency_contact_phone: cellPhone,
    };

    if (isUnknown && payload.first_name && payload.last_name) {
      payload.category = 'known';
    }

    setSaving(true);
    try {
      await updatePatient(patient.id, payload);
      showToast('Patient profile updated.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Edit patient profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Same-day edit only — patients you registered today at this facility.
        </p>
        {isUnknown ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Unknown patient ({patient?.patient_number}). Enter identity details when confirmed.
          </p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading patient details…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <section className={fo.sectionPanel}>
              <h3 className={fo.sectionTitle}>Personal details</h3>
              <div className={`${fo.fieldRow} mt-3`}>
                <label className={fo.field}>
                  <span className={fo.label}>First name *</span>
                  <input
                    className={fo.input}
                    required
                    value={form.first_name}
                    onChange={(e) => patch({ first_name: e.target.value })}
                  />
                </label>
                <label className={fo.field}>
                  <span className={fo.label}>Last name *</span>
                  <input
                    className={fo.input}
                    required
                    value={form.last_name}
                    onChange={(e) => patch({ last_name: e.target.value })}
                  />
                </label>
              </div>
              <div className={`${fo.fieldRow} mt-3`}>
                <label className={fo.field}>
                  <span className={fo.label}>Sex *</span>
                  <select
                    className={fo.select}
                    value={form.sex}
                    onChange={(e) => patch({ sex: e.target.value })}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className={fo.field}>
                  <span className={fo.label}>Date of birth *</span>
                  <input
                    type="date"
                    className={fo.input}
                    value={form.date_of_birth}
                    onChange={(e) => patch({ date_of_birth: e.target.value })}
                  />
                </label>
              </div>
              <label className={`${fo.field} mt-3`}>
                <span className={fo.label}>
                  National ID number <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input
                  className={fo.input}
                  value={form.id_number}
                  onChange={(e) => patch({ id_number: e.target.value })}
                />
              </label>
              <label className={`${fo.field} mt-3`}>
                <span className={fo.label}>Address *</span>
                <textarea
                  className={fo.textarea}
                  rows={2}
                  value={form.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </label>
              <div className={`${fo.fieldRow} mt-3`}>
                <label className={fo.field}>
                  <span className={fo.label}>
                    Telephone <span className="font-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    type="tel"
                    className={fo.input}
                    value={form.telephone}
                    onChange={(e) => patch({ telephone: e.target.value })}
                  />
                </label>
                <label className={fo.field}>
                  <span className={fo.label}>Cell phone *</span>
                  <input
                    type="tel"
                    className={fo.input}
                    required
                    value={form.cell_phone}
                    onChange={(e) => patch({ cell_phone: e.target.value })}
                  />
                </label>
              </div>
              <label className={`${fo.field} mt-3`}>
                <span className={fo.label}>Postal address</span>
                <textarea
                  className={fo.textarea}
                  rows={2}
                  value={form.postal_address}
                  onChange={(e) => patch({ postal_address: e.target.value })}
                />
              </label>
              <label className={`${fo.field} mt-3`}>
                <span className={fo.label}>Email address</span>
                <input
                  type="email"
                  className={fo.input}
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </label>
            </section>

            <section className={fo.sectionPanel}>
              <h3 className={fo.sectionTitle}>Medical aid</h3>
              <div className={`${fo.fieldRow} mt-3`}>
                <label className={fo.field}>
                  <span className={fo.label}>Medical aid name</span>
                  <input
                    className={fo.input}
                    value={form.medical_aid_name}
                    onChange={(e) => patch({ medical_aid_name: e.target.value })}
                  />
                </label>
                <label className={fo.field}>
                  <span className={fo.label}>Membership number</span>
                  <input
                    className={fo.input}
                    value={form.membership_number}
                    onChange={(e) => patch({ membership_number: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <section className={fo.sectionPanel}>
              <h3 className={fo.sectionTitle}>Medical history</h3>
              <div className="mt-3 space-y-3">
                <YesNoRow
                  label="1. Are you being treated by a doctor?"
                  value={form.treated_by_doctor}
                  onChange={(v) =>
                    patch({
                      treated_by_doctor: v,
                      treated_by_doctor_for: v ? form.treated_by_doctor_for : '',
                    })
                  }
                  details="text"
                  detailsLabel="If yes, what for?"
                  detailsValue={form.treated_by_doctor_for}
                  onDetailsChange={(v) => patch({ treated_by_doctor_for: v })}
                />
                <YesNoRow
                  label="2. Are you on any medication?"
                  value={form.on_medication}
                  onChange={(v) =>
                    patch({
                      on_medication: v,
                      medication_kind: v ? form.medication_kind : '',
                    })
                  }
                  details="textarea"
                  detailsLabel="If yes, what kind?"
                  detailsValue={form.medication_kind}
                  onDetailsChange={(v) => patch({ medication_kind: v })}
                />
                <div className={fo.choiceBox}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                      3. Have you ever been hospitalized?
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                          checked={form.hospitalized === true}
                          onChange={() => patch({ hospitalized: true })}
                        />
                        Yes
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                          checked={form.hospitalized === false}
                          onChange={() =>
                            patch({
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
                  {form.hospitalized === true ? (
                    <div className={`${fo.fieldRow} mt-3`}>
                      <label className={fo.field}>
                        <span className={fo.label}>When?</span>
                        <input
                          className={fo.input}
                          value={form.hospitalized_when}
                          onChange={(e) => patch({ hospitalized_when: e.target.value })}
                        />
                      </label>
                      <label className={fo.field}>
                        <span className={fo.label}>Why?</span>
                        <input
                          className={fo.input}
                          value={form.hospitalized_why}
                          onChange={(e) => patch({ hospitalized_why: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className={fo.tableOk}>
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">4. Conditions</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Condition</th>
                          <th className="w-20 px-4 py-3 text-center font-semibold">Yes</th>
                          <th className="w-20 px-4 py-3 text-center font-semibold">No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {MEDICAL_CONDITIONS.map((row) => {
                          const value = form.conditions?.[row.key];
                          return (
                            <tr key={row.key} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 font-medium text-slate-800">{row.label}</td>
                              <td className="px-4 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`${row.label} Yes`}
                                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                                  checked={value === true}
                                  onChange={() => setCondition(row.key, true)}
                                />
                              </td>
                              <td className="px-4 py-2.5 text-center">
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

                <label className={fo.field}>
                  <span className={fo.label}>5. Any other disease</span>
                  <textarea
                    rows={2}
                    className={fo.textarea}
                    value={form.other_disease}
                    onChange={(e) => patch({ other_disease: e.target.value })}
                  />
                </label>
                <label className={fo.field}>
                  <span className={fo.label}>6. If any allergy, please specify</span>
                  <textarea
                    rows={2}
                    className={fo.textarea}
                    value={form.allergy_specify}
                    onChange={(e) => patch({ allergy_specify: e.target.value })}
                  />
                </label>

                {isFemale ? (
                  <div className={fo.choiceBox}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                        7. Women: are you pregnant?
                      </p>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                            checked={form.pregnant === true}
                            onChange={() => patch({ pregnant: true })}
                          />
                          Yes
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600/30"
                            checked={form.pregnant === false}
                            onChange={() => patch({ pregnant: false, pregnant_months: '' })}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    {form.pregnant === true ? (
                      <label className={`${fo.field} mt-3`}>
                        <span className={fo.label}>If yes, how many months?</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className={fo.input}
                          value={form.pregnant_months}
                          onChange={(e) => patch({ pregnant_months: e.target.value })}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={lookup.btnSecondary} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className={lookup.btnPrimary} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
