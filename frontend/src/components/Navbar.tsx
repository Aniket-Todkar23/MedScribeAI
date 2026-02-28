import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Menu, X, Activity, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const patientLinks = [
  { to: '/patient', label: 'Dashboard', exact: true },
  { to: '/patient/meetings', label: 'Meetings' },
  { to: '/patient/doctors', label: 'Find Doctors' },
  { to: '/patient/documents', label: 'Documents' },
  { to: '/patient/profile', label: 'Profile' },
  { to: '/patient/analytics', label: 'Analytics' },
];

const doctorLinks = [
  { to: '/doctor', label: 'Dashboard', exact: true },
  { to: '/doctor/meetings', label: 'Meetings' },
  { to: '/doctor/analytics', label: 'Analytics' },
  { to: '/doctor/documents', label: 'Documents' },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinks = user?.user_type === 'doctor' ? doctorLinks : patientLinks;

  return (
    <nav className="fixed w-full z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-primary">Smart<span className="text-foreground">EMR</span></span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                {/* Nav Links */}
                <div className="flex items-center gap-0.5 bg-muted/40 rounded-full px-1 py-1 mr-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                        isActive(link.to, link.exact)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-border mx-1" />

                {/* User Identity */}
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {user.user_type === 'doctor'
                      ? <Stethoscope className="h-4 w-4 text-primary" />
                      : <User className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground leading-tight">
                      {user.user_type === 'doctor' ? 'Dr. ' : ''}{user.full_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight capitalize">
                      {user.user_type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="ml-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
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

          {/* Mobile Toggle */}
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

      {/* Mobile Menu */}
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
                  {/* Mobile User Badge */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-muted/40 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.user_type === 'doctor'
                        ? <Stethoscope className="h-4 w-4 text-primary" />
                        : <User className="h-4 w-4 text-primary" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {user.user_type === 'doctor' ? 'Dr. ' : ''}{user.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{user.user_type}</p>
                    </div>
                  </div>

                  {/* Mobile Nav Links */}
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsOpen(false)}
                      className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive(link.to, link.exact)
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}

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