import { admin as c } from '../styles/adminClasses';
import AdminDashboardCharts from '../components/AdminDashboardCharts';

const METRICS = [
  { key: 'activeEmployees', label: 'Active staff', hint: 'At Kay-One Dental' },
  { key: 'todayVisits', label: 'Visits today', hint: 'Patient visits today' },
  { key: 'visits14d', label: 'Visits (14d)', hint: 'Last 14 days' },
  { key: 'queueWaiting', label: 'Queue waiting', hint: 'Patients currently waiting' },
];

export default function AdminDashboardView({
  dashboard,
  loading,
  onNavigate,
}) {
  if (loading || !dashboard) {
    return (
      <div className={c.sectionPanel}>
        <p className={c.cardBody}>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={c.hero}>
        <div>
          <h1 className={c.heroTitle}>System administrator dashboard</h1>
          <p className={c.heroSub}>Kay-One Dental overview</p>
        </div>
        <div className={c.kpiGrid}>
          {METRICS.map((m) => (
            <div key={m.key} className={c.kpiCard}>
              <p className={c.kpiValue}>{dashboard[m.key] ?? 0}</p>
              <p className={c.kpiLabel}>{m.label}</p>
              <p className={c.kpiHint}>{m.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <AdminDashboardCharts
        analytics={dashboard.analytics}
        facilityScope
        selectedFacilityName="Kay-One Dental"
      />

      <div className={c.sectionPanel}>
        <h3 className={c.cardTitle}>Quick actions</h3>
        <p className={c.cardDesc}>Manage Kay-One Dental staff.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={c.btnPrimary} onClick={() => onNavigate('employees')}>
            Manage employees
          </button>
          <button type="button" className={c.btnSecondary} onClick={() => onNavigate('admins')}>
            System administrators
          </button>
          <button type="button" className={c.btnSecondary} onClick={() => onNavigate('user-reports')}>
            User reports
          </button>
          <button type="button" className={c.btnSecondary} onClick={() => onNavigate('settings')}>
            Audit logs & settings
          </button>
        </div>
        {dashboard.inactiveEmployees > 0 ? (
          <p className="mt-4 text-xs text-emerald-100">
            <span className="font-semibold text-white">{dashboard.inactiveEmployees}</span> inactive
            account(s) remain in audit history.
          </p>
        ) : null}
      </div>
    </div>
  );
}
