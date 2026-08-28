import {
  formatDob,
  formatSexLabel,
  maskId,
  patientInitials,
  patientName,
} from '../../pages/front_office/patientUtils';
import { lookup } from '../../pages/front_office/styles/lookupClasses';

function MetaItem({ label, value, mono }) {
  return (
    <div className={lookup.returningMetaItem}>
      <p className={lookup.returningMetaLabel}>{label}</p>
      <p className={`${lookup.returningMetaValue} ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function StatusAlert({ variant, icon, title, children }) {
  const isError = variant === 'error';
  const isInfo = variant === 'info';
  const alertClass = isError
    ? lookup.returningAlertError
    : isInfo
      ? lookup.returningAlertInfo
      : lookup.returningAlertWarning;
  const iconClass = isError
    ? lookup.returningAlertIconError
    : isInfo
      ? lookup.returningAlertIconInfo
      : lookup.returningAlertIconWarning;

  return (
    <div
      className={`${lookup.returningAlert} ${alertClass}`}
      role={isError ? 'alert' : 'status'}
    >
      <span className={`${lookup.returningAlertIcon} ${iconClass}`} aria-hidden>
        {icon}
      </span>
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-1 text-slate-700' : ''}>{children}</div>
      </div>
    </div>
  );
}

export default function ReturningPatientCardShell({
  patient,
  ageLabel,
  eligible = true,
  ineligibleMessage,
  hasActiveVisit,
  activeVisitVariant = 'warning',
  activeVisitTitle,
  activeVisitMessage,
  activeLocation,
  activeVisitNumber,
  children,
  footer,
}) {
  return (
    <article className={lookup.returningCard}>
      <header className={lookup.returningHeader}>
        <div className={lookup.returningHeaderGlow} aria-hidden />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className={lookup.returningAvatar} aria-hidden>
            {patientInitials(patient)}
          </div>
          <div className="min-w-0 flex-1">
            <span className={lookup.returningBadge}>
              <span aria-hidden>↩</span>
              Returning patient
            </span>
            <h3 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              {patientName(patient)}
            </h3>
            <p className="mt-1 text-sm text-teal-100/90">
              {formatSexLabel(patient.sex)}
              {patient.payment_type ? ` · ${patient.payment_type === 'private' ? 'Private' : 'State'}` : ''}
            </p>
          </div>
        </div>

        <div className={lookup.returningMetaGrid}>
          <MetaItem label="Patient number" value={patient.patient_number || '—'} mono />
          <MetaItem label="National ID" value={patient.id_number ? maskId(patient.id_number) : '—'} mono />
          <MetaItem label="Date of birth" value={formatDob(patient.date_of_birth)} />
          {ageLabel ? <MetaItem label="Age" value={ageLabel} /> : null}
          <MetaItem label="Phone" value={patient.phone || '—'} />
        </div>
      </header>

      <div className={lookup.returningBody}>
        {!eligible && ineligibleMessage ? (
          <StatusAlert variant="error" icon="!" title="Not eligible">
            {ineligibleMessage}
          </StatusAlert>
        ) : null}

        {hasActiveVisit ? (
          <StatusAlert
            variant={activeVisitVariant}
            icon={activeVisitVariant === 'info' ? '✓' : '!'}
            title={activeVisitTitle}
          >
            {activeVisitMessage ?? (
              <>
                {activeVisitNumber ? (
                  <span className="font-mono">{activeVisitNumber}</span>
                ) : null}
                {activeVisitNumber && activeLocation ? ' · ' : null}
                {activeLocation ? (
                  <>Currently in <span className="font-semibold capitalize">{activeLocation}</span></>
                ) : null}
                {!activeVisitNumber && !activeLocation ? 'Check-in is unavailable.' : null}
                . Complete or discharge the current visit before a new check-in.
              </>
            )}
          </StatusAlert>
        ) : null}

        {children}
      </div>

      {footer ? <footer className={lookup.returningFooter}>{footer}</footer> : null}
    </article>
  );
}
