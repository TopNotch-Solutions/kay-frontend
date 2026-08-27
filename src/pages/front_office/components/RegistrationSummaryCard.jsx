import { formatDob, patientInitials } from '../patientUtils';
import { MEDICAL_CONDITIONS } from '../medicalHistory';
import { fo } from '../styles/frontOfficeModuleClasses';

function formatSex(sex) {
  if (!sex) return null;
  const value = String(sex).toLowerCase();
  if (value === 'm' || value === 'male') return 'Male';
  if (value === 'f' || value === 'female') return 'Female';
  if (value === 'other') return 'Other';
  return sex;
}

function SummaryField({ label, value, muted = false }) {
  const empty = !value || value === '—';
  return (
    <div className={fo.summaryItem}>
      <dt className={fo.summaryLabel}>{label}</dt>
      <dd className={empty ? fo.summaryValueMuted : fo.summaryValue}>{value || '—'}</dd>
    </div>
  );
}

function SummaryGroup({ title, children }) {
  return (
    <section className={fo.summaryGroup}>
      <h4 className={fo.summaryGroupTitle}>{title}</h4>
      <dl className={fo.summaryGrid}>{children}</dl>
    </section>
  );
}

export default function RegistrationSummaryCard({ draft }) {
  const fullName = [draft.first_name, draft.last_name].filter(Boolean).join(' ') || 'Patient';
  const sexLabel = formatSex(draft.sex);
  const dobLabel = formatDob(draft.date_of_birth);
  const activeConditions = MEDICAL_CONDITIONS.filter((c) => draft.conditions?.[c.key] === true)
    .map((c) => c.label)
    .join(', ');

  return (
    <article className={fo.summaryCard} aria-labelledby="fo-registration-summary-title">
      <div className={fo.summaryHero}>
        <div className={fo.summaryAvatar} aria-hidden>
          {patientInitials({ first_name: draft.first_name, last_name: draft.last_name })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="fo-registration-summary-title" className={fo.summaryHeroName}>
            {fullName}
          </h3>
          <p className={fo.summaryHeroMeta}>
            {sexLabel ? <span>{sexLabel}</span> : null}
            {sexLabel && dobLabel !== '—' ? <span className={fo.summaryHeroDot}>·</span> : null}
            {dobLabel !== '—' ? <span>{dobLabel}</span> : null}
            {!sexLabel && dobLabel === '—' ? <span className="text-slate-400">Details pending</span> : null}
          </p>
        </div>
      </div>

      <div className={fo.summaryBody}>
        <SummaryGroup title="Personal">
          <SummaryField label="Sex" value={sexLabel} muted={!sexLabel} />
          <SummaryField label="Date of birth" value={dobLabel !== '—' ? dobLabel : null} muted={dobLabel === '—'} />
          <SummaryField label="National ID" value={draft.id_number} muted={!draft.id_number} />
          <SummaryField label="Address" value={draft.address} muted={!draft.address} />
          <SummaryField label="Postal address" value={draft.postal_address} muted={!draft.postal_address} />
          <SummaryField label="Telephone" value={draft.telephone} muted={!draft.telephone} />
          <SummaryField label="Cell phone" value={draft.cell_phone} muted={!draft.cell_phone} />
          <SummaryField label="Email" value={draft.email} muted={!draft.email} />
        </SummaryGroup>

        <SummaryGroup title="Medical aid">
          <SummaryField label="Medical aid name" value={draft.medical_aid_name} muted={!draft.medical_aid_name} />
          <SummaryField label="Membership number" value={draft.membership_number} muted={!draft.membership_number} />
        </SummaryGroup>

        <SummaryGroup title="Medical history">
          <SummaryField
            label="Treated by a doctor"
            value={
              draft.treated_by_doctor === true
                ? `Yes${draft.treated_by_doctor_for ? ` — ${draft.treated_by_doctor_for}` : ''}`
                : draft.treated_by_doctor === false
                  ? 'No'
                  : null
            }
            muted={draft.treated_by_doctor == null}
          />
          <SummaryField
            label="On medication"
            value={
              draft.on_medication === true
                ? `Yes${draft.medication_kind ? ` — ${draft.medication_kind}` : ''}`
                : draft.on_medication === false
                  ? 'No'
                  : null
            }
            muted={draft.on_medication == null}
          />
          <SummaryField
            label="Hospitalized"
            value={
              draft.hospitalized === true
                ? `Yes${draft.hospitalized_when || draft.hospitalized_why ? ` — ${[draft.hospitalized_when, draft.hospitalized_why].filter(Boolean).join('; ')}` : ''}`
                : draft.hospitalized === false
                  ? 'No'
                  : null
            }
            muted={draft.hospitalized == null}
          />
          <SummaryField
            label="Conditions"
            value={activeConditions || 'None'}
            muted={!activeConditions}
          />
          <SummaryField label="Other disease" value={draft.other_disease} muted={!draft.other_disease} />
          <SummaryField label="Allergy specify" value={draft.allergy_specify} muted={!draft.allergy_specify} />
          {(draft.sex === 'f' || draft.sex === 'female') ? (
            <SummaryField
              label="Pregnant"
              value={
                draft.pregnant === true
                  ? `Yes${draft.pregnant_months ? ` — ${draft.pregnant_months} months` : ''}`
                  : draft.pregnant === false
                    ? 'No'
                    : null
              }
              muted={draft.pregnant == null}
            />
          ) : null}
        </SummaryGroup>

        <SummaryGroup title="Consent">
          <SummaryField
            label="Patient / dependant"
            value={draft.consent_patient_full_name}
            muted={!draft.consent_patient_full_name}
          />
          <SummaryField
            label="Patient name / Guardian"
            value={draft.consent_signer_name}
            muted={!draft.consent_signer_name}
          />
          <SummaryField
            label="Relationship"
            value={draft.consent_relationship}
            muted={!draft.consent_relationship}
          />
          <SummaryField label="Date" value={draft.consent_date} muted={!draft.consent_date} />
          <SummaryField
            label="OTP signature"
            value={
              draft.consent_otp_verified
                ? `Verified (${draft.consent_otp_phone || draft.cell_phone || '—'})`
                : 'Not verified'
            }
            muted={!draft.consent_otp_verified}
          />
        </SummaryGroup>
      </div>
    </article>
  );
}
