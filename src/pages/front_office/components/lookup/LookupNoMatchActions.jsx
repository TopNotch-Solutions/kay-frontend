import { fo } from '../../styles/frontOfficeModuleClasses';

export default function LookupNoMatchActions({ onRegisterNew }) {
  return (
    <section className={fo.actionGrid} aria-label="No match actions">
      <button type="button" className={fo.actionCardRegister} onClick={onRegisterNew}>
        <div className={`${fo.actionIcon} ${fo.actionIconDanger}`} aria-hidden>
          +
        </div>
        <h3 className={fo.actionTitleEmergency}>Register new patient</h3>
        <p className={fo.actionTextEmergency}>
          No match in the register. Continue with the 4-step registration workflow.
        </p>
      </button>
    </section>
  );
}
