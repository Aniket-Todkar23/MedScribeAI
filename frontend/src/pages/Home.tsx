import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import {
  Stethoscope, UserRound, ArrowRight, ShieldCheck, Activity,
  FileText, Bot, Mail, Lock, User, Phone, Building, Hash, Eye, EyeOff,
  AlertCircle, Loader2, ArrowLeft, Droplets, Heart,
} from 'lucide-react';

type View = 'landing' | 'login' | 'signup-patient' | 'signup-doctor';

export default function Home() {
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('landing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Patient signup
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pDob, setPDob] = useState('');
  const [pGender, setPGender] = useState('');
  const [pBlood, setPBlood] = useState('');

  // Doctor signup
  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dPassword, setDPassword] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dSpecialization, setDSpecialization] = useState('');
  const [dLicense, setDLicense] = useState('');
  const [dHospital, setDHospital] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = user.user_type === 'patient' ? '/patient' : '/doctor';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: loginEmail, password: loginPassword });
      const { access_token, refresh_token, user: u } = res.data;
      setAuth(u, access_token, refresh_token);
      navigate(u.user_type === 'patient' ? '/patient' : '/doctor');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.signupPatient({
        full_name: pName, email: pEmail, password: pPassword,
        phone: pPhone || undefined, date_of_birth: pDob || undefined,
        gender: pGender || undefined, blood_group: pBlood || undefined,
      });
      const { access_token, refresh_token, user: u } = res.data;
      setAuth(u, access_token, refresh_token);
      navigate('/patient');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.signupDoctor({
        full_name: dName, email: dEmail, password: dPassword,
        phone: dPhone || undefined, specialization: dSpecialization || undefined,
        license_number: dLicense, hospital_name: dHospital || undefined,
      });
      const { access_token, refresh_token, user: u } = res.data;
      setAuth(u, access_token, refresh_token);
      navigate('/doctor');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60";
  const btnPrimary = "w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <AnimatePresence mode="wait">
          {/* ── Landing ── */}
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center w-full">
              <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 border border-primary/20">
                <ShieldCheck className="w-4 h-4" /> HIPAA Compliant AI Platform
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
                The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Smart EMR</span> & Telehealth
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                A voice-first system that transforms clinician-patient interactions into structured data, diagnoses, and actionable insights.
              </p>

              {/* Login + signup cards */}
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-3xl mx-auto justify-center items-stretch mb-6">
                <div onClick={() => setView('login')} className="group relative flex-1 p-8 rounded-3xl glass cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Sign In</h3>
                  <p className="text-muted-foreground text-sm mb-6">Access your account as a patient or clinician.</p>
                  <div className="flex items-center text-sm font-semibold tracking-wide text-primary">
                    Login <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div onClick={() => setView('signup-patient')} className="group relative flex-1 p-8 rounded-3xl glass cursor-pointer hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UserRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">New Patient</h3>
                  <p className="text-muted-foreground text-sm mb-6">Register as a patient to access your records and AI health assistant.</p>
                  <div className="flex items-center text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                    Sign Up <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div onClick={() => setView('signup-doctor')} className="group relative flex-1 p-8 rounded-3xl glass cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">New Clinician</h3>
                  <p className="text-muted-foreground text-sm mb-6">Join as a doctor to manage patients, EMRs, and telehealth consultations.</p>
                  <div className="flex items-center text-sm font-semibold tracking-wide text-primary">
                    Sign Up <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Feature icons */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 text-sm font-medium">
                <div className="flex flex-col items-center gap-2"><Activity className="w-5 h-5" /> Live Transcriptions</div>
                <div className="flex flex-col items-center gap-2"><FileText className="w-5 h-5" /> AI Document Analysis</div>
                <div className="flex flex-col items-center gap-2"><ShieldCheck className="w-5 h-5" /> Secure Data Storage</div>
                <div className="flex flex-col items-center gap-2"><Bot className="w-5 h-5" /> LangGraph Agents</div>
              </div>
            </motion.div>
          )}

          {/* ── Login ── */}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md mx-auto">
              <button onClick={() => { setView('landing'); setError(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="glass rounded-3xl p-8 shadow-xl">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Lock className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground mt-1">Sign in to Smart EMR</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" placeholder="Email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={inputCls + ' pl-10'} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={inputCls + ' pl-10 pr-10'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-border text-center text-sm text-muted-foreground">
                  <p className="mb-2">Demo Credentials:</p>
                  <p className="font-mono text-xs">sarah.jenkins@email.com / password123</p>
                  <p className="font-mono text-xs">robert.chen@smartemr.local / password123</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Patient Signup ── */}
          {view === 'signup-patient' && (
            <motion.div key="signup-patient" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md mx-auto">
              <button onClick={() => { setView('landing'); setError(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="glass rounded-3xl p-8 shadow-xl">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <UserRound className="w-7 h-7 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold">Patient Registration</h2>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={handlePatientSignup} className="space-y-3">
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Full Name *" value={pName} onChange={(e) => setPName(e.target.value)} required className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="email" placeholder="Email *" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="password" placeholder="Password *" value={pPassword} onChange={(e) => setPPassword(e.target.value)} required minLength={6} className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Phone" value={pPhone} onChange={(e) => setPPhone(e.target.value)} className={inputCls + ' pl-10'} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" placeholder="Date of Birth" value={pDob} onChange={(e) => setPDob(e.target.value)} className={inputCls} />
                    <select value={pGender} onChange={(e) => setPGender(e.target.value)} className={inputCls}>
                      <option value="">Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="relative"><Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={pBlood} onChange={(e) => setPBlood(e.target.value)} className={inputCls + ' pl-10'}>
                      <option value="">Blood Group</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{' '}
                  <button onClick={() => { setView('login'); setError(''); }} className="text-primary font-medium hover:underline">Sign In</button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Doctor Signup ── */}
          {view === 'signup-doctor' && (
            <motion.div key="signup-doctor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md mx-auto">
              <button onClick={() => { setView('landing'); setError(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="glass rounded-3xl p-8 shadow-xl">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Stethoscope className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Clinician Registration</h2>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <form onSubmit={handleDoctorSignup} className="space-y-3">
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Full Name *" value={dName} onChange={(e) => setDName(e.target.value)} required className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="email" placeholder="Email *" value={dEmail} onChange={(e) => setDEmail(e.target.value)} required className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="password" placeholder="Password *" value={dPassword} onChange={(e) => setDPassword(e.target.value)} required minLength={6} className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Phone" value={dPhone} onChange={(e) => setDPhone(e.target.value)} className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Specialization" value={dSpecialization} onChange={(e) => setDSpecialization(e.target.value)} className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="License Number *" value={dLicense} onChange={(e) => setDLicense(e.target.value)} required className={inputCls + ' pl-10'} /></div>
                  <div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input placeholder="Hospital Name" value={dHospital} onChange={(e) => setDHospital(e.target.value)} className={inputCls + ' pl-10'} /></div>
                  <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{' '}
                  <button onClick={() => { setView('login'); setError(''); }} className="text-primary font-medium hover:underline">Sign In</button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}