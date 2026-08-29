export const UPPER_ADULT_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ADULT_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const DECIDUOUS_ARCH = ['E', 'D', 'C', 'B', 'A', 'A', 'B', 'C', 'D', 'E'];

export const DENTAL_CONDITIONS = [
  { value: 'filling', label: 'Filling', legendClass: 'bg-sky-200', toothClass: 'bg-sky-200 border-sky-400' },
  { value: 'caries', label: 'Caries', legendClass: 'bg-slate-300', toothClass: 'bg-slate-300 border-slate-500' },
  { value: 'extracted', label: 'Extracted', legendClass: 'bg-orange-200', toothClass: 'bg-orange-200 border-orange-400 line-through' },
  { value: 'rootcanal', label: 'Root Canal', legendClass: 'bg-purple-200', toothClass: 'bg-purple-200 border-purple-400' },
];

export const CONDITION_LABELS = Object.fromEntries(
  DENTAL_CONDITIONS.map((c) => [c.value, c.label])
);

export const PRE_TREATMENT_SECTIONS = [
  { id: 'upper_adult', label: 'Upper arch (adult)', teeth: UPPER_ADULT_TEETH, cols: 16, narrow: false },
  { id: 'upper_deciduous', label: 'Upper arch (deciduous)', teeth: DECIDUOUS_ARCH, cols: 10, narrow: true },
  { id: 'lower_deciduous', label: 'Lower arch (deciduous)', teeth: DECIDUOUS_ARCH, cols: 10, narrow: true },
  { id: 'lower_adult', label: 'Lower arch (adult)', teeth: LOWER_ADULT_TEETH, cols: 16, narrow: false },
];

export const COMPLETED_TREATMENT_SECTIONS = [
  { id: 'upper_adult', label: 'Upper arch (adult)', teeth: UPPER_ADULT_TEETH, cols: 16, narrow: false },
  { id: 'lower_adult', label: 'Lower arch (adult)', teeth: LOWER_ADULT_TEETH, cols: 16, narrow: false },
];

export function toothKey(sectionId, index, label) {
  if (sectionId.includes('deciduous')) return String(index);
  return String(label);
}

export function emptyDentalCharting() {
  return {
    pre_treatment: {},
    completed_treatment: {},
  };
}

const VALID_CONDITIONS = new Set(DENTAL_CONDITIONS.map((c) => c.value));

function cleanTeethMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  Object.entries(raw).forEach(([key, condition]) => {
    if (VALID_CONDITIONS.has(condition)) out[String(key)] = condition;
  });
  return out;
}

export function normalizeDentalCharting(raw) {
  if (!raw || typeof raw !== 'object') return emptyDentalCharting();
  const pre = raw.pre_treatment || {};
  const completed = raw.completed_treatment || {};
  return {
    pre_treatment: {
      upper_adult: cleanTeethMap(pre.upper_adult),
      upper_deciduous: cleanTeethMap(pre.upper_deciduous),
      lower_deciduous: cleanTeethMap(pre.lower_deciduous),
      lower_adult: cleanTeethMap(pre.lower_adult),
    },
    completed_treatment: {
      upper_adult: cleanTeethMap(completed.upper_adult),
      lower_adult: cleanTeethMap(completed.lower_adult),
    },
  };
}

export function hasDentalCharting(charting) {
  const normalized = normalizeDentalCharting(charting);
  const countPhase = (phase) =>
    Object.values(phase || {}).reduce((sum, teeth) => sum + Object.keys(teeth || {}).length, 0);
  return countPhase(normalized.pre_treatment) + countPhase(normalized.completed_treatment) > 0;
}

export function formatDentalChartingSummary(charting) {
  const normalized = normalizeDentalCharting(charting);
  const lines = [];

  function appendPhase(phaseKey, phaseLabel, sections) {
    sections.forEach((section) => {
      const teeth = normalized[phaseKey]?.[section.id] || {};
      Object.entries(teeth).forEach(([key, condition]) => {
        const index = Number(key);
        const toothLabel = section.id.includes('deciduous') && !Number.isNaN(index)
          ? section.teeth[index] ?? key
          : key;
        lines.push({
          label: `${phaseLabel} · ${section.label}`,
          value: `Tooth ${toothLabel} — ${CONDITION_LABELS[condition] || condition}`,
        });
      });
    });
  }

  appendPhase('pre_treatment', 'Pre-treatment', PRE_TREATMENT_SECTIONS);
  appendPhase('completed_treatment', 'Completed treatment', COMPLETED_TREATMENT_SECTIONS);
  return lines;
}
