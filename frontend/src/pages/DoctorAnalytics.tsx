import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appointmentApi, consultationApi, doctorApi } from '../lib/api';
import type { AppointmentResponse, ConsultationResponse } from '../lib/types';
import { parseISO, format, subMonths, isAfter } from 'date-fns';
import {
  ArrowLeft, Users, Calendar, Pill, Activity, TrendingUp,
  BarChart3, FileText, Loader2, Heart, Stethoscope,
} from 'lucide-react';

export default function DoctorAnalytics() {
  const { data: profile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => doctorApi.getMe().then(r => r.data),
  });

  const { data: allAppointments = [], isLoading: aptsLoading } = useQuery({
    queryKey: ['doctorAllAppointments'],
    queryFn: () => appointmentApi.getAll().then(r => r.data).catch(() => []),
  });

  // We need to gather consultations for each unique patient
  const uniquePatientIds = [...new Set(allAppointments.map((a: AppointmentResponse) => a.patient_id))];

  // Fetch all consultations via combined query
  const { data: allConsultations = [], isLoading: consultLoading } = useQuery({
    queryKey: ['allDoctorConsultations', uniquePatientIds.join(',')],
    queryFn: async () => {
      if (uniquePatientIds.length === 0) return [];
      const results = await Promise.all(
        uniquePatientIds.map(pid => consultationApi.getByPatient(pid).then(r => r.data).catch(() => []))
      );
      return results.flat() as ConsultationResponse[];
    },
    enabled: uniquePatientIds.length > 0,
  });

  const loading = aptsLoading || consultLoading;

  // --- Computed Analytics ---
  const totalPatients = uniquePatientIds.length;
  const totalConsultations = allConsultations.length;
  const completedApts = allAppointments.filter((a: AppointmentResponse) => a.status === 'completed').length;
  const cancelledApts = allAppointments.filter((a: AppointmentResponse) => a.status === 'cancelled').length;

  // Unique ICD codes across all consultations
  const allICDs = allConsultations.flatMap((c: ConsultationResponse) => c.icd_codes || []);
  const icdCounts = allICDs.reduce((acc: Record<string, { count: number; desc: string }>, code: any) => {
    const key = code.code || code;
    acc[key] = acc[key] || { count: 0, desc: code.description || key };
    acc[key].count++;
    return acc;
  }, {});
  const topConditions = Object.entries(icdCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  // All prescriptions
  const allRx = allConsultations.flatMap((c: ConsultationResponse) => c.prescription || []);
  const rxCounts = allRx.reduce((acc: Record<string, number>, rx: any) => {
    const key = rx.drug || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topMedications = Object.entries(rxCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Appointments by month (last 6 months)
  const sixMonthsAgo = subMonths(new Date(), 6);
  const recentApts = allAppointments.filter((a: AppointmentResponse) => isAfter(parseISO(a.appointment_date), sixMonthsAgo));
  const byMonth: Record<string, number> = {};
  recentApts.forEach((a: AppointmentResponse) => {
    const m = format(parseISO(a.appointment_date), 'MMM yyyy');
    byMonth[m] = (byMonth[m] || 0) + 1;
  });
  const monthlyData = Object.entries(byMonth).slice(-6);
  const maxMonthCount = Math.max(...monthlyData.map(m => m[1]), 1);

  // Appointment type breakdown
  const typeBreakdown = allAppointments.reduce((acc: Record<string, number>, a: AppointmentResponse) => {
    acc[a.appointment_type] = (acc[a.appointment_type] || 0) + 1;
    return acc;
  }, {});

  // Gender breakdown from patient names (rough)
  const patientMap = new Map(allAppointments.map((a: AppointmentResponse) => [a.patient_id, a.patient_name]));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Link to="/doctor" className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Practice Analytics</h1>
          <p className="text-sm text-muted-foreground">Dr. {profile?.full_name || 'Doctor'} &middot; {profile?.specialization || 'N/A'}</p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Consultations', value: totalConsultations, icon: FileText, color: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600' },
          { label: 'Completed Visits', value: completedApts, icon: Calendar, color: 'bg-green-50 dark:bg-green-900/10 text-green-600' },
          { label: 'Cancelled', value: cancelledApts, icon: Activity, color: 'bg-red-50 dark:bg-red-900/10 text-red-600' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${s.color} shadow-sm`}>
            <s.icon className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Appointment Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" /> Appointment Trend (6 Months)
          </h2>
          {monthlyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {monthlyData.map(([month, count]) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-sm w-24 text-muted-foreground">{month}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxMonthCount) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full flex items-center justify-end pr-2"
                    >
                      <span className="text-xs text-primary-foreground font-medium">{count}</span>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Conditions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" /> Top Conditions Diagnosed
          </h2>
          {topConditions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No diagnoses yet.</p>
          ) : (
            <div className="space-y-2">
              {topConditions.map(([code, info]) => (
                <div key={code} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{info.desc}</p>
                    <p className="text-xs text-muted-foreground font-mono">{code}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{info.count}x</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Medications Prescribed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-blue-600" /> Most Prescribed Medications
          </h2>
          {topMedications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No prescriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {topMedications.map(([drug, count]) => (
                <div key={drug} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <span className="text-sm font-medium">{drug}</span>
                  <span className="text-sm font-bold text-blue-600">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Visit Type Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" /> Visit Type Breakdown
          </h2>
          <div className="space-y-3">
            {Object.entries(typeBreakdown).map(([type, count]) => {
              const total = allAppointments.length || 1;
              const pct = Math.round(((count as number) / total) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm w-24 capitalize text-muted-foreground">{type}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-green-500 rounded-full flex items-center justify-end pr-2"
                    >
                      <span className="text-xs text-white font-medium">{pct}%</span>
                    </motion.div>
                  </div>
                  <span className="text-sm font-bold text-green-600">{count as number}</span>
                </div>
              );
            })}
          </div>

          {/* Patient List Summary */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> All Patients
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Array.from(patientMap.entries()).map(([id, name]) => (
                <Link key={id} to={`/doctor`} className="block text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {name || 'Unknown'}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
