import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Menu, X, Activity } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed w-full z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-primary">Smart<span className="text-foreground">EMR</span></span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.user_type === 'patient' && (
                  <div className="flex items-center gap-2">
                    <Link to="/patient" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                    <Link to="/patient/meetings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Meetings</Link>
                    <Link to="/patient/doctors" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Find Doctors</Link>
                    <Link to="/patient/documents" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documents</Link>
                    <Link to="/patient/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
                    <Link to="/patient/analytics" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
                  </div>
                )}
                {user.user_type === 'doctor' && (
                  <div className="flex items-center gap-2">
                    <Link to="/doctor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                    <Link to="/doctor/meetings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Meetings</Link>
                    <Link to="/doctor/analytics" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
                    <Link to="/doctor/documents" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documents</Link>
                  </div>
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {user.full_name}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Login
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground p-2 rounded-md hover:bg-secondary/50 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    {user.full_name}
                  </div>
                  {user.user_type === 'patient' && (
                    <>
                      <Link to="/patient" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Dashboard</Link>
                      <Link to="/patient/meetings" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Meetings</Link>
                      <Link to="/patient/doctors" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Find Doctors</Link>
                      <Link to="/patient/documents" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Documents</Link>
                      <Link to="/patient/profile" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Profile</Link>
                      <Link to="/patient/analytics" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Analytics</Link>
                    </>
                  )}
                  {user.user_type === 'doctor' && (
                    <>
                      <Link to="/doctor" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Dashboard</Link>
                      <Link to="/doctor/meetings" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Meetings</Link>
                      <Link to="/doctor/analytics" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Analytics</Link>
                      <Link to="/doctor/documents" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">Documents</Link>
                    </>
                  )}
                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base text-foreground font-medium hover:bg-secondary/50"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}