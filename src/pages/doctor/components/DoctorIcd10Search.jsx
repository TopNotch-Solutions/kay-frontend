import { useEffect, useRef, useState } from 'react';
import { searchIcd10Codes } from '../../../api/icd10';
import { IntakeInput } from '../../nurse/components/IntakeField';
import { nurse as c } from '../../nurse/styles/nurseClasses';

/**
 * ICD-10 autocomplete backed by kay-one-backend /api/v1/icd10.
 */
export default function DoctorIcd10Search({
  value,
  onChange,
  onSelect,
  error,
  id = 'doc-icd',
}) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = value.trim();
    if (!open || q.length < 1) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError('');
    const timer = setTimeout(() => {
      searchIcd10Codes(q, { limit: 25 })
        .then((rows) => {
          if (!cancelled) setResults(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (!cancelled) {
            setResults([]);
            setSearchError(err.message || 'Could not search ICD-10 codes.');
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, open]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handleSelect(row) {
    onSelect?.({ code: row.code, description: row.description });
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={wrapRef} className="relative">
      <IntakeInput
        id={id}
        label="ICD-10 code or diagnosis"
        required={false}
        showRequiredMark={false}
        error={error}
        className={c.input}
        placeholder="Search by code or description, e.g. K02.9 or caries"
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-results`}
      />
      {open && value.trim() ? (
        <div
          id={`${id}-results`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {searching ? (
            <p className="px-3 py-2 text-xs text-slate-500">Searching ICD-10 codes…</p>
          ) : searchError ? (
            <p className="px-3 py-2 text-xs text-red-600" role="alert">
              {searchError}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No matching ICD-10 codes in catalog.</p>
          ) : (
            <ul className="py-1">
              {results.map((row) => (
                <li key={row.code}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-teal-50"
                    onClick={() => handleSelect(row)}
                  >
                    <span className="font-semibold text-slate-900">{row.code}</span>
                    <span className="text-xs text-slate-600">{row.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
