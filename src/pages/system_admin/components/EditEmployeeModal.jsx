import { useEffect, useMemo, useState } from 'react';
import { getAdminRoles } from '../../../api/admin';
import { admin as c, pickKayOneFacility, displayFacilityName, KAY_ONE_FACILITY_NAME } from '../styles/adminClasses';

function buildForm(employee) {
  if (!employee) {
    return {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role_id: '',
      facility_id: '',
    };
  }
  return {
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    role_id: employee.role?.id ? String(employee.role.id) : '',
    facility_id: employee.facility?.id ? String(employee.facility.id) : '',
  };
}

export default function EditEmployeeModal({
  open,
  employee,
  onClose,
  onSubmit,
  submitting,
  facilities,
}) {
  const [form, setForm] = useState(() => buildForm(employee));
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');

  const facility = useMemo(() => {
    if (employee?.facility) {
      return { ...employee.facility, name: displayFacilityName(employee) };
    }
    return pickKayOneFacility(facilities);
  }, [employee, facilities]);

  useEffect(() => {
    if (!open) return;
    setForm(buildForm(employee));
    setRolesError('');
  }, [open, employee]);

  useEffect(() => {
    if (!open || !form.facility_id) return undefined;

    let cancelled = false;
    const loadRoles = async () => {
      setRolesLoading(true);
      setRolesError('');
      try {
        let list = await getAdminRoles({ facility_id: form.facility_id });
        if (!list?.length) {
          list = await getAdminRoles({ context: 'clinic' });
        }
        if (!cancelled) setRoles(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setRoles([]);
          setRolesError(err.message || 'Could not load roles');
        }
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };

    loadRoles();
    return () => { cancelled = true; };
  }, [open, form.facility_id]);

  if (!open || !employee) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role_id) return;
    if (!String(form.phone || '').trim()) return;
    await onSubmit({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: String(form.phone).trim(),
      role_id: Number(form.role_id),
    });
  };

  const employeeLabel = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim();

  return (
    <div className={c.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={c.modal}
        role="dialog"
        aria-labelledby="edit-employee-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-employee-title" className={c.modalTitle}>
          Update employee
        </h2>
        <p className={c.modalSub}>
          Edit details for <strong>{employeeLabel || 'this employee'}</strong>. Facility assignment
          is managed separately via transfer when needed.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={c.label} htmlFor="edit-emp-first">
                First name
              </label>
              <input
                id="edit-emp-first"
                className={c.input}
                value={form.first_name}
                onChange={set('first_name')}
                required
              />
            </div>
            <div>
              <label className={c.label} htmlFor="edit-emp-last">
                Last name
              </label>
              <input
                id="edit-emp-last"
                className={c.input}
                value={form.last_name}
                onChange={set('last_name')}
                required
              />
            </div>
          </div>
          <div>
            <label className={c.label} htmlFor="edit-emp-email">
              Email
            </label>
            <input
              id="edit-emp-email"
              type="email"
              className={c.input}
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <label className={c.label} htmlFor="edit-emp-phone">
              Cellphone number
            </label>
            <input
              id="edit-emp-phone"
              type="tel"
              className={c.input}
              value={form.phone}
              onChange={set('phone')}
              placeholder="e.g. 0812345678"
              required
            />
          </div>
          <div>
            <label className={c.label} htmlFor="edit-emp-facility">
              Facility
            </label>
            <input
              id="edit-emp-facility"
              className={c.input}
              value={facility?.name || KAY_ONE_FACILITY_NAME}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={c.label} htmlFor="edit-emp-role">
              Role
            </label>
            <select
              id="edit-emp-role"
              className={c.input}
              value={form.role_id}
              onChange={set('role_id')}
              required
              disabled={rolesLoading}
            >
              <option value="">
                {rolesLoading ? 'Loading roles…' : 'Select role…'}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.display_name || r.name}
                </option>
              ))}
              {!rolesLoading && roles.length === 0 ? (
                <option value="" disabled>No roles available</option>
              ) : null}
            </select>
            {rolesError ? (
              <p className="mt-2 text-sm font-medium text-amber-800" role="alert">{rolesError}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={c.btnSecondary} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={c.btnPrimary}
              disabled={submitting || rolesLoading || !form.role_id}
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
