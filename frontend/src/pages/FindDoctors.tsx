import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi, appointmentApi } from '../lib/api';
import type { DoctorListItem } from '../lib/types';
import {
  Search, Stethoscope, MapPin, Loader2, X,
  CalendarDays, Clock, User, Star,
} from 'lucide-react';

/* ──────────────── Book Appointment Modal ──────────────── */
function BookAppointmentModal({ doctor, onClose }: { doctor: DoctorListItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: '',
    time: '',
    duration: 30,
    type: 'telehealth',
    reason: '',
  });
  const [error, setError] = useState('');

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!form.date || !form.time) throw new Error('Please select date and time');
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      return appointmentApi.create({
        doctor_id: doctor.doctor_id,
        appointment_date: dateTime,
        duration_minutes: form.duration,
        appointment_type: form.type,
        reason: form.reason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.detail || e.message || 'Failed to book'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Book Appointment</h2>
            <p className="text-sm text-muted-foreground">with Dr. {doctor.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
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
                {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="telehealth">Telehealth</option>
                <option value="in_person">In Person</option>
                <option value="follow_up">Follow Up</option>
                <option value="routine_checkup">Routine Checkup</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Reason</label>
            <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. General checkup, Back pain..."
              className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted">Cancel</button>
          <button onClick={() => bookMut.mutate()} disabled={bookMut.isPending}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {bookMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />} Book
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────── Doctor Card ──────────────── */
function DoctorCard({ doctor, onBook }: { doctor: DoctorListItem; onBook: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all hover:shadow-lg group"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          {doctor.avatar_url ? (
            <img src={doctor.avatar_url} alt={doctor.full_name} className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <User className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">Dr. {doctor.full_name}</h3>
          {doctor.specialization && (
            <p className="text-sm text-primary font-medium flex items-center gap-1 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5" /> {doctor.specialization}
            </p>
          )}
          {doctor.hospital_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {doctor.hospital_name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Available</span>
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> 4.8</span>
        </div>
        <button
          onClick={onBook}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <CalendarDays className="w-3.5 h-3.5" /> Book Appointment
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────── Main Page ──────────────── */
export default function FindDoctors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [bookingDoctor, setBookingDoctor] = useState<DoctorListItem | null>(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['findDoctors'],
    queryFn: () => doctorApi.getAll().then(r => r.data),
  });

  // Extract unique specialties
  const specialties = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))) as string[];

  // Filter doctors
  const filtered = doctors.filter(d => {
    const matchesSearch = !searchQuery ||
      d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || d.specialization === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading doctors...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-primary" /> Find Doctors
        </h1>
        <p className="text-muted-foreground mt-1">Browse doctors by specialty and book appointments.</p>
      </header>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, specialty, or hospital..."
            className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <select
          value={selectedSpecialty}
          onChange={e => setSelectedSpecialty(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px]"
        >
          <option value="all">All Specialties</option>
          {specialties.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Doctor Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-3xl">
          <Stethoscope className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No doctors found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(doctor => (
            <DoctorCard key={doctor.doctor_id} doctor={doctor} onBook={() => setBookingDoctor(doctor)} />
          ))}
        </div>
      )}

      {/* Booking modal */}
      <AnimatePresence>
        {bookingDoctor && (
          <BookAppointmentModal doctor={bookingDoctor} onClose={() => setBookingDoctor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
