import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi, documentApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { PatientUpdate } from '../lib/types';
import {
  User, Mail, Phone, MapPin, Heart, Droplets, Calendar, Shield,
  Save, Loader2, CheckCircle2, AlertCircle, Upload, FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PatientProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [uploadType, setUploadType] = useState('prescription');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['patientProfile'],
    queryFn: () => patientApi.getMe().then(r => r.data),
  });

  const { data: onboarding } = useQuery({
    queryKey: ['patientOnboarding'],
    queryFn: () => patientApi.getOnboarding().then(r => r.data).catch(() => null),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['patientDocuments', profile?.patient_id],
    queryFn: () => documentApi.getByPatient(profile!.patient_id).then(r => r.data),
    enabled: !!profile?.patient_id,
  });

  const [form, setForm] = useState<PatientUpdate>({});

  // Initialize form when profile loads
  useEffect(() => {
    if (profile && !form.full_name) {
      setForm({
        full_name: profile.full_name,
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
        address: profile.address || '',
        emergency_contact: profile.emergency_contact || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: PatientUpdate) => patientApi.updateMe(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
      if (user) {
        setUser({ ...user, full_name: res.data.full_name });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile || !profile) throw new Error('No file selected');
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('patient_id', profile.patient_id);
      fd.append('document_type', uploadType);
      if (uploadNotes) fd.append('notes', uploadNotes);
      return documentApi.upload(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments'] });
      setUploadFile(null);
      setUploadNotes('');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const inputCls = "w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="w-8 h-8 text-primary" /> My Profile
        </h1>
        <p className="text-muted-foreground mt-1">Update your personal information and medical records.</p>
      </header>

      {/* Profile Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4">Personal Information</h2>

        {saved && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={profile?.email || ''} disabled className={inputCls + ' pl-10 opacity-60'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="date" value={form.date_of_birth || ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className={inputCls + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Gender</label>
              <select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Blood Group</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select value={form.blood_group || ''} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} className={inputCls + ' pl-10'}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls + ' pl-10'} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Emergency Contact</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={form.emergency_contact || ''} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} placeholder="+1-555-0000" className={inputCls + ' pl-10'} />
            </div>
          </div>

          <button type="submit" disabled={updateMutation.isPending} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
          </button>
        </form>
      </motion.div>

      {/* Medical History Summary */}
      {onboarding && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Medical History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Conditions</p>
              {onboarding.no_medical_conditions ? (
                <p className="text-green-600">No chronic conditions</p>
              ) : (
                <div className="space-y-1">
                  {onboarding.has_diabetes && <p>Diabetes ({onboarding.diabetes_type?.replace('_', ' ')}) {onboarding.on_insulin && '— on insulin'}</p>}
                  {onboarding.has_heart_disease && <p>Heart Disease: {onboarding.heart_conditions?.join(', ')}</p>}
                  {onboarding.has_lung_disease && <p>Lung Disease: {onboarding.lung_conditions?.join(', ')} {onboarding.uses_inhaler_daily && '— daily inhaler'}</p>}
                </div>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Medications</p>
              <p>{onboarding.taking_medications ? onboarding.medications_list : 'None'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Allergies</p>
              <p>{onboarding.has_allergies ? onboarding.allergies_list : 'No known allergies'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Lifestyle</p>
              <p>Smoking: {onboarding.smoking_status || 'N/A'} &middot; Alcohol: {onboarding.alcohol_use || 'N/A'}</p>
            </div>
            {onboarding.had_major_surgeries && (
              <div className="p-3 bg-muted/50 rounded-xl md:col-span-2">
                <p className="font-medium text-muted-foreground text-xs uppercase mb-1">Surgeries</p>
                <p>{onboarding.surgeries_details}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Upload External Documents (Prescription/Lab) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Add to My EMR</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload external prescriptions, lab reports, or other medical documents from other providers.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="prescription">Prescription</option>
            <option value="lab_report">Lab Report</option>
            <option value="xray">X-Ray</option>
            <option value="mri_scan">MRI Scan</option>
            <option value="referral_letter">Referral Letter</option>
            <option value="discharge_summary">Discharge Summary</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Notes (optional)" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="px-4 py-3 bg-muted border border-border rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:font-medium" />
        </div>
        <button onClick={() => uploadMutation.mutate()} disabled={!uploadFile || uploadMutation.isPending} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
          {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload & Analyze
        </button>

        {uploadMutation.isError && (
          <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Upload failed. Please try again.
          </div>
        )}
      </motion.div>

      {/* My Documents */}
      {documents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> My Documents ({documents.length})</h2>
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div key={doc.document_id} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{doc.document_name}</h3>
                    <p className="text-xs text-muted-foreground">{doc.document_type} &middot; {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy') : ''}</p>
                  </div>
                </div>
                {doc.analysis_result?.summary && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">AI Analyzed</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
