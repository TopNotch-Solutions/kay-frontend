import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/auth';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import RequireAuth from './components/RequireAuth';
import FrontOfficeLayout from './pages/front_office/FrontOfficeLayout';
import FrontOfficeDashboardPage from './pages/front_office/FrontOfficeDashboardPage';
import PatientRegistrationStep1Page from './pages/front_office/PatientRegistrationStep1Page';
import PatientRegistrationStep2Page from './pages/front_office/PatientRegistrationStep2Page';
import PatientRegistrationStep3Page from './pages/front_office/PatientRegistrationStep3Page';
import PatientRegistrationStep4Page from './pages/front_office/PatientRegistrationStep4Page';
import PatientEhrPage from './pages/front_office/PatientEhrPage';
import TodaysRegistrationsPage from './pages/front_office/TodaysRegistrationsPage';
import DoctorPage from './pages/doctor';
import SystemAdminPage from './pages/system_admin';

function RoleRoute({ role, children }) {
  return <RequireAuth role={role}>{children}</RequireAuth>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/front_office"
          element={
            <RoleRoute role="front_office">
              <FrontOfficeLayout />
            </RoleRoute>
          }
        >
          <Route index element={<FrontOfficeDashboardPage />} />
          <Route path="today" element={<TodaysRegistrationsPage />} />
          <Route path="registration/step-1" element={<PatientRegistrationStep1Page />} />
          <Route path="registration/step-2" element={<PatientRegistrationStep2Page />} />
          <Route path="registration/step-3" element={<PatientRegistrationStep3Page />} />
          <Route path="registration/step-4" element={<PatientRegistrationStep4Page />} />
          <Route path="patient/:patientId" element={<PatientEhrPage />} />
        </Route>
        <Route
          path="/doctor"
          element={
            <RoleRoute role="doctor">
              <DoctorPage />
            </RoleRoute>
          }
        />
        <Route
          path="/system_admin"
          element={
            <RoleRoute role="system_admin">
              <SystemAdminPage />
            </RoleRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
