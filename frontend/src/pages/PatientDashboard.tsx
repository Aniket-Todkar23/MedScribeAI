import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { patientApi, appointmentApi, consultationApi, doctorApi } from '../lib/api';
import type { AppointmentResponse, DoctorListItem } from '../lib/types';
import { format, parseISO, isPast, isFuture, differenceInDays, differenceInHours } from 'date-fns';
import {
  Calendar, FileText, Activity, ChevronRight, Clock, Video, Users,
  Heart, Pill, TrendingUp, Plus, Loader2, CheckCircle2,
  BarChart3, Thermometer, Droplets, Wind, AlertTriangle, X,
} from 'lucide-react';

/* ── Vital Status Helper ── */
function getVitalStatus(type: string, value: string | undefined) {
  if (!value) return { status: 'unknown' as const, color: 'text-muted-foreground' };
  const num = parseFloat(value.replace(/[^\d.]/g, ''));
  if (isNaN(num)) return { status: 'normal' as const, color: 'text-green-600' };

  switch (type) {
    case 'heart_rate':
      if (num < 60) return { status: 'low' as const, color: 'text-blue-600' };
      if (num > 100) return { status: 'high' as const, color: 'text-red-600' };
      return { status: 'normal' as const, color: 'text-green-600' };
    case 'spo2':
      if (num < 95) return { status: 'low' as const, color: 'text-red-600' };
      return { status: 'normal' as const, color: 'text-green-600' };
    case 'temperature': {
      const f = num < 50 ? num * 9 / 5 + 32 : num; // handle celsius
      if (f > 100.4) return { status: 'high' as const, color: 'text-red-600' };
      if (f < 97) return { status: 'low' as const, color: 'text-blue-600' };
      return { status: 'normal' as const, color: 'text-green-600' };
    }
    case 'blood_pressure': {
      const sys = parseInt(value.split('/')[0]);
      if (isNaN(sys)) return { status: 'normal' as const, color: 'text-green-600' };
      if (sys >= 140) return { status: 'high' as const, color: 'text-red-600' };
      if (sys < 90) return { status: 'low' as const, color: 'text-blue-600' };
      return { status: 'normal' as const, color: 'text-green-600' };
    }
    default:
      return { status: 'normal' as const, color: 'text-green-600' };
  }
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showBooking, setShowBooking] = useState(false);

  // Booking form
  const [bookDoctorId, setBookDoctorId] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00');
  const [bookType, setBookType] = useState('in_person');
  const [bookReason, setBookReason] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['patientProfile'],
    queryFn: () => patientApi.getMe().then(r => r.data),
  });

  const { data: onboarding } = useQuery({
    queryKey: ['patientOnboarding'],
    queryFn: () => patientApi.getOnboarding().then(r => r.data).catch(() => null),
  });

  const { data: appointments = [], isLoading: aptsLoading } = useQuery({
    queryKey: ['patientAppointments'],
    queryFn: () => appointmentApi.getAll().then(r => r.data),
  });

  const patientId = profile?.patient_id || user?.id;

  const { data: consultations = [] } = useQuery({
    queryKey: ['patientConsultations', patientId],
    queryFn: () => consultationApi.getByPatient(patientId!).then(r => r.data),
    enabled: !!patientId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['allDoctors'],
    queryFn: () => doctorApi.getAll().then(r => r.data),
  });

  const bookMutation = useMutation({
    mutationFn: () => appointmentApi.create({
      doctor_id: bookDoctorId,
      appointment_date: `${bookDate}T${bookTime}:00`,
      duration_minutes: 30,
      appointment_type: bookType,
      reason: bookReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
      setShowBooking(false);
      setBookDoctorId(''); setBookDate(''); setBookReason('');
    },
  });

  const upcomingApts = appointments.filter((a: AppointmentResponse) => isFuture(parseISO(a.appointment_date)) && a.status !== 'cancelled');
  const pastApts = appointments.filter((a: AppointmentResponse) => isPast(parseISO(a.appointment_date)));
  const cancelledCount = appointments.filter((a: AppointmentResponse) => a.status === 'cancelled').length;

  const hasConditions = onboarding && (onboarding.has_diabetes || onboarding.has_heart_disease || onboarding.has_lung_disease);

  // Latest vitals from most recent consultation
  const latestConsultation = consultations[0];
  const vitals = latestConsultation?.emr_data?.vitals;

  // Next appointment
  const nextApt = upcomingApts.sort((a: AppointmentResponse, b: AppointmentResponse) =>
    parseISO(a.appointment_date).getTime() - parseISO(b.appointment_date).getTime()
  )[0];

  // Collect all prescribed medications from recent consultations
  const recentMeds = consultations
    .slice(0, 5)
    .flatMap((c: any) => (c.prescription || []).map((rx: any) => ({ ...rx, date: c.consultation_date })));

  if (aptsLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            {profile?.full_name?.split(' ')[0] || 'Patient'}
          </h1>
          <p className="text-muted-foreground mt-1">Here's your health overview for today.</p>
        </div>
        <button
          onClick={() => setShowBooking(!showBooking)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
        >
          {showBooking ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showBooking ? 'Cancel' : 'Book Appointment'}
        </button>
      </header>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming', value: upcomingApts.length, icon: Calendar, color: 'bg-primary text-primary-foreground' },
          { label: 'Total Visits', value: consultations.length, icon: Activity, color: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600' },
          { label: 'Conditions', value: (consultations.flatMap((c: any) => c.icd_codes || []).reduce((map: Map<string, boolean>, ic: any) => { map.set(ic.code, true); return map; }, new Map())).size, icon: Heart, color: 'bg-red-50 dark:bg-red-900/10 text-red-500' },
          { label: 'Active Meds', value: recentMeds.length, icon: Pill, color: 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${s.color} shadow-sm`}>
            <s.icon className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Booking Form (inline) ── */}
      {showBooking && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Book Appointment</h2>
          <form onSubmit={(e) => { e.preventDefault(); bookMutation.mutate(); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={bookDoctorId} onChange={(e) => setBookDoctorId(e.target.value)} required className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select Doctor</option>
              {doctors.map((d: DoctorListItem) => (
                <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.full_name} — {d.specialization}</option>
              ))}
            </select>
            <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} required min={format(new Date(), 'yyyy-MM-dd')} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="time" value={bookTime} onChange={(e) => setBookTime(e.target.value)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <select value={bookType} onChange={(e) => setBookType(e.target.value)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="in_person">In Person</option>
              <option value="telehealth">Telehealth</option>
              <option value="follow_up">Follow Up</option>
            </select>
            <input placeholder="Reason for visit" value={bookReason} onChange={(e) => setBookReason(e.target.value)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 md:col-span-2" />
            <button type="submit" disabled={bookMutation.isPending} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {bookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Book
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Health Overview + Next Appointment ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" /> Health Overview
              </h2>
              {vitals && (
                <span className="text-[11px] text-muted-foreground">
                  Last recorded: {latestConsultation?.consultation_date ? format(parseISO(latestConsultation.consultation_date), 'MMM d, yyyy') : 'Recent'}
                </span>
              )}
            </div>

            {vitals ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'blood_pressure', label: 'Blood Pressure', value: vitals.blood_pressure, unit: 'mmHg', icon: Droplets, bg: 'bg-red-50 dark:bg-red-900/10', iconColor: 'text-red-500' },
                  { key: 'heart_rate', label: 'Heart Rate', value: vitals.heart_rate, unit: 'bpm', icon: Heart, bg: 'bg-pink-50 dark:bg-pink-900/10', iconColor: 'text-pink-500' },
                  { key: 'temperature', label: 'Temperature', value: vitals.temperature, unit: '°F', icon: Thermometer, bg: 'bg-orange-50 dark:bg-orange-900/10', iconColor: 'text-orange-500' },
                  { key: 'spo2', label: 'Oxygen (SpO2)', value: vitals.spo2, unit: '%', icon: Wind, bg: 'bg-blue-50 dark:bg-blue-900/10', iconColor: 'text-blue-500' },
                ].map((v) => {
                  const { status, color } = getVitalStatus(v.key, v.value);
                  return (
                    <div key={v.key} className={`${v.bg} rounded-xl p-4 relative overflow-hidden`}>
                      <div className="flex items-center justify-between mb-2">
                        <v.icon className={`w-4 h-4 ${v.iconColor}`} />
                        <span className={`text-[10px] font-semibold uppercase ${color}`}>
                          {status === 'normal' ? 'Normal' : status === 'high' ? 'High' : status === 'low' ? 'Low' : '—'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold leading-tight">{v.value || 'N/A'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{v.label}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/30 rounded-xl">
                <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recorded vitals yet. They'll appear here after your first visit.</p>
              </div>
            )}

            {/* Condition Banner */}
            {hasConditions && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Active Conditions</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    {[
                      onboarding?.has_diabetes && `Diabetes (${onboarding.diabetes_type?.replace('_', ' ')})`,
                      onboarding?.has_heart_disease && 'Heart Disease',
                      onboarding?.has_lung_disease && 'Lung Disease',
                    ].filter(Boolean).join(' · ')}
                    {onboarding?.medications_list && ` — Meds: ${onboarding.medications_list}`}
                  </p>
                </div>
              </div>
            )}
            {!hasConditions && (
              <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">No chronic conditions on file</p>
                  <p className="text-xs text-green-700/80 dark:text-green-400/80">Keep up with regular checkups!</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Upcoming Appointments */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" /> Upcoming Appointments
            </h2>
            {upcomingApts.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No upcoming appointments scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingApts.slice(0, 5).map((apt: AppointmentResponse) => {
                  const d = parseISO(apt.appointment_date);
                  const isVideo = apt.appointment_type === 'telehealth';
                  return (
                    <div key={apt.appointment_id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isVideo ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                          {isVideo ? <Video className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{apt.doctor_name || 'Doctor'}</h3>
                          <p className="text-xs text-muted-foreground">{apt.reason || apt.appointment_type?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{format(d, 'MMM d')}</p>
                          <p className="text-[11px] text-muted-foreground">{format(d, 'h:mm a')}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>{apt.status}</span>
                        {isVideo && apt.meeting_room_id && (
                          <button onClick={() => navigate(`/meeting/${apt.appointment_id}`)} className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-[11px] font-medium hover:bg-blue-700">
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Recent Prescriptions */}
          {recentMeds.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-emerald-600" /> Current Medications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recentMeds.slice(0, 8).map((rx: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rx.drug}</p>
                      <p className="text-[11px] text-muted-foreground">{rx.dose} · {rx.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-6">
          {/* Next Appointment Card */}
          {nextApt && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg"
            >
              <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Next Appointment</p>
              <p className="text-xl font-bold">{format(parseISO(nextApt.appointment_date), 'EEEE, MMM d')}</p>
              <p className="text-sm opacity-80 mt-0.5">{format(parseISO(nextApt.appointment_date), 'h:mm a')} · {nextApt.duration_minutes} min</p>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{nextApt.doctor_name || 'Doctor'}</p>
                  <p className="text-xs opacity-70">{nextApt.reason || nextApt.appointment_type?.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const d = parseISO(nextApt.appointment_date);
                    const days = differenceInDays(d, new Date());
                    const hours = differenceInHours(d, new Date());
                    return (
                      <div className="bg-white/20 rounded-lg px-3 py-1.5">
                        <p className="text-lg font-bold leading-tight">{days > 0 ? days : hours}</p>
                        <p className="text-[10px] opacity-80">{days > 0 ? (days === 1 ? 'day' : 'days') : (hours === 1 ? 'hour' : 'hours')}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {nextApt.appointment_type === 'telehealth' && nextApt.meeting_room_id && (
                <button onClick={() => navigate(`/meeting/${nextApt.appointment_id}`)} className="mt-3 w-full py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
                  <Video className="w-4 h-4" /> Join Video Call
                </button>
              )}
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
            {[
              { to: '/patient/documents', icon: FileText, label: 'Documents', desc: 'Upload & view reports' },
              { to: '/patient/analytics', icon: BarChart3, label: 'Health Analytics', desc: 'Trends & insights' },
              { to: '/patient/profile', icon: Users, label: 'My Profile', desc: 'Edit information' },
              { to: '/patient/meetings', icon: Video, label: 'Meetings', desc: 'Video consultations' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="group block">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/40 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <link.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{link.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Past Visits Summary */}
          {pastApts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" /> Recent Visits
              </h3>
              <div className="space-y-2">
                {pastApts.slice(0, 4).map((apt: AppointmentResponse) => {
                  const consult = consultations.find((c: any) => c.appointment_id === apt.appointment_id);
                  return (
                    <div key={apt.appointment_id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{apt.doctor_name || 'Doctor'}</p>
                        <p className="text-[11px] text-muted-foreground">{format(parseISO(apt.appointment_date), 'MMM d, yyyy')}</p>
                      </div>
                      {consult && (
                        <Link to={`/patient/consultation/${consult.consultation_id}`} className="text-[11px] text-primary font-medium hover:underline shrink-0">
                          View
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
              {pastApts.length > 4 && (
                <Link to="/patient/analytics" className="block text-center text-xs text-primary font-medium hover:underline mt-3">
                  View All ({pastApts.length})
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
