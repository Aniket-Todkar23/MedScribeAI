import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { patientApi, consultationApi, appointmentApi, fhirApi } from '../lib/api';
import type { ConsultationResponse, AppointmentResponse } from '../lib/types';
import { format, parseISO } from 'date-fns';
import {
  BarChart3, TrendingUp, Heart, Pill, Calendar,
  FileText, Download, Loader2,
  Stethoscope, Shield,
} from 'lucide-react';

export default function PatientAnalytics() {
  const { user } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['patientProfile'],
    queryFn: () => patientApi.getMe().then(r => r.data),
  });

  useQuery({
    queryKey: ['patientOnboarding'],
    queryFn: () => patientApi.getOnboarding().then(r => r.data).catch(() => null),
  });

  const patientId = profile?.patient_id || user?.id;

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ['patientConsultations', patientId],
    queryFn: () => consultationApi.getByPatient(patientId!).then(r => r.data),
    enabled: !!patientId,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['patientAppointments'],
    queryFn: () => appointmentApi.getAll().then(r => r.data),
  });

  // Download full patient EMR as PDF
  const handleDownloadFHIR = async () => {
    if (!patientId) return;
    try {
      const res = await fhirApi.downloadPatientEmr();
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EMR_${profile?.full_name?.replace(/\s+/g, '_') || patientId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  // Analytics calculations
  const totalVisits = consultations.length;
  const cancelledAppts = appointments.filter((a: AppointmentResponse) => a.status === 'cancelled').length;

  // Extract all unique ICD codes across consultations
  const allIcdCodes = consultations.flatMap((c: ConsultationResponse) => c.icd_codes || []);
  const uniqueConditions = [...new Map(allIcdCodes.map((ic: any) => [ic.code, ic])).values()];

  // All prescriptions
  const allRx = consultations.flatMap((c: ConsultationResponse) => (c.prescription || []).map(rx => ({ ...rx, date: c.consultation_date })));

  // Vitals timeline
  const vitalsTimeline = consultations
    .filter((c: ConsultationResponse) => c.emr_data?.vitals)
    .map((c: ConsultationResponse) => ({
      date: c.consultation_date,
      ...c.emr_data.vitals,
    }))
    .reverse(); // chronological

  // Recovery plan from latest consultation
  const latestConsult = consultations[0];
  const latestSOAP = latestConsult?.soap_note as any;
  const recoveryPlan = latestSOAP?.plan || latestConsult?.emr_data?.plan;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" /> Health Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Your health trends, conditions, and recovery plans.</p>
        </div>
        <button onClick={handleDownloadFHIR} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-md">
          <Download className="w-4 h-4" /> Download My EMR
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Visits', value: totalVisits, icon: Stethoscope, color: 'text-primary bg-primary/10' },
          { label: 'Conditions', value: uniqueConditions.length, icon: Heart, color: 'text-red-500 bg-red-50 dark:bg-red-900/10' },
          { label: 'Active Meds', value: allRx.length, icon: Pill, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Cancelled', value: cancelledAppts, icon: Calendar, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Vitals Trend */}
      {vitalsTimeline.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" /> Vitals Over Time
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium">Blood Pressure</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium">Heart Rate</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium">Temp</th>
                  <th className="py-2 px-3 text-muted-foreground font-medium">SpO2</th>
                </tr>
              </thead>
              <tbody>
                {vitalsTimeline.map((v: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3">{v.date ? format(parseISO(v.date), 'MMM d, yyyy') : '—'}</td>
                    <td className="py-2 px-3 font-medium">{v.blood_pressure || '—'}</td>
                    <td className="py-2 px-3">{v.heart_rate || '—'}</td>
                    <td className="py-2 px-3">{v.temperature || '—'}</td>
                    <td className="py-2 px-3">{v.spo2 || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Diagnosed Conditions */}
      {uniqueConditions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" /> Diagnosed Conditions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueConditions.map((ic: any) => (
              <div key={ic.code} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">{ic.code}</span>
                <span className="text-sm">{ic.description}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Medication History */}
      {allRx.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-blue-500" /> Medication History
          </h2>
          <div className="space-y-2">
            {allRx.map((rx: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <Pill className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{rx.drug} {rx.dose}</p>
                    <p className="text-xs text-muted-foreground">{rx.frequency} &middot; {rx.duration}</p>
                  </div>
                </div>
                {rx.date && <span className="text-xs text-muted-foreground">{format(parseISO(rx.date), 'MMM d, yyyy')}</span>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recovery / Treatment Plan */}
      {recoveryPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/20 rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" /> Current Treatment Plan
          </h2>
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <p className="text-sm leading-relaxed whitespace-pre-line">{recoveryPlan}</p>
          </div>
          {latestSOAP?.assessment && (
            <div className="mt-4 p-4 rounded-2xl bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Latest Assessment</p>
              <p className="text-sm">{latestSOAP.assessment}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Visit History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" /> Visit History
        </h2>
        {consultations.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No consultation records yet.</p>
        ) : (
          <div className="space-y-3">
            {consultations.map((c: ConsultationResponse) => (
              <div key={c.consultation_id} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.patient_summary?.slice(0, 80) || 'Consultation'}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.consultation_date ? format(parseISO(c.consultation_date), 'MMM d, yyyy') : ''} &middot; {c.status}
                      {c.icd_codes.length > 0 && ` &middot; ${c.icd_codes.length} diagnoses`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'confirmed' ? 'bg-green-100 text-green-700' : c.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
