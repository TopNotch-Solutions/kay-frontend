import { useEffect, useMemo, useState } from 'react';
import { getAdminRoles } from '../../../api/admin';
import { admin as c, isOperationalFacility } from '../styles/adminClasses';

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role_id: '',
  facility_id: '',
};

export default function RegisterEmployeeModal({
  open,
  onClose,
  onSubmit,
  submitting,
  facilities,
}) {
  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');

  const kayOneFacility = useMemo(() => {
    const list = facilities || [];
    return (
      list.find((f) => f.name === 'Kay-One Dental')
      || list.find(isOperationalFacility)
      || list[0]
      || null
    );
  }, [facilities]);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      facility_id: kayOneFacility?.id || '',
    });
  }, [open, kayOneFacility?.id]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const loadRoles = async () => {
      setRolesLoading(true);
      setRolesError('');
      try {
        let list = [];
        if (form.facility_id) {
          list = await getAdminRoles({ facility_id: form.facility_id });
        }
        if ((!list || list.length === 0)) {
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

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.facility_id) return;
    if (!form.role_id) return;
    if (!String(form.phone || '').trim()) return;
    await onSubmit({
      ...form,
      phone: String(form.phone).trim(),
    });
  };

  return (
    <div className={c.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={c.modal}
        role="dialog"
        aria-labelledby="register-employee-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="register-employee-title" className={c.modalTitle}>
          Register new employee
        </h2>
        <p className={c.modalSub}>
          Staff are assigned to Kay-One Dental. An 8-digit temporary password is sent by SMS;
          the employee must set a new password on first sign-in.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={c.label} htmlFor="emp-first">
                First name
              </label>
              <input id="emp-first" className={c.input} value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div>
              <label className={c.label} htmlFor="emp-last">
                Last name
              </label>
              <input id="emp-last" className={c.input} value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>
          <div>
            <label className={c.label} htmlFor="emp-email">
              Email
            </label>
            <input id="emp-email" type="email" className={c.input} value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className={c.label} htmlFor="emp-phone">
              Cellphone number
            </label>
            <input
              id="emp-phone"
              type="tel"
              className={c.input}
              value={form.phone}
              onChange={set('phone')}
              placeholder="e.g. 0812345678"
              required
            />
          </div>
          <div>
            <label className={c.label} htmlFor="emp-facility">
              Facility
            </label>
            <input
              id="emp-facility"
              className={c.input}
              value={kayOneFacility?.name || 'Kay-One Dental'}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className={c.label} htmlFor="emp-role">
              Role
            </label>
            <select
              id="emp-role"
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
              disabled={submitting || rolesLoading || !form.facility_id || !form.role_id}
            >
              {submitting ? 'Registering…' : 'Register employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
