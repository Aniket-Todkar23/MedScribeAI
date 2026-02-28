import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import PatientProfile from './pages/PatientProfile';
import PatientAnalytics from './pages/PatientAnalytics';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAnalytics from './pages/DoctorAnalytics';
import ConsultationEditor from './pages/ConsultationEditor';
import MeetingRoom from './pages/MeetingRoom';
import Meetings from './pages/Meetings';
import FindDoctors from './pages/FindDoctors';
import DocumentCenter from './pages/DocumentCenter';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const isPatient = user?.user_type === 'patient';
  const isDoctor = user?.user_type === 'doctor';

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      
      {/* Protected Routes */}
      <Route element={<Layout />}>
        {/* Patient Routes */}
        <Route path="/patient" element={isPatient ? <PatientDashboard /> : <Navigate to="/" />} />
        <Route path="/patient/documents" element={isPatient ? <DocumentCenter /> : <Navigate to="/" />} />
        <Route path="/patient/profile" element={isPatient ? <PatientProfile /> : <Navigate to="/" />} />
        <Route path="/patient/analytics" element={isPatient ? <PatientAnalytics /> : <Navigate to="/" />} />
        <Route path="/patient/meetings" element={isPatient ? <Meetings /> : <Navigate to="/" />} />
        <Route path="/patient/doctors" element={isPatient ? <FindDoctors /> : <Navigate to="/" />} />

        {/* Doctor Routes */}
        <Route path="/doctor" element={isDoctor ? <DoctorDashboard /> : <Navigate to="/" />} />
        <Route path="/doctor/analytics" element={isDoctor ? <DoctorAnalytics /> : <Navigate to="/" />} />
        <Route path="/doctor/documents" element={isDoctor ? <DocumentCenter /> : <Navigate to="/" />} />
        <Route path="/doctor/meetings" element={isDoctor ? <Meetings /> : <Navigate to="/" />} />
        <Route path="/doctor/consultation/:id" element={isDoctor ? <ConsultationEditor /> : <Navigate to="/" />} />

        {/* Patient Consultation View */}
        <Route path="/patient/consultation/:id" element={isPatient ? <ConsultationEditor /> : <Navigate to="/" />} />

        {/* Shared Routes */}
        <Route path="/meeting/:id" element={user ? <MeetingRoom /> : <Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
