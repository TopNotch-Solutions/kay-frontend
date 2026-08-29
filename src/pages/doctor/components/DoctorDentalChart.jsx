import { useState } from 'react';
import {
  COMPLETED_TREATMENT_SECTIONS,
  DENTAL_CONDITIONS,
  PRE_TREATMENT_SECTIONS,
  normalizeDentalCharting,
  toothKey,
} from '../dentalChartConfig';

function ToothGrid({ section, phaseKey, charting, activeTool, onToothClick, readOnly = false }) {
  const teethMap = charting?.[phaseKey]?.[section.id] || {};

  return (
    <div
      className={`grid gap-1 ${section.narrow ? 'mx-auto w-full max-w-md' : 'w-full'}`}
      style={{ gridTemplateColumns: `repeat(${section.cols}, minmax(0, 1fr))` }}
    >
      {section.teeth.map((label, index) => {
        const key = toothKey(section.id, index, label);
        const condition = teethMap[key];
        const conditionMeta = DENTAL_CONDITIONS.find((c) => c.value === condition);
        return (
          <button
            key={`${section.id}-${index}`}
            type="button"
            disabled={readOnly}
            title={conditionMeta ? `${label}: ${conditionMeta.label}` : label}
            className={`flex h-11 flex-col justify-between border border-slate-600 p-0.5 text-[10px] font-medium text-slate-800 transition-colors ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-cyan-50'
            } ${conditionMeta ? conditionMeta.toothClass : 'bg-white'}`}
            onClick={() => !readOnly && onToothClick(phaseKey, section.id, key, condition)}
          >
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartPhase({ title, phaseKey, sections, charting, activeTool, onToothClick, readOnly }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4">
      <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-600">{title}</p>
      {phaseKey === 'pre_treatment' ? (
        <p className="mt-1 text-center text-[11px] font-semibold text-slate-500">
          Patient&apos;s right &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Patient&apos;s left
        </p>
      ) : null}
      <div className="mt-3 space-y-3">
        {sections.map((section) => (
          <div key={`${phaseKey}-${section.id}`}>
            {sections.length > 1 ? (
              <p className="mb-1 text-center text-[11px] font-medium text-slate-500">{section.label}</p>
            ) : null}
            <ToothGrid
              section={section}
              phaseKey={phaseKey}
              charting={charting}
              activeTool={activeTool}
              onToothClick={onToothClick}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorDentalChart({ value, onChange, readOnly = false }) {
  const [activeTool, setActiveTool] = useState('filling');
  const charting = normalizeDentalCharting(value);

  function handleToothClick(phaseKey, sectionId, key, currentCondition) {
    if (readOnly || !onChange) return;
    const next = normalizeDentalCharting(charting);
    const sectionTeeth = { ...(next[phaseKey][sectionId] || {}) };
    if (sectionTeeth[key] === activeTool) {
      delete sectionTeeth[key];
    } else {
      sectionTeeth[key] = activeTool;
    }
    next[phaseKey] = { ...next[phaseKey], [sectionId]: sectionTeeth };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {DENTAL_CONDITIONS.map((item) => (
          <span key={item.value} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
            <span className={`inline-block h-4 w-4 border border-slate-600 ${item.legendClass}`} aria-hidden />
            {item.label}
          </span>
        ))}
      </div>

      {!readOnly ? (
        <div className="text-center">
          <label htmlFor="dental-chart-tool" className="text-sm font-semibold text-slate-800">
            Select condition / treatment tool:{' '}
          </label>
          <select
            id="dental-chart-tool"
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={activeTool}
            onChange={(e) => setActiveTool(e.target.value)}
          >
            {DENTAL_CONDITIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ChartPhase
        title="Pre-treatment condition"
        phaseKey="pre_treatment"
        sections={PRE_TREATMENT_SECTIONS}
        charting={charting}
        activeTool={activeTool}
        onToothClick={handleToothClick}
        readOnly={readOnly}
      />

      <ChartPhase
        title="Completed treatment"
        phaseKey="completed_treatment"
        sections={COMPLETED_TREATMENT_SECTIONS}
        charting={charting}
        activeTool={activeTool}
        onToothClick={handleToothClick}
        readOnly={readOnly}
      />
    </div>
  );
}
