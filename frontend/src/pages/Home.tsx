import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import {
  Mail, Lock, User, Hash, Eye, EyeOff, Loader2, X
} from 'lucide-react';
import { HeroSection } from '../components/blocks/hero-section-5';
import FeaturesSectionDemo from '../components/ui/features-section-demo-3';
import rheumatologyGif from '../assets/Rheumatology.gif';
import patientVid from '../assets/Smart_EMR_video_demonstration_202607280210.mp4';
import doctorVid from '../assets/Doctor_workflow_medical_software…_202607281412.mp4';

type View = 'landing' | 'login' | 'signup-patient' | 'signup-doctor';

export default function Home() {
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('landing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gifKey, setGifKey] = useState(Date.now());

  useEffect(() => {
    if (view !== 'landing') {
      setGifKey(Date.now());
    }
  }, [view]);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Patient signup
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
  // Doctor signup
  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dPassword, setDPassword] = useState('');
  const [dLicense, setDLicense] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.user_type === 'doctor' ? '/doctor' : '/patient');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: loginEmail, password: loginPassword });
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
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
        phone: '0000000000', date_of_birth: '1990-01-01', gender: 'other', blood_group: 'O+'
      });
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Email might be in use.');
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
        phone: '0000000000', specialization: 'General',
        license_number: dLicense, hospital_name: ''
      });
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Email might be in use.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-zinc-500";
  const btnAuth = "w-full py-3 mt-6 bg-white hover:bg-zinc-200 text-black rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center";

  const patientVideoRef = useRef<HTMLVideoElement | null>(null);
  const patientVideoInView = useInView(patientVideoRef, { margin: "200px 0px" });
  const doctorVideoRef = useRef<HTMLVideoElement | null>(null);
  const doctorVideoInView = useInView(doctorVideoRef, { margin: "200px 0px" });

  useEffect(() => {
    if (patientVideoRef.current) {
      try {
        if (patientVideoInView && patientVideoRef.current.paused) {
          patientVideoRef.current.play().catch(() => {});
        } else if (!patientVideoInView && !patientVideoRef.current.paused) {
          patientVideoRef.current.pause();
        }
      } catch (e) {}
    }
  }, [patientVideoInView]);

  useEffect(() => {
    if (doctorVideoRef.current) {
      try {
        if (doctorVideoInView && doctorVideoRef.current.paused) {
          doctorVideoRef.current.play().catch(() => {});
        } else if (!doctorVideoInView && !doctorVideoRef.current.paused) {
          doctorVideoRef.current.pause();
        }
      } catch (e) {}
    }
  }, [doctorVideoInView]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center w-full">
      {/* Background blobs for aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000 pointer-events-none" />

      {/* ── Always Display Landing ── */}
      <div className="w-full min-h-screen z-10 bg-background overflow-x-hidden relative">
        <HeroSection setView={setView} />
        <FeaturesSectionDemo />
        <div id="doctors" className="w-full py-24 bg-[#0a0a0a] flex flex-col items-center justify-center border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 mix-blend-screen pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-6 z-10 w-full flex flex-col lg:flex-row-reverse items-center gap-12">
                <div className="lg:w-1/2 text-left">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Supercharge your Clinical Workflow</h2>
                    <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
                        Smart EMR acts as your ambient co-pilot. Focus entirely on your patient while our AI handles the documentation, structures the clinical notes, and suggests diagnosis codes in real-time.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <button 
                            onClick={() => setView('signup-doctor')}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-xl shadow-primary/20"
                        >
                            Register as Clinician
                        </button>
                    </div>
                </div>
                <div className="lg:w-1/2 w-full">
                    <div className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(50,150,255,0.15)] border border-white/10 aspect-[16/9] bg-black">
                       
                        <video 
                            src={doctorVid}
                            ref={(el) => { 
                                if (el) {
                                    el.playbackRate = 0.75;
                                }
                                doctorVideoRef.current = el;
                            }}
                            className="w-full h-full object-cover"
                            loop
                            muted 
                            playsInline
                            preload="metadata"
                        />
                    </div>
                </div>
            </div>
            {/* Highlight Cards */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 z-10">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Ambient Scribe</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">Automatically transcribe and structure entire patient visits into SOAP notes.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Global Telehealth</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">Conduct secure, latency-free video consultations with live AI transcription feeds.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Smart Dashboard</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">View compiled patient histories and AI analytics instantly in a unified interface.</p>
                </div>
            </div>
        </div>
        <div id="patients" className="w-full py-24 bg-[#050505] flex flex-col items-center justify-center border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 mix-blend-screen pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-6 z-10 w-full flex flex-col lg:flex-row items-center gap-12">
                <div className="lg:w-1/2 text-left">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Focus on your Health, Not the Screen</h2>
                    <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
                        Smart EMR transforms how you interact with your medical history. Experience zero-click ambient consultations, beautifully transparent patient dashboards, and seamlessly connected telemedicine appointments.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <button 
                            onClick={() => setView('signup-patient')}
                            className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-colors shadow-xl shadow-white/10"
                        >
                            Register as Patient
                        </button>
                    </div>
                </div>
                <div className="lg:w-1/2 w-full">
                    <div className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(50,150,255,0.15)] border border-white/10 aspect-[16/9] bg-black">
                       
                        <video 
                            src={patientVid}
                            ref={(el) => { 
                                if (el) {
                                    el.playbackRate = 0.75;
                                }
                                patientVideoRef.current = el;
                            }}
                            className="w-full h-full object-cover"
                            loop
                            muted 
                            playsInline
                            preload="metadata"
                        />
                    </div>
                </div>
            </div>
            {/* Highlight Cards */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 z-10">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Automated EMR Tracking</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">Our ambient AI captures your consultation naturally and updates your history instantly.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Clear Telehealth</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">Connect to your doctor via crystal-clear integrated video appointments from anywhere.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                   <h3 className="text-xl font-bold text-white mb-2">Instant Summaries</h3>
                   <p className="text-sm text-zinc-400 leading-relaxed">Walk away with an AI-generated, easy-to-understand breakdown of what you need to do next.</p>
                </div>
            </div>
        </div>
      </div>

      {/* ── Modals Layer ── */}
      <AnimatePresence>
        {view !== 'landing' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.95 }}
              className="w-full max-w-[900px] bg-[#0a0a0a] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative"
            >
              {/* Left Image Section */}
              <div className="hidden md:block w-1/2 relative bg-zinc-900 overflow-hidden">
                 <img src={`${rheumatologyGif}?t=${gifKey}`} className="absolute inset-0 w-full h-full object-cover" alt="Medical Animation" key={gifKey} />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/50 via-transparent to-transparent" />
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/50" />
              </div>

              {/* Right Forms Section */}
              <div className="w-full md:w-1/2 p-8 lg:p-12 relative flex flex-col justify-center min-h-[500px] max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <button onClick={() => { setView('landing'); setError(''); }} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors z-10">
                    <X className="w-5 h-5" />
                 </button>

                 {/* LOGIN VIEW */}
                 {view === 'login' && (
                    <div className="w-full max-w-sm mx-auto relative z-10">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Sign in</h2>
                            <p className="text-sm text-zinc-400">Welcome back! Please sign in to continue</p>
                        </div>
                        
                        <button className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center gap-3 text-white text-sm font-medium transition-colors mb-6">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Google
                        </button>

                        <div className="relative flex items-center mb-6">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-xs text-zinc-500 uppercase tracking-widest">or sign in with email</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        {error && <div className="mb-4 text-red-400 text-sm text-center">{error}</div>}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input type="email" placeholder="Email id" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className={inputCls} />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className={inputCls} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2 px-1">
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                                    <input type="checkbox" className="rounded bg-white/10 border-transparent text-white focus:ring-0 w-3 h-3" />
                                    Remember me
                                </label>
                                <a href="#" className="text-xs text-zinc-400 hover:text-zinc-200 decoration-zinc-500 underline underline-offset-4">Forgot password?</a>
                            </div>
                            <button type="submit" disabled={loading} className={btnAuth}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Login'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-zinc-400 mt-8">
                            Don't have an account? <span className="text-white hover:text-zinc-200 cursor-pointer font-medium" onClick={() => setView('signup-patient')}>Sign up</span>
                        </p>
                    </div>
                 )}

                 {/* PATIENT SIGNUP VIEW */}
                 {view === 'signup-patient' && (
                    <div className="w-full max-w-sm mx-auto relative z-10 p-1">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Patient Sign up</h2>
                            <p className="text-sm text-zinc-400">Join Smart EMR as a patient</p>
                        </div>
                        {error && <div className="mb-4 text-red-400 text-sm text-center">{error}</div>}
                        <form onSubmit={handlePatientSignup} className="space-y-4">
                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input placeholder="Full Name *" value={pName} onChange={(e) => setPName(e.target.value)} required className={inputCls} /></div>
                            <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="email" placeholder="Email id *" value={pEmail} onChange={(e) => setPEmail(e.target.value)} required className={inputCls} /></div>
                            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="password" placeholder="Password *" value={pPassword} onChange={(e) => setPPassword(e.target.value)} required minLength={6} className={inputCls} /></div>
                            <button type="submit" disabled={loading} className={btnAuth}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Register'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-zinc-400 mt-8">
                            Already have an account? <span onClick={() => setView('login')} className="text-white hover:text-zinc-300 font-medium cursor-pointer">Log in</span>
                        </p>
                    </div>
                 )}

                 {/* DOCTOR SIGNUP VIEW */}
                 {view === 'signup-doctor' && (
                    <div className="w-full max-w-sm mx-auto relative z-10 p-1">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold text-white mb-2">Doctor Sign up</h2>
                            <p className="text-sm text-zinc-400">Join Smart EMR as a clinician</p>
                        </div>
                        {error && <div className="mb-4 text-red-400 text-sm text-center">{error}</div>}
                        <form onSubmit={handleDoctorSignup} className="space-y-4">
                            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input placeholder="Full Name *" value={dName} onChange={(e) => setDName(e.target.value)} required className={inputCls} /></div>
                            <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="email" placeholder="Email id *" value={dEmail} onChange={(e) => setDEmail(e.target.value)} required className={inputCls} /></div>
                            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input type="password" placeholder="Password *" value={dPassword} onChange={(e) => setDPassword(e.target.value)} required minLength={6} className={inputCls} /></div>
                            <div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input placeholder="License Number *" value={dLicense} onChange={(e) => setDLicense(e.target.value)} required className={inputCls} /></div>
                            <button type="submit" disabled={loading} className={btnAuth}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Register'}
                            </button>
                        </form>
                        <p className="text-center text-sm text-zinc-400 mt-8">
                            Already have an account? <span onClick={() => setView('login')} className="text-white hover:text-zinc-300 font-medium cursor-pointer">Log in</span>
                        </p>
                    </div>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}