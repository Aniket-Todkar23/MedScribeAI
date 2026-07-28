import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi, appointmentApi, consultationApi, patientApi } from '../lib/api';
import type { AppointmentResponse, ConsultationResponse } from '../lib/types';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import {
  Calendar, Users, Activity, Clock, Video, ChevronRight, FileText,
  CheckCircle2, XCircle, Loader2, BarChart3, Pill, Stethoscope,
  Plus, Eye, AlertCircle, ClipboardList,
} from 'lucide-react';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => doctorApi.getMe().then(r => r.data),
  });

  const { data: appointments = [], isLoading: aptsLoading } = useQuery({
    queryKey: ['doctorAppointments'],
    queryFn: () => appointmentApi.getUpcoming().then(r => r.data).catch(() => []),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['doctorAllAppointments'],
    queryFn: () => appointmentApi.getAll().then(r => r.data).catch(() => []),
  });

  const { data: patientConsultations = [] } = useQuery({
    queryKey: ['patientConsultations', selectedPatientId],
    queryFn: () => consultationApi.getByPatient(selectedPatientId!).then(r => r.data),
    enabled: !!selectedPatientId,
  });

  const { data: selectedPatient } = useQuery({
    queryKey: ['patientDetail', selectedPatientId],
    queryFn: () => patientApi.getById(selectedPatientId!).then(r => r.data),
    enabled: !!selectedPatientId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.reject(id, 'Schedule conflict'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctorAppointments'] }),
  });

  const createConsultMutation = useMutation({
    mutationFn: (apt: AppointmentResponse) => consultationApi.create(apt.appointment_id, apt.patient_id),
    onSuccess: (res) => {
      navigate(`/doctor/consultation/${res.data.consultation_id}`);
    },
  });

  const todaysAppointments = allAppointments.filter((a: AppointmentResponse) => isToday(parseISO(a.appointment_date)));
  const pendingAppointments = appointments.filter((a: AppointmentResponse) => a.status === 'pending');
  const completedCount = allAppointments.filter((a: AppointmentResponse) => a.status === 'completed').length;
  const upcomingConfirmed = appointments.filter((a: AppointmentResponse) => a.status === 'confirmed' && isFuture(parseISO(a.appointment_date)));

  // Unique patients from all appointments
  const uniquePatients = [...new Map(allAppointments.map((a: AppointmentResponse) => [a.patient_id, { id: a.patient_id, name: a.patient_name }])).values()];

  if (profileLoading || aptsLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dashboard...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, Dr. {profile?.full_name?.split(' ').slice(-1)[0] || 'Doctor'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.specialization || 'General Practice'} · {todaysAppointments.length} patient{todaysAppointments.length !== 1 ? 's' : ''} today
          </p>
        </div>
        <Link to="/doctor/analytics" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors">
          <BarChart3 className="w-4 h-4" /> Analytics
        </Link>
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Patients", value: todaysAppointments.length, icon: Users, color: 'bg-primary text-primary-foreground' },
          { label: 'Upcoming', value: upcomingConfirmed.length, icon: Calendar, color: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600' },
          { label: 'Pending Approval', value: pendingAppointments.length, icon: Clock, color: pendingAppointments.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600' : 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600' },
          { label: 'Total Completed', value: completedCount, icon: CheckCircle2, color: 'bg-green-50 dark:bg-green-900/10 text-green-600' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${s.color} shadow-sm`}>
            <s.icon className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Pending Approvals (shown only if there are pending) ── */}
      {pendingAppointments.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5 shadow-sm"
        >
          <h2 className="font-semibold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" /> Pending Approval ({pendingAppointments.length})
          </h2>
          <div className="space-y-2">
            {pendingAppointments.slice(0, 5).map((apt: AppointmentResponse) => {
              const d = parseISO(apt.appointment_date);
              return (
                <div key={apt.appointment_id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-card border border-amber-100 dark:border-amber-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apt.patient_name || 'Patient'}</p>
                      <p className="text-[11px] text-muted-foreground">{format(d, 'MMM d, h:mm a')} · {apt.reason || apt.appointment_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => approveMutation.mutate(apt.appointment_id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="Approve">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => rejectMutation.mutate(apt.appointment_id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Reject">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Upcoming Schedule ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" /> Upcoming Schedule
          </h2>

          {upcomingConfirmed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No upcoming confirmed appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcomingConfirmed.slice(0, 8).map((apt: AppointmentResponse) => {
                const d = parseISO(apt.appointment_date);
                const isVideo = apt.appointment_type === 'telehealth';
                return (
                  <div key={apt.appointment_id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isVideo ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                        {isVideo ? <Video className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{apt.patient_name || 'Patient'}</h3>
                        <p className="text-[11px] text-muted-foreground">{apt.reason || apt.appointment_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{format(d, 'MMM d')}</p>
                        <p className="text-[11px] text-muted-foreground">{format(d, 'h:mm a')} · {apt.duration_minutes}m</p>
                      </div>

                      <div className="flex gap-1">
                        <button onClick={() => setSelectedPatientId(apt.patient_id)} className="px-2.5 py-1.5 bg-muted text-foreground rounded-lg text-[11px] font-medium hover:bg-muted/80 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Chart
                        </button>
                        {!apt.consultation_id ? (
                          <button onClick={() => createConsultMutation.mutate(apt)} className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Consult
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/doctor/consultation/${apt.consultation_id}`)} className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Edit EMR
                          </button>
                        )}
                        {isVideo && (
                          <button onClick={() => navigate(`/meeting/${apt.appointment_id}`)} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-medium hover:bg-blue-700 flex items-center gap-1">
                            <Video className="w-3 h-3" /> Call
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Right Sidebar ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          {/* Quick Links */}
          {[
            { to: '/doctor/analytics', icon: BarChart3, label: 'Analytics', desc: 'Patient insights' },
            { to: '/doctor/documents', icon: FileText, label: 'Documents', desc: 'Uploaded reports' },
            { to: '/doctor/meetings', icon: Video, label: 'Meetings', desc: 'Video consultations' },
          ].map((link) => (
            <Link key={link.to} to={link.to} className="block group">
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

          {/* My Patients */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> My Patients ({uniquePatients.length})
            </h3>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {uniquePatients.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedPatientId === p.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted/50'
                    }`}
                >
                  <span className="font-medium text-[13px]">{p.name || 'Unknown'}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Selected Patient Detail Panel ── */}
      {selectedPatientId && selectedPatient && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" /> {selectedPatient.full_name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedPatient.gender} · {selectedPatient.blood_group || 'N/A'} · DOB: {selectedPatient.date_of_birth || 'N/A'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/doctor/fhir/${selectedPatientId}`} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> FHIR Export
              </Link>
              <button onClick={() => setSelectedPatientId(null)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80">
                Close
              </button>
            </div>
          </div>

          <h3 className="text-sm font-medium text-muted-foreground mb-2">Consultations</h3>
          {patientConsultations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No consultations on record.</p>
          ) : (
            <div className="space-y-2">
              {patientConsultations.map((c: ConsultationResponse) => (
                <div key={c.consultation_id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(c.soap_note as any)?.assessment?.slice(0, 60) || 'Consultation'}
                      {((c.soap_note as any)?.assessment?.length || 0) > 60 ? '...' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.consultation_date ? format(parseISO(c.consultation_date), 'MMM d, yyyy') : ''} ·
                      {c.icd_codes.length} ICD · {c.prescription.length} Rx · {c.status}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/doctor/consultation/${c.consultation_id}`)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 flex items-center gap-1 shrink-0 ml-2">
                    <Pill className="w-3 h-3" /> Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
