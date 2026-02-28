import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, consultationApi, doctorApi, patientApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { AppointmentResponse, DoctorListItem, PatientProfile } from '../lib/types';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday,
} from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  Video, ArrowLeft, Users, CheckCircle2, XCircle,
  Loader2, FileText, Mic, ChevronDown, ChevronUp, Pill,
  Stethoscope, ClipboardList, MessageSquare, Play,
  ArrowRight, Calendar, Plus, Clock, ChevronLeft, ChevronRight, X,
  CalendarDays, Check,
} from 'lucide-react';

/* ──────────────── TranscriptionViewer ──────────────── */
function TranscriptionViewer({ transcription }: { transcription: string }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 4;
  const segments = transcription.split('\n').filter(l => l.trim()).map((line, i) => {
    const tsMatch = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(DOCTOR|PATIENT|Dr\.|Pt\.|Clinician)[:\s]+(.+)/i);
    const doctorMatch = line.match(/^(DOCTOR|Dr\.|Clinician)[:\s]+(.+)/i);
    const patientMatch = line.match(/^(PATIENT|Pt\.)[:\s]+(.+)/i);
    if (tsMatch) {
      const speaker = /doctor|dr\.|clinician/i.test(tsMatch[2]) ? 'doctor' : 'patient';
      return { id: i, speaker, text: tsMatch[3].trim(), time: tsMatch[1] };
    }
    if (doctorMatch) return { id: i, speaker: 'doctor' as const, text: doctorMatch[2].trim(), time: null };
    if (patientMatch) return { id: i, speaker: 'patient' as const, text: patientMatch[2].trim(), time: null };
    return { id: i, speaker: 'unknown' as const, text: line.trim(), time: null };
  });

  const hasSpeakers = segments.some(s => s.speaker !== 'unknown');
  if (!hasSpeakers) return <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">{transcription}</div>;

  const visible = expanded ? segments : segments.slice(0, PREVIEW_COUNT);
  const hiddenCount = segments.length - PREVIEW_COUNT;

  return (
    <div className="space-y-2">
      {visible.map(seg => (
        <div key={seg.id} className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            seg.speaker === 'doctor' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
            seg.speaker === 'patient' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {seg.speaker === 'doctor' ? <Stethoscope className="w-4 h-4" /> :
             seg.speaker === 'patient' ? <Users className="w-4 h-4" /> :
             <MessageSquare className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-semibold uppercase ${
                seg.speaker === 'doctor' ? 'text-blue-600' : seg.speaker === 'patient' ? 'text-green-600' : 'text-muted-foreground'
              }`}>{seg.speaker === 'doctor' ? 'Doctor' : seg.speaker === 'patient' ? 'Patient' : 'Speaker'}</span>
              {seg.time && <span className="text-xs text-muted-foreground font-mono">{seg.time}</span>}
            </div>
            <p className="text-sm leading-relaxed">{seg.text}</p>
          </div>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse transcription</> : <><ChevronDown className="w-3.5 h-3.5" /> Show full transcription ({hiddenCount} more)</>}
        </button>
      )}
    </div>
  );
}

/* ──────────────── Collapsible Section ──────────────── */
function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-sm"><Icon className="w-4 h-4 text-primary" /> {title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────── Mini Calendar ──────────────── */
function MiniCalendar({ appointments, onSelectDate }: { appointments: AppointmentResponse[]; onSelectDate: (date: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getApptsForDay = (day: Date) =>
    appointments.filter(a => isSameDay(parseISO(a.appointment_date), day));

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'confirmed': return 'bg-yellow-500';
      case 'pending': return 'bg-orange-400';
      case 'cancelled': return 'bg-red-400';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => {
          const dayAppts = getApptsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`relative p-1.5 rounded-lg text-xs transition-colors min-h-[36px] ${
                !inMonth ? 'text-muted-foreground/30' :
                today ? 'bg-primary/10 text-primary font-bold' :
                dayAppts.length > 0 ? 'hover:bg-muted font-medium' : 'hover:bg-muted/50'
              }`}
            >
              <span>{format(day, 'd')}</span>
              {dayAppts.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayAppts.slice(0, 3).map((a, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${statusColor(a.status)}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {[
          { label: 'Pending', color: 'bg-orange-400' },
          { label: 'Confirmed', color: 'bg-yellow-500' },
          { label: 'In Progress', color: 'bg-blue-500' },
          { label: 'Completed', color: 'bg-green-500' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── Schedule Meeting Modal ──────────────── */
function ScheduleMeetingModal({ onClose, userType }: { onClose: () => void; userType: 'doctor' | 'patient' }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    targetId: '',
    date: '',
    time: '',
    duration: 30,
    type: 'telehealth' as string,
    reason: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const { data: doctors = [] } = useQuery({
    queryKey: ['allDoctors'],
    queryFn: () => doctorApi.getAll().then(r => r.data),
    enabled: userType === 'patient',
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => patientApi.getAll().then(r => r.data).catch(() => []),
    enabled: userType === 'doctor',
  });

  const scheduleMut = useMutation({
    mutationFn: async () => {
      if (!form.targetId || !form.date || !form.time) throw new Error('Please fill all required fields');
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      if (userType === 'doctor') {
        return appointmentApi.schedule({
          patient_id: form.targetId,
          appointment_date: dateTime,
          duration_minutes: form.duration,
          appointment_type: form.type,
          reason: form.reason || undefined,
          notes: form.notes || undefined,
        });
      } else {
        return appointmentApi.create({
          doctor_id: form.targetId,
          appointment_date: dateTime,
          duration_minutes: form.duration,
          appointment_type: form.type,
          reason: form.reason || undefined,
          notes: form.notes || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.detail || e.message || 'Failed to schedule'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Schedule Meeting
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {userType === 'doctor' ? 'Select Patient' : 'Select Doctor'}
            </label>
            <select
              value={form.targetId}
              onChange={e => setForm(p => ({ ...p, targetId: e.target.value }))}
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Choose --</option>
              {userType === 'doctor'
                ? patients.map((p: PatientProfile) => (
                    <option key={p.patient_id} value={p.patient_id}>{p.full_name} {p.email ? `(${p.email})` : ''}</option>
                  ))
                : doctors.map((d: DoctorListItem) => (
                    <option key={d.doctor_id} value={d.doctor_id}>{d.full_name} — {d.specialization || 'General'}</option>
                  ))
              }
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Time</label>
              <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Duration</label>
              <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="telehealth">Telehealth</option>
                <option value="in_person">In Person</option>
                <option value="follow_up">Follow Up</option>
                <option value="emergency">Emergency</option>
                <option value="routine_checkup">Routine Checkup</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Reason</label>
            <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. Follow-up on lab results"
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted transition-colors">Cancel</button>
          <button onClick={() => scheduleMut.mutate()} disabled={scheduleMut.isPending}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {scheduleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />} Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────── Meeting Detail ──────────────── */
function MeetingDetail({ appointment, onBack }: { appointment: AppointmentResponse; onBack: () => void }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['meetingConsultation', appointment.consultation_id],
    queryFn: () => consultationApi.getById(appointment.consultation_id!).then(r => r.data),
    enabled: !!appointment.consultation_id,
  });

  const approveMut = useMutation({
    mutationFn: () => appointmentApi.approve(appointment.appointment_id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allMeetings'] }); onBack(); },
  });

  const rejectMut = useMutation({
    mutationFn: () => appointmentApi.reject(appointment.appointment_id, 'Declined by user'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allMeetings'] }); onBack(); },
  });

  const soap = consultation?.soap_note as Record<string, string> | undefined;
  const rx = consultation?.prescription || [];
  const icd = consultation?.icd_codes || [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Meeting Details</h2>
            <p className="text-sm text-muted-foreground">
              {appointment.patient_name || 'Patient'} &middot; {appointment.doctor_name || 'Doctor'} &middot;{' '}
              {format(parseISO(appointment.appointment_date), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
            appointment.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
            appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
            appointment.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
            appointment.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {appointment.status === 'in_progress' ? 'In Progress' : appointment.status}
          </span>

          {appointment.status === 'pending' && (
            <>
              <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}
                className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 flex items-center gap-1 disabled:opacity-50">
                {approveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
              </button>
              <button onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}
                className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50">
                {rejectMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Reject
              </button>
            </>
          )}

          {appointment.consultation_id && user?.user_type === 'doctor' && (
            <button onClick={() => navigate(`/doctor/consultation/${appointment.consultation_id}`)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/90 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Edit Consultation
            </button>
          )}
        </div>
      </header>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground font-medium uppercase mb-1">Type</p><p className="font-medium capitalize">{appointment.appointment_type.replace('_', ' ')}</p></div>
          <div><p className="text-xs text-muted-foreground font-medium uppercase mb-1">Duration</p><p className="font-medium">{appointment.duration_minutes} min</p></div>
          <div><p className="text-xs text-muted-foreground font-medium uppercase mb-1">Reason</p><p className="font-medium">{appointment.reason || 'General consultation'}</p></div>
          <div><p className="text-xs text-muted-foreground font-medium uppercase mb-1">Room ID</p><p className="font-mono text-xs">{appointment.meeting_room_id || 'N/A'}</p></div>
        </div>
      </div>

      {(appointment.status === 'confirmed' || appointment.status === 'in_progress') && appointment.appointment_type === 'telehealth' && (
        <button onClick={() => navigate(`/meeting/${appointment.appointment_id}`)}
          className="w-full py-3 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
          <Video className="w-5 h-5" /> Join Meeting
        </button>
      )}

      {isLoading && <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...</div>}

      {!appointment.consultation_id && !isLoading && (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No consultation record linked to this meeting yet.</p>
        </div>
      )}

      {consultation && (
        <>
          {consultation.transcription && (
            <Section title="Meeting Transcription" icon={Mic}>
              <TranscriptionViewer transcription={consultation.transcription} />
            </Section>
          )}
          {consultation.patient_summary && (
            <Section title="Patient Summary" icon={FileText}>
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{consultation.patient_summary}</ReactMarkdown></div>
            </Section>
          )}
          {soap && (soap.subjective || soap.objective || soap.assessment || soap.plan) && (
            <Section title="SOAP Note" icon={ClipboardList}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'subjective', label: 'Subjective', color: 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10' },
                  { key: 'objective', label: 'Objective', color: 'border-green-200 bg-green-50/50 dark:bg-green-900/10' },
                  { key: 'assessment', label: 'Assessment', color: 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10' },
                  { key: 'plan', label: 'Plan', color: 'border-purple-200 bg-purple-50/50 dark:bg-purple-900/10' },
                ].map(({ key, label, color }) => (
                  <div key={key} className={`rounded-xl p-4 border ${color}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
                    <p className="text-sm leading-relaxed">{soap[key] || '—'}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {icd.length > 0 && (
            <Section title={`Diagnoses / ICD Codes (${icd.length})`} icon={Stethoscope}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {icd.map((c: Record<string, string | number>, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">{c.code}</span>
                    <span className="text-sm flex-1">{c.description}</span>
                    <span className="text-xs text-muted-foreground">ICD-{c.version || 10}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {rx.length > 0 && (
            <Section title={`Prescription (${rx.length})`} icon={Pill}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left">
                    <th className="py-2 px-3 text-muted-foreground font-medium">Drug</th>
                    <th className="py-2 px-3 text-muted-foreground font-medium">Dose</th>
                    <th className="py-2 px-3 text-muted-foreground font-medium">Frequency</th>
                    <th className="py-2 px-3 text-muted-foreground font-medium">Duration</th>
                    <th className="py-2 px-3 text-muted-foreground font-medium">Notes</th>
                  </tr></thead>
                  <tbody>
                    {rx.map((r: Record<string, string>, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{r.drug}</td>
                        <td className="py-2 px-3">{r.dose || '—'}</td>
                        <td className="py-2 px-3">{r.frequency || '—'}</td>
                        <td className="py-2 px-3">{r.duration || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────── Main Meetings Page ──────────────── */
export default function Meetings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedAppt, setSelectedAppt] = useState<AppointmentResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['allMeetings'],
    queryFn: () => appointmentApi.getAll().then(r => r.data).catch(() => []),
  });

  const meetings = allAppointments;

  const filtered = useMemo(() => {
    let list = filterStatus === 'all' ? meetings : meetings.filter((a: AppointmentResponse) => a.status === filterStatus);
    if (selectedDate) list = list.filter((a: AppointmentResponse) => isSameDay(parseISO(a.appointment_date), selectedDate));
    return list;
  }, [meetings, filterStatus, selectedDate]);

  const statusCounts = {
    all: meetings.length,
    pending: meetings.filter((a: AppointmentResponse) => a.status === 'pending').length,
    confirmed: meetings.filter((a: AppointmentResponse) => a.status === 'confirmed').length,
    in_progress: meetings.filter((a: AppointmentResponse) => a.status === 'in_progress').length,
    completed: meetings.filter((a: AppointmentResponse) => a.status === 'completed').length,
  };

  if (selectedAppt) return <div className="max-w-4xl mx-auto"><MeetingDetail appointment={selectedAppt} onBack={() => setSelectedAppt(null)} /></div>;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Video className="w-8 h-8 text-primary" /> Meetings & Appointments</h1>
          <p className="text-muted-foreground mt-1">Schedule, manage, and review all your appointments.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-xl p-0.5">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'list' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>List</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Calendar</button>
          </div>
          <button onClick={() => setShowSchedule(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Schedule Meeting
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All', count: statusCounts.all },
          { key: 'pending', label: 'Pending', count: statusCounts.pending },
          { key: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
          { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
          { key: 'completed', label: 'Completed', count: statusCounts.completed },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setFilterStatus(tab.key); setSelectedDate(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterStatus === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} className="px-3 py-2 rounded-full text-xs font-medium bg-secondary text-secondary-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {format(selectedDate, 'MMM d')} <X className="w-3 h-3 ml-1" />
          </button>
        )}
      </div>

      <div className={`grid gap-6 ${view === 'calendar' ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-3xl">
              <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No meetings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDate ? `No meetings on ${format(selectedDate, 'MMM d, yyyy')}` : filterStatus === 'all' ? 'Schedule a meeting to get started.' : `No ${filterStatus.replace('_', ' ')} meetings.`}
              </p>
            </div>
          ) : (
            filtered.map((apt: AppointmentResponse) => {
              const d = parseISO(apt.appointment_date);
              return (
                <motion.div key={apt.appointment_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedAppt(apt)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        apt.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
                        apt.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
                        apt.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' :
                        apt.status === 'confirmed' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {apt.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                         apt.status === 'in_progress' ? <Play className="w-6 h-6" /> :
                         apt.status === 'pending' ? <Clock className="w-6 h-6" /> :
                         <Video className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-medium">{user?.user_type === 'doctor' ? apt.patient_name || 'Patient' : apt.doctor_name || 'Doctor'}</h3>
                        <p className="text-sm text-muted-foreground">{apt.reason || 'General consultation'}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{apt.appointment_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{format(d, 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(d, 'h:mm a')} &middot; {apt.duration_minutes}m</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        apt.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        apt.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        apt.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        'bg-muted text-muted-foreground'
                      }`}>{apt.status === 'in_progress' ? 'In Progress' : apt.status}</span>
                      {apt.status === 'confirmed' && apt.appointment_type === 'telehealth' && (
                        <button onClick={e => { e.stopPropagation(); navigate(`/meeting/${apt.appointment_id}`); }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                          <Video className="w-3 h-3" /> Join
                        </button>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  {apt.consultation_id && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Consultation linked</span>
                      {apt.meeting_room_id && <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {apt.meeting_room_id}</span>}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {view === 'calendar' && (
          <div className="space-y-4">
            <MiniCalendar appointments={meetings} onSelectDate={setSelectedDate} />
            <div className="bg-card border border-border rounded-2xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Schedule</h4>
              {meetings.filter(a => isToday(parseISO(a.appointment_date))).length === 0 ? (
                <p className="text-xs text-muted-foreground">No meetings today</p>
              ) : (
                <div className="space-y-2">
                  {meetings.filter(a => isToday(parseISO(a.appointment_date))).map(a => (
                    <div key={a.appointment_id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-2 rounded-lg" onClick={() => setSelectedAppt(a)}>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{format(parseISO(a.appointment_date), 'h:mm a')}</span>
                      <span className="text-muted-foreground truncate flex-1">{user?.user_type === 'doctor' ? a.patient_name : a.doctor_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSchedule && <ScheduleMeetingModal onClose={() => setShowSchedule(false)} userType={user?.user_type as 'doctor' | 'patient'} />}
      </AnimatePresence>
    </div>
  );
}
