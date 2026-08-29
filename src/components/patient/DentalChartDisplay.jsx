import DoctorDentalChart from '../../pages/doctor/components/DoctorDentalChart';
import { hasDentalCharting } from '../../pages/doctor/dentalChartConfig';

export default function DentalChartDisplay({ charting, compact = false }) {
  if (!hasDentalCharting(charting)) return null;

  return (
    <div className={compact ? 'mt-2' : 'mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3'}>
      {!compact ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
          Digital dental chart
        </p>
      ) : null}
      <DoctorDentalChart value={charting} readOnly />
    </div>
  );
}
