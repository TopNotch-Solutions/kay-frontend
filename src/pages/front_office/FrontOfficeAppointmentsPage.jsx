import { useState } from 'react';
import DoctorAppointmentsView from '../doctor/components/DoctorAppointmentsView';
import { frontOfficeAppointmentsApi } from '../../api/frontOffice';
import { lookup } from './styles/lookupClasses';

export default function FrontOfficeAppointmentsPage() {
  const [toast, setToast] = useState('');

  return (
    <div className={lookup.page}>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className={lookup.hero}>
        <div className={lookup.heroInner}>
          <p className={lookup.heroKicker}>Front office</p>
          <h1 className={lookup.heroTitle}>Doctor appointments</h1>
          <p className={lookup.heroMeta}>
            View upcoming follow-up visits, cancel or reschedule on behalf of patients, and keep a
            record of who made each change.
          </p>
        </div>
      </section>

      <DoctorAppointmentsView
        onToast={setToast}
        api={frontOfficeAppointmentsApi}
        showDoctorColumn
        supportsDoctorFilter
        scheduleKicker="Clinic schedule"
        scheduleTitle="Doctor follow-up appointments"
        scheduleDescription="Upcoming return visits scheduled by doctors. Cancelling or rescheduling sends the patient an SMS and records your name in the appointment history."
      />
    </div>
  );
}
