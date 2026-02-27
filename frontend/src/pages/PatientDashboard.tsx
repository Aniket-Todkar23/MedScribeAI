import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { patientApi, appointmentApi, consultationApi, doctorApi } from '../lib/api';
import type { AppointmentResponse, DoctorListItem } from '../lib/types';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import {
  Calendar, FileText, Activity, ChevronRight, Clock, Video, Users,
  Heart, Pill, TrendingUp, Plus, Loader2, CheckCircle2,
  BarChart3,
} from 'lucide-react';

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

  const hasConditions = onboarding && (onboarding.has_diabetes || onboarding.has_heart_disease || onboarding.has_lung_disease);

  // Latest vitals from most recent consultation
  const latestConsultation = consultations[0];
  const vitals = latestConsultation?.emr_data?.vitals;

  if (aptsLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold">Welcome, {profile?.full_name?.split(' ')[0] || 'Patient'}</h1>
        <p className="text-muted-foreground mt-1">
          {upcomingApts.length > 0
            ? `You have ${upcomingApts.length} upcoming appointment${upcomingApts.length > 1 ? 's' : ''}`
            : 'No upcoming appointments'}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vitals / Health Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-primary" /> Health Overview
          </h2>

          {vitals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Blood Pressure', value: vitals.blood_pressure, icon: Activity, color: 'text-red-500' },
                { label: 'Heart Rate', value: vitals.heart_rate, icon: Heart, color: 'text-pink-500' },
                { label: 'Temperature', value: vitals.temperature, icon: TrendingUp, color: 'text-orange-500' },
                { label: 'SpO2', value: vitals.spo2, icon: Activity, color: 'text-blue-500' },
              ].map((v) => (
                <div key={v.label} className="bg-muted/50 rounded-2xl p-4 text-center">
                  <v.icon className={`w-5 h-5 mx-auto mb-2 ${v.color}`} />
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p className="text-lg font-bold">{v.value || 'N/A'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">No recent vitals recorded. Visit your doctor to get your health data.</p>
          )}

          {/* Condition insights */}
          {hasConditions && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Condition Insights
              </h3>
              <p className="text-sm text-blue-700/80 dark:text-blue-400/80">
                You are currently managing
                {onboarding?.has_diabetes && ` Diabetes (${onboarding.diabetes_type?.replace('_', ' ')})`}
                {onboarding?.has_heart_disease && ', Heart Disease'}
                {onboarding?.has_lung_disease && ', Lung Disease'}.
                {onboarding?.medications_list && ` Current medications: ${onboarding.medications_list}.`}
              </p>
            </div>
          )}
          {!hasConditions && (
            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> All Clear
              </h3>
              <p className="text-sm text-green-700/80 dark:text-green-400/80">
                No chronic conditions on file. Keep up healthy habits!
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-1 space-y-4">
          <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-md">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Book Appointment</h3>
            <p className="text-sm opacity-90 mb-4">Schedule a new consultation with your providers.</p>
            <button onClick={() => setShowBooking(!showBooking)} className="bg-white text-primary px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-colors">
              {showBooking ? 'Cancel' : 'Find Time'}
            </button>
          </div>

          <Link to="/patient/documents" className="block group">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Document Center</h3>
                  <p className="text-xs text-muted-foreground">Upload & Analyze</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link to="/patient/profile" className="block group">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">My Profile</h3>
                  <p className="text-xs text-muted-foreground">Edit information</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link to="/patient/analytics" className="block group">
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Health Analytics</h3>
                  <p className="text-xs text-muted-foreground">Trends & insights</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Booking Form */}
      {showBooking && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Book New Appointment</h2>
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

      {/* Upcoming Appointments */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" /> Upcoming Appointments
        </h2>
        {upcomingApts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No upcoming appointments. Book one above!</p>
        ) : (
          <div className="space-y-3">
            {upcomingApts.map((apt: AppointmentResponse) => {
              const d = parseISO(apt.appointment_date);
              const isVideo = apt.appointment_type === 'telehealth';
              return (
                <div key={apt.appointment_id} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isVideo ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                      {isVideo ? <Video className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{apt.doctor_name || 'Doctor'}</h3>
                      <p className="text-xs text-muted-foreground">{apt.reason || apt.appointment_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(d, 'MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{format(d, 'h:mm a')} &middot; {apt.duration_minutes} min</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {apt.status}
                    </span>
                    {isVideo && apt.meeting_room_id && (
                      <button onClick={() => navigate(`/meeting/${apt.appointment_id}`)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90">
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
      {consultations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-primary" /> Recent Prescriptions
          </h2>
          <div className="space-y-3">
            {consultations.slice(0, 3).map((c: any) => (
              c.prescription?.length > 0 && (
                <div key={c.consultation_id} className="p-4 rounded-2xl border border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    {c.consultation_date ? format(parseISO(c.consultation_date), 'MMM d, yyyy') : 'Recent'} &middot; {c.status}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {c.prescription.map((rx: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Pill className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-medium">{rx.drug}</span>
                        <span className="text-muted-foreground">{rx.dose} &middot; {rx.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </motion.div>
      )}

      {/* Past Visits */}
      {pastApts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" /> Past Visits ({pastApts.length})
          </h2>
          <div className="space-y-3">
            {pastApts.slice(0, 5).map((apt: AppointmentResponse) => {
              const consult = consultations.find((c: any) => c.appointment_id === apt.appointment_id);
              return (
                <div key={apt.appointment_id} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{apt.doctor_name || 'Doctor'}</h3>
                      <p className="text-xs text-muted-foreground">{apt.reason || 'Visit'} &middot; {format(parseISO(apt.appointment_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  {consult && (
                    <Link to={`/patient/consultation/${consult.consultation_id}`} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      View Summary <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
