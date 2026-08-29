import { useCallback, useEffect, useState } from 'react';
import { confirmAction } from '../../utils/confirmAction';
import { getStoredUser } from '../../api/authSession';
import {
  createAdminSystemAdmin,
  createAdminUser,
  getAdminAuditLogs,
  getAdminDashboard,
  getAdminFacilities,
  getAdminRoles,
  getAdminUsers,
  updateAdminUser,
} from '../../api/admin';
import AdminSidebar from './components/AdminSidebar';
import AdminTopbar from './components/AdminTopbar';
import RegisterEmployeeModal from './components/RegisterEmployeeModal';
import EditEmployeeModal from './components/EditEmployeeModal';
import RegisterSystemAdminModal from './components/RegisterSystemAdminModal';
import { admin as c } from './styles/adminClasses';
import AdminDashboardView from './views/AdminDashboardView';
import EmployeeManagementView from './views/EmployeeManagementView';
import SystemAdminManagementView from './views/SystemAdminManagementView';
import PatientRecordsView from './views/PatientRecordsView';
import UserReportsAdminView from './views/UserReportsAdminView';
import SystemSettingsView from './views/SystemSettingsView';

const KOPANO = 'https://kopanovertex.com/';

export default function SystemAdminPage() {
  const user = getStoredUser();
  const adminLabel =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'System administrator';
  const initials =
    adminLabel
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'SA';

  const [section, setSection] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [systemAdmins, setSystemAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editEmployeeModalOpen, setEditEmployeeModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const dash = await getAdminDashboard();
      setDashboard(dash);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadCore = useCallback(async () => {
    setError('');
    try {
      const [facs, roleList] = await Promise.all([
        getAdminFacilities(),
        getAdminRoles(),
      ]);
      setFacilities(facs || []);
      setRoles(roleList || []);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const { rows } = await getAdminUsers({
        limit: 200,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        exclude_role: 'system_admin',
      });
      setEmployees(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, [search, statusFilter, roleFilter]);

  const loadSystemAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const { rows } = await getAdminUsers({
        limit: 100,
        search: adminSearch.trim() || undefined,
        status: adminStatusFilter || undefined,
        role_only: 'system_admin',
      });
      setSystemAdmins(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load system administrators');
    } finally {
      setAdminsLoading(false);
    }
  }, [adminSearch, adminStatusFilter]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { rows } = await getAdminAuditLogs({ limit: 80 });
      setAuditLogs(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (section === 'employees') loadEmployees();
  }, [section, loadEmployees]);

  useEffect(() => {
    if (section === 'admins') loadSystemAdmins();
  }, [section, loadSystemAdmins]);

  useEffect(() => {
    if (section === 'settings') loadAudit();
  }, [section, loadAudit]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (section !== 'employees') return undefined;
    const t = setTimeout(() => loadEmployees(), 300);
    return () => clearTimeout(t);
  }, [search, section, loadEmployees]);

  useEffect(() => {
    if (section !== 'admins') return undefined;
    const t = setTimeout(() => loadSystemAdmins(), 300);
    return () => clearTimeout(t);
  }, [adminSearch, section, loadSystemAdmins]);

  const handleRegisterEmployee = async (form) => {
    setSubmitting(true);
    try {
      const created = await createAdminUser(form);
      setEmployeeModalOpen(false);
      let msg = `${created.first_name} ${created.last_name} registered.`;
      if (created.password_sent_by_sms) {
        msg += ' Temporary password sent by SMS.';
      } else if (created.temporary_password) {
        msg += ` Temporary password: ${created.temporary_password}`;
      }
      setToast(msg);
      await loadEmployees();
      await loadDashboard();
      const facs = await getAdminFacilities();
      setFacilities(facs || []);
    } catch (err) {
      setToast(err.message || 'Could not register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSystemAdmin = async (form) => {
    setSubmitting(true);
    try {
      const created = await createAdminSystemAdmin(form);
      setAdminModalOpen(false);
      let msg = `${created.first_name} ${created.last_name} added as system administrator.`;
      if (created.temporary_password) {
        msg += ` Temporary password: ${created.temporary_password}`;
      }
      setToast(msg);
      await loadSystemAdmins();
      await loadDashboard();
    } catch (err) {
      setToast(err.message || 'Could not add system administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEmployeeClick = (row) => {
    setEditEmployee(row);
    setEditEmployeeModalOpen(true);
  };

  const handleUpdateEmployee = async (payload) => {
    if (!editEmployee?.id) return;
    setSubmitting(true);
    try {
      const updated = await updateAdminUser(editEmployee.id, payload);
      setEditEmployeeModalOpen(false);
      setEditEmployee(null);
      setToast(`${updated.first_name} ${updated.last_name} updated.`);
      await loadEmployees();
      await loadDashboard();
    } catch (err) {
      setToast(err.message || 'Could not update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row, activate) => {
    const confirmed = await confirmAction({
      title: activate ? 'Activate account?' : 'Inactivate account?',
      text: activate
        ? `Activate ${row.first_name} ${row.last_name}?`
        : `Inactivate ${row.first_name} ${row.last_name}? They will remain in audit logs.`,
      icon: 'question',
      confirmButtonText: activate ? 'Activate' : 'Inactivate',
    });
    if (!confirmed) return;
    setTogglingId(row.id);
    try {
      await updateAdminUser(row.id, { is_active: activate });
      setToast(activate ? 'Account activated.' : 'Account inactivated.');
      if (section === 'admins') {
        await loadSystemAdmins();
      } else {
        await loadEmployees();
      }
      await loadDashboard();
    } catch (err) {
      setToast(err.message || 'Status update failed');
    } finally {
      setTogglingId(null);
    }
  };

  let content = null;
  if (section === 'dashboard') {
    content = (
      <AdminDashboardView
        dashboard={dashboard}
        loading={dashboardLoading}
        onNavigate={setSection}
      />
    );
  } else if (section === 'employees') {
    content = (
      <EmployeeManagementView
        employees={employees}
        loading={employeesLoading}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roles={roles}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        onRegisterClick={() => setEmployeeModalOpen(true)}
        onEditClick={handleEditEmployeeClick}
        onToggleActive={handleToggleActive}
        editingId={submitting && editEmployeeModalOpen ? editEmployee?.id : null}
        togglingId={togglingId}
      />
    );
  } else if (section === 'admins') {
    content = (
      <SystemAdminManagementView
        admins={systemAdmins}
        loading={adminsLoading}
        search={adminSearch}
        onSearchChange={setAdminSearch}
        statusFilter={adminStatusFilter}
        onStatusFilterChange={setAdminStatusFilter}
        onRegisterClick={() => setAdminModalOpen(true)}
        onToggleActive={handleToggleActive}
        togglingId={togglingId}
        currentUserId={user?.id}
      />
    );
  } else if (section === 'patient-records') {
    content = <PatientRecordsView />;
  } else if (section === 'user-reports') {
    content = <UserReportsAdminView onToast={setToast} currentUserId={user?.id} />;
  } else if (section === 'settings') {
    content = (
      <SystemSettingsView
        auditLogs={auditLogs}
        loading={auditLoading}
        onRefresh={loadAudit}
      />
    );
  }

  return (
    <div className={c.page}>
      <AdminTopbar adminLabel={adminLabel} initials={initials} />

      {toast ? (
        <div className={c.toast} role="status">
          {toast}
        </div>
      ) : null}

      {error ? (
        <p className={c.alert} role="alert">
          {error}
        </p>
      ) : null}

      <div className={c.body}>
        <AdminSidebar
          activeSection={section}
          onSectionChange={setSection}
        />
        <main className={c.main}>
          <div className={c.mainScroll}>{content}</div>
        </main>
      </div>

      <RegisterEmployeeModal
        open={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        onSubmit={handleRegisterEmployee}
        submitting={submitting}
        facilities={facilities}
      />
      <EditEmployeeModal
        open={editEmployeeModalOpen}
        employee={editEmployee}
        onClose={() => {
          setEditEmployeeModalOpen(false);
          setEditEmployee(null);
        }}
        onSubmit={handleUpdateEmployee}
        submitting={submitting}
        facilities={facilities}
      />
      <RegisterSystemAdminModal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSubmit={handleRegisterSystemAdmin}
        submitting={submitting}
      />

      <footer className={c.footer}>
        Health Management System | A digital solution by{' '}
        <a href={KOPANO} target="_blank" rel="noopener noreferrer" className={c.footerLink}>
          Kopano-Vertex
        </a>{' '}
        | System administrator
      </footer>
    </div>
  );
}
