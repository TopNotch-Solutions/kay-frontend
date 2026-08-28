import { useCallback, useEffect, useState } from 'react';
import {
  listPatients,
  searchPatients,
  getPatient,
  getClinicalMedicalHistory,
} from '../../api/patients';
import LookupSearchCard from '../../pages/front_office/components/lookup/LookupSearchCard';
import { lookup } from '../../pages/front_office/styles/lookupClasses';
import { patientName } from '../../pages/front_office/patientUtils';
import {
  formatPatientId,
  formatSexAge,
  patientDisplayName,
} from '../../pages/nurse/nurseQueueUtils';
import MedicalHistoryBook from './MedicalHistoryBook';
import DoctorPatientResultCard from './DoctorPatientResultCard';
import QueueEntryCard from '../queue/QueueEntryCard';
import { nurse as c } from '../../pages/nurse/styles/nurseClasses';

const PAGE_SIZE = 20;

function validateSearch({ searchMode, nationalId, dob, name }) {
  if (searchMode === 'id') {
    if (!nationalId.trim()) return 'Enter a national ID number.';
    return '';
  }
  if (!dob) return 'Enter date of birth.';
  if (!name.trim()) return 'Enter the patient name.';
  return '';
}

function PatientListPagination({ pagination, loading, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
      <span className="tabular-nums">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={c.btnSecondary}
          disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className={c.btnSecondary}
          disabled={loading || pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function DoctorPatientRecordLookup({ showStatSummaryButton = true }) {
  const [searchMode, setSearchMode] = useState('id');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [name, setName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');

  const loadPatientList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const { patients: rows, pagination: meta } = await listPatients({
        page,
        limit: PAGE_SIZE,
      });
      setPatients(rows);
      setPagination(meta);
    } catch (err) {
      setListError(err.message || 'Failed to load patients.');
      setPatients([]);
      setPagination({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
    } finally {
      setListLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPatientList();
  }, [loadPatientList]);

  function handleSearchModeChange(mode) {
    setSearchMode(mode);
    setSearchError('');
  }

  async function handleSearch(e) {
    e.preventDefault();
    const validationError = validateSearch({ searchMode, nationalId, dob, name });
    if (validationError) {
      setSearchError(validationError);
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
    setHasSearched(true);

    const params =
      searchMode === 'id'
        ? { id_number: nationalId.trim() }
        : { date_of_birth: dob, name: name.trim() };

    try {
      const data = await searchPatients(params);
      const list = data.patients || [];
      setSearchResults(list);
      if (list.length === 0) {
        setSearchError('No patients matched your search. Check the ID or name and try again.');
      } else if (list.length === 1) {
        await openPatientRecord(list[0]);
      }
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
    } finally {
      setSearchLoading(false);
    }
  }

  async function openPatientRecord(p) {
    const id = p.id;
    if (!id) return;
    setSelectedPatientId(id);
    setRecordLoading(true);
    setRecordError('');
    setPatient(null);
    setHistory(null);

    try {
      const [patientRow, historyRow] = await Promise.all([
        getPatient(id),
        getClinicalMedicalHistory(id),
      ]);
      setPatient(patientRow);
      setHistory(historyRow);
    } catch (err) {
      setRecordError(err.message || 'Failed to load patient record.');
      setSelectedPatientId(null);
    } finally {
      setRecordLoading(false);
    }
  }

  function clearSelection() {
    setSelectedPatientId(null);
    setPatient(null);
    setHistory(null);
    setRecordError('');
  }

  const totalRegistered = pagination.total ?? 0;
  const recordOpen = Boolean(selectedPatientId);
  const showSearchMatches = !recordOpen && hasSearched && searchResults.length > 1;

  return (
    <div className={c.body}>
      <aside className={c.queueAside} aria-label="Registered patients">
        <h2 className={c.queueTitle}>Registered patients</h2>
        <p className={c.queueSub}>
          <span className={c.queueCount}>{totalRegistered}</span>
          patient{totalRegistered === 1 ? '' : 's'} registered
        </p>

        {listError ? (
          <p className={`${c.hint} mt-2 text-red-600`} role="alert">
            {listError}
          </p>
        ) : null}

        <div className={c.queueList}>
          {listLoading ? (
            <p className={c.hint}>Loading patients…</p>
          ) : patients.length === 0 ? (
            <p className={c.hint}>No patients registered yet.</p>
          ) : (
            patients.map((p) => {
              const displayName = patientDisplayName(p);
              const active = p.id === selectedPatientId;
              const busy = recordLoading && active;
              return (
                <QueueEntryCard
                  key={p.id}
                  classes={c}
                  name={displayName}
                  meta={formatSexAge(p)}
                  idLabel={formatPatientId(p)}
                  active={active}
                  disabled={busy}
                  onClick={() => openPatientRecord(p)}
                  openLabel="Open medical record"
                  activeLabel="Record open"
                />
              );
            })
          )}
        </div>

        <PatientListPagination
          pagination={pagination}
          loading={listLoading}
          onPageChange={setPage}
        />
      </aside>

      <div className={c.main}>
        <div className="mb-4 shrink-0 space-y-4">
          {recordOpen ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Medical history book
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {patient ? (
                    <>
                      <span className="font-semibold text-slate-800">{patientName(patient)}</span>
                      {patient.patient_number ? (
                        <>
                          {' · '}
                          <span className="font-mono">{patient.patient_number}</span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    'Loading patient record…'
                  )}
                </p>
              </div>
              <button
                type="button"
                className={c.btnSecondary}
                disabled={recordLoading}
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Patient record search
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search by national ID or date of birth and name, or select a patient from the list.
                </p>
              </div>

              <LookupSearchCard
                searchMode={searchMode}
                onSearchModeChange={handleSearchModeChange}
                nationalId={nationalId}
                onNationalIdChange={setNationalId}
                dob={dob}
                onDobChange={setDob}
                name={name}
                onNameChange={setName}
                onSubmit={handleSearch}
                loading={searchLoading}
              />

              {searchError ? (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {searchError}
                </p>
              ) : null}

              {showSearchMatches ? (
                <section className={lookup.resultsPanel} aria-labelledby="doctor-record-results-title">
                  <header className={lookup.resultsHead}>
                    <div>
                      <h3 id="doctor-record-results-title" className={lookup.resultsTitle}>
                        Matching patients
                      </h3>
                      <p className={lookup.resultsSubtitle}>
                        {searchResults.length} matches — choose a patient to open their medical
                        history book.
                      </p>
                    </div>
                  </header>
                  <div className="grid gap-4 md:grid-cols-2">
                    {searchResults.map((p) => (
                      <DoctorPatientResultCard
                        key={p.id}
                        patient={p}
                        selected={false}
                        loading={recordLoading}
                        onOpen={openPatientRecord}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MedicalHistoryBook
            patient={selectedPatientId ? patient : null}
            history={history}
            loading={recordLoading}
            error={recordError}
            showStatSummaryButton={showStatSummaryButton}
            interactive
            compact
          />
        </div>
      </div>
    </div>
  );
}
