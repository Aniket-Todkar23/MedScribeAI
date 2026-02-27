import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import PatientAgentChat from './PatientAgentChat';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user } = useAuthStore();
  
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 pt-24 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
      
      {/* Global Patient AI Assistant */}
      {user?.user_type === 'patient' && <PatientAgentChat />}
    </div>
  );
}