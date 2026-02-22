import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from './features/auth/AuthPage';
import OnboardingPage from './features/onboarding/OnboardingPage';
import DoctorDashboard from './features/dashboard/DoctorDashboard';
import PatientDashboard from './features/dashboard/PatientDashboard';
import MeetingRoom from './pages/MeetingRoom';
import OAuthCallback from './pages/OAuthCallback';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user } = useAuth();
  const needsOnboarding = user?.user_type === 'patient' && localStorage.getItem('needs_onboarding') === 'true';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <AuthPage /> : <Navigate to={`/dashboard/${user.user_type}`} replace />} />
        <Route path="/onboarding" element={needsOnboarding ? <OnboardingPage /> : <Navigate to="/dashboard/patient" replace />} />
        <Route path="/dashboard/doctor" element={user?.user_type === 'doctor' ? <DoctorDashboard /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/patient" element={user?.user_type === 'patient' ? (needsOnboarding ? <Navigate to="/onboarding" replace /> : <PatientDashboard />) : <Navigate to="/" replace />} />
        {/* Meeting room — doctors record consultations here */}
        <Route path="/meeting/:appointmentId" element={user?.user_type === 'doctor' ? <MeetingRoom /> : <Navigate to="/" replace />} />
        {/* Google OAuth callback — opens in popup, exchanges code, closes itself */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
