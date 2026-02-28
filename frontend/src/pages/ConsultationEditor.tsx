import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi, fhirApi, aiProxyApi, drugApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { PrescriptionItem, ICDCodeItem, SOAPNote, DrugResult } from '../lib/types';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Save, Pill, FileText, Stethoscope, Loader2,
  Plus, Trash2, ChevronDown, ChevronUp, Download, CheckCircle2,
  AlertCircle, Edit3, ClipboardList, Mic, Search, X, Users,
  MessageSquare, PlusCircle,
} from 'lucide-react';

/* ────────────────── Collapsible Section ────────────────── */
function SectionToggle({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary" /> {title}
          {badge !== undefined && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>}
        </span>
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

/* ────────────────── ICD Code Search Dropdown ────────────────── */
function ICDSearchDropdown({ onSelect, version }: { onSelect: (code: ICDCodeItem) => void; version: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await aiProxyApi.icdLookup(q, version, 15);
      const data = res.data;
      const codes = Array.isArray(data) ? data : data?.matches || data?.results || data?.codes || [];
      setResults(codes);
      setIsOpen(codes.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [version]);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSelect = (item: any) => {
    onSelect({ code: item.code, description: item.title || item.description || item.name || '', version });
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search ICD codes or symptoms..."
          className="w-full pl-9 pr-8 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto"
          >
            {results.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
              >
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">{item.code}</span>
                <span className="text-sm truncate">{item.title || item.description || item.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────── Drug Search Autocomplete ────────────────── */
function DrugSearchInput({ value, onChange, onSelectDrug }: {
  value: string; onChange: (val: string) => void; onSelectDrug: (drug: DrugResult) => void;
}) {
  const [results, setResults] = useState<DrugResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await drugApi.search(q, 10);
      setResults(res.data || []);
      setIsOpen(res.data?.length > 0);
    } catch { setResults([]); setIsOpen(false); } finally { setLoading(false); }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input type="text" value={value} onChange={e => handleChange(e.target.value)}
          placeholder="Search drug name..." onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full px-3 py-1.5 bg-muted/30 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" />
        {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {results.map((drug, i) => (
              <button key={i} onClick={() => { onSelectDrug(drug); onChange(drug.name); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                <div className="text-sm font-medium">{drug.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {drug.generic_name !== drug.name && <span>{drug.generic_name}</span>}
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{drug.category}</span>
                  {drug.common_doses && <span>{drug.common_doses}</span>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────── Transcription Viewer ────────────────── */
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

  if (!hasSpeakers) {
    return <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">{transcription}</div>;
  }

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
                seg.speaker === 'doctor' ? 'text-blue-600' :
                seg.speaker === 'patient' ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {seg.speaker === 'doctor' ? 'Doctor' : seg.speaker === 'patient' ? 'Patient' : 'Speaker'}
              </span>
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

/* ────────────────── Main Consultation Editor ────────────────── */
const emptyRx: PrescriptionItem = { drug: '', dose: '', frequency: '', duration: '', notes: '' };
const emptyICD: ICDCodeItem = { code: '', description: '', version: 10 };

export default function ConsultationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const isDoctor = user?.user_type === 'doctor';

  const { data: consultation, isLoading, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationApi.getById(id!).then(r => r.data),
    enabled: !!id,
  });

  // Editable state
  const [soap, setSOAP] = useState<SOAPNote>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [icdCodes, setIcdCodes] = useState<ICDCodeItem[]>([]);
  const [status, setStatus] = useState('draft');
  const [patientSummary, setPatientSummary] = useState('');
  const [emrData, setEmrData] = useState<Record<string, any>>({});
  const [icdVersion, setIcdVersion] = useState(10);

  // Drug dropdown options
  const { data: drugOptions } = useQuery({
    queryKey: ['drugOptions'],
    queryFn: () => drugApi.options().then(r => r.data),
    staleTime: Infinity,
  });

  // Sync when consultation loads
  useEffect(() => {
    if (consultation) {
      setSOAP((consultation.soap_note as SOAPNote) || { subjective: '', objective: '', assessment: '', plan: '' });
      setPrescription(consultation.prescription?.length ? consultation.prescription : []);
      setIcdCodes(consultation.icd_codes?.length ? consultation.icd_codes : []);
      setStatus(consultation.status || 'draft');
      setPatientSummary(consultation.patient_summary || '');
      setEmrData(consultation.emr_data || {});
    }
  }, [consultation]);

  const saveMutation = useMutation({
    mutationFn: () =>
      consultationApi.update(id!, {
        soap_note: soap.subjective || soap.objective || soap.assessment || soap.plan ? soap : undefined,
        prescription: prescription.filter(p => p.drug.trim()),
        icd_codes: icdCodes.filter(c => c.code.trim()),
        status,
        patient_summary: patientSummary || undefined,
        emr_data: Object.keys(emrData).length ? emrData : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      setSaved(true);
      setSaveError('');
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.detail || 'Failed to save consultation');
    },
  });

  const downloadFHIR = async () => {
    if (!consultation) return;
    try {
      const res = await fhirApi.downloadBundle(consultation.consultation_id);
      const blob = new Blob([res.data], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir_bundle_${consultation.consultation_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const downloadPatientEMR = async () => {
    if (!consultation) return;
    try {
      const res = await fhirApi.downloadVisitReport(consultation.consultation_id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visit_report_${consultation.consultation_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  // ── Prescription helpers ──
  const addRx = () => setPrescription([...prescription, { ...emptyRx }]);
  const removeRx = (idx: number) => setPrescription(prescription.filter((_, i) => i !== idx));
  const updateRx = (idx: number, field: keyof PrescriptionItem, val: string) => {
    const copy = [...prescription];
    copy[idx] = { ...copy[idx], [field]: val };
    setPrescription(copy);
  };
  const handleDrugSelect = (idx: number, drug: DrugResult) => {
    const copy = [...prescription];
    copy[idx] = { ...copy[idx], drug: drug.name, dose: drug.common_doses?.split(',')[0]?.trim() || copy[idx].dose };
    setPrescription(copy);
  };

  // ── ICD helpers ──
  const addICDFromSearch = (item: ICDCodeItem) => {
    if (icdCodes.some(c => c.code === item.code)) return;
    setIcdCodes([...icdCodes, item]);
  };
  const addICD = () => setIcdCodes([...icdCodes, { ...emptyICD }]);
  const removeICD = (idx: number) => setIcdCodes(icdCodes.filter((_, i) => i !== idx));
  const updateICD = (idx: number, field: keyof ICDCodeItem, val: string | number) => {
    const copy = [...icdCodes];
    copy[idx] = { ...copy[idx], [field]: val };
    setIcdCodes(copy);
  };

  // ── EMR Data helpers ──
  const emrEntries = Object.entries(emrData);
  const updateEmrField = (key: string, val: string) => setEmrData({ ...emrData, [key]: val });
  const addEmrField = () => {
    const key = prompt('Enter field name:');
    if (key && !emrData[key]) setEmrData({ ...emrData, [key]: '' });
  };
  const removeEmrField = (key: string) => {
    const copy = { ...emrData };
    delete copy[key];
    setEmrData(copy);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading consultation...</div>;
  if (error || !consultation) return <div className="text-center py-12 text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />Consultation not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Consultation Editor</h1>
            <p className="text-sm text-muted-foreground">
              {consultation.consultation_date ? new Date(consultation.consultation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date'}
              {' '}&middot;{' '}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                status === 'reviewed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>{status}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDoctor && (
            <button onClick={downloadFHIR} className="px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> FHIR R4 Bundle
            </button>
          )}
          {!isDoctor && (
            <button onClick={downloadPatientEMR} className="px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Export Visit Report
            </button>
          )}
          {isDoctor && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 rounded-xl text-sm">
            <CheckCircle2 className="w-4 h-4" /> Consultation saved successfully!
          </motion.div>
        )}
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Selector (Doctor only) ── */}
      {isDoctor && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          {['draft', 'confirmed', 'reviewed'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Transcription (read-only) ── */}
      {consultation.transcription && (
        <SectionToggle title="Meeting Transcription" icon={Mic} defaultOpen={true}>
          <TranscriptionViewer transcription={consultation.transcription} />
        </SectionToggle>
      )}

      {/* ── SOAP Note ── */}
      <SectionToggle title="SOAP Note" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'subjective' as const, label: 'Subjective', hint: 'Patient history, complaints, symptoms reported', color: 'border-l-blue-400' },
            { key: 'objective' as const, label: 'Objective', hint: 'Examination findings, vitals, lab results', color: 'border-l-green-400' },
            { key: 'assessment' as const, label: 'Assessment', hint: 'Diagnosis, clinical impression', color: 'border-l-yellow-400' },
            { key: 'plan' as const, label: 'Plan', hint: 'Treatment plan, follow-up, referrals', color: 'border-l-purple-400' },
          ]).map(({ key, label, hint, color }) => (
            <div key={key} className={`border-l-4 ${color} pl-3`}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
              <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>
              <textarea
                value={soap[key]}
                onChange={e => setSOAP({ ...soap, [key]: e.target.value })}
                rows={4}
                readOnly={!isDoctor}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          ))}
        </div>
      </SectionToggle>

      {/* ── Patient Summary ── */}
      <SectionToggle title="Patient Summary" icon={FileText}>
        {isDoctor ? (
          <textarea
            value={patientSummary}
            onChange={e => setPatientSummary(e.target.value)}
            rows={4}
            placeholder="Auto-generated summary from AI, or enter manually..."
            className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl bg-muted/30 p-4">
            <ReactMarkdown>{patientSummary || 'No summary available yet.'}</ReactMarkdown>
          </div>
        )}
      </SectionToggle>

      {/* ── ICD Codes with Search Dropdown ── */}
      <SectionToggle title="ICD Codes / Diagnoses" icon={Stethoscope} badge={icdCodes.filter(c => c.code.trim()).length}>
        {isDoctor && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium text-muted-foreground">Search by code or symptom:</span>
              <select
                value={icdVersion}
                onChange={e => setIcdVersion(parseInt(e.target.value))}
                className="text-xs bg-muted/30 border border-border rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value={10}>ICD-10</option>
                <option value={9}>ICD-9</option>
              </select>
            </div>
            <ICDSearchDropdown version={icdVersion} onSelect={addICDFromSearch} />
          </div>
        )}

        {/* Selected ICD codes */}
        <div className="space-y-2">
          {icdCodes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ICD codes added. {isDoctor ? 'Use the search above or add manually below.' : ''}
            </p>
          )}
          {icdCodes.map((icd, idx) => (
            <motion.div key={idx} layout className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded shrink-0">{icd.code || '...'}</span>
              {isDoctor ? (
                <>
                  <input
                    type="text"
                    placeholder="Description"
                    value={icd.description}
                    onChange={e => updateICD(idx, 'description', e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">ICD-{icd.version}</span>
                  <button onClick={() => removeICD(idx)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{icd.description}</span>
                  <span className="text-xs text-muted-foreground shrink-0">ICD-{icd.version}</span>
                </>
              )}
            </motion.div>
          ))}
          {isDoctor && (
            <button onClick={addICD} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mt-2">
              <Plus className="w-4 h-4" /> Add Code Manually
            </button>
          )}
        </div>
      </SectionToggle>

      {/* ── Prescription Editor ── */}
      <SectionToggle title="Prescription" icon={Pill} badge={prescription.filter(p => p.drug.trim()).length}>
        {isDoctor ? (
          <div className="space-y-3">
            {prescription.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No medications added. Click below to add one.
              </p>
            )}
            {prescription.map((rx, idx) => (
              <motion.div key={idx} layout className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary shrink-0" />
                  <DrugSearchInput
                    value={rx.drug}
                    onChange={val => updateRx(idx, 'drug', val)}
                    onSelectDrug={drug => handleDrugSelect(idx, drug)}
                  />
                  <button onClick={() => removeRx(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Dose</label>
                    <input type="text" placeholder="e.g. 500mg" value={rx.dose} onChange={e => updateRx(idx, 'dose', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Frequency</label>
                    {drugOptions?.frequencies ? (
                      <select value={rx.frequency} onChange={e => updateRx(idx, 'frequency', e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">Select...</option>
                        {drugOptions.frequencies.map((f: string) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="e.g. TID" value={rx.frequency} onChange={e => updateRx(idx, 'frequency', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Duration</label>
                    {drugOptions?.durations ? (
                      <select value={rx.duration} onChange={e => updateRx(idx, 'duration', e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="">Select...</option>
                        {drugOptions.durations.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="e.g. 7 days" value={rx.duration} onChange={e => updateRx(idx, 'duration', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Notes</label>
                    <input type="text" placeholder="e.g. After meals" value={rx.notes || ''} onChange={e => updateRx(idx, 'notes', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </motion.div>
            ))}
            <button onClick={addRx} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
              <PlusCircle className="w-4 h-4" /> Add Medication
            </button>
          </div>
        ) : (
          /* Patient read-only view */
          <div>
            {prescription.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No prescription items yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-3 text-muted-foreground font-medium">Drug</th>
                      <th className="py-2 px-3 text-muted-foreground font-medium">Dose</th>
                      <th className="py-2 px-3 text-muted-foreground font-medium">Frequency</th>
                      <th className="py-2 px-3 text-muted-foreground font-medium">Duration</th>
                      <th className="py-2 px-3 text-muted-foreground font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.map((rx, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{rx.drug}</td>
                        <td className="py-2 px-3">{rx.dose || '—'}</td>
                        <td className="py-2 px-3">{rx.frequency || '—'}</td>
                        <td className="py-2 px-3">{rx.duration || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{rx.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </SectionToggle>

      {/* ── EMR Data (AI Generated) ── */}
      <SectionToggle title="EMR Data (AI Generated)" icon={Edit3} defaultOpen={emrEntries.length > 0}>
        <p className="text-xs text-muted-foreground mb-3">Structured EMR data generated by MedGemma. Fields like vitals, diagnosis, etc.</p>
        <div className="space-y-2">
          {emrEntries.map(([key, val]) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <span className="text-sm font-medium text-muted-foreground">{key}</span>
              </div>
              <div className="col-span-8">
                {isDoctor ? (
                  <input
                    type="text"
                    value={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    onChange={e => updateEmrField(key, e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <span className="text-sm">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                )}
              </div>
              {isDoctor && (
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => removeEmrField(key)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {emrEntries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No EMR data. AI analysis will populate this.</p>}
          {isDoctor && (
            <button onClick={addEmrField} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
              <Plus className="w-4 h-4" /> Add Field
            </button>
          )}
        </div>
      </SectionToggle>
    </div>
  );
}
