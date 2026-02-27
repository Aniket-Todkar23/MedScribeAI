import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationApi, fhirApi } from '../lib/api';
import type { PrescriptionItem, ICDCodeItem, SOAPNote } from '../lib/types';
import {
  ArrowLeft, Save, Pill, FileText, Stethoscope, Loader2,
  Plus, Trash2, ChevronDown, ChevronUp, Download, CheckCircle2,
  AlertCircle, Edit3, ClipboardList,
} from 'lucide-react';

function SectionToggle({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary" /> {title}
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

const emptyRx: PrescriptionItem = { drug: '', dose: '', frequency: '', duration: '', notes: '' };
const emptyICD: ICDCodeItem = { code: '', description: '', version: 10 };

export default function ConsultationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

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
  const [extractionData, setExtractionData] = useState<Record<string, any>>({});

  // Sync when consultation loads
  useEffect(() => {
    if (consultation) {
      setSOAP((consultation.soap_note as SOAPNote) || { subjective: '', objective: '', assessment: '', plan: '' });
      setPrescription(consultation.prescription?.length ? consultation.prescription : [{ ...emptyRx }]);
      setIcdCodes(consultation.icd_codes?.length ? consultation.icd_codes : [{ ...emptyICD }]);
      setStatus(consultation.status || 'draft');
      setPatientSummary(consultation.patient_summary || '');
      setEmrData(consultation.emr_data || {});
      setExtractionData(consultation.extraction_data || {});
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
        extraction_data: Object.keys(extractionData).length ? extractionData : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const downloadFHIR = async () => {
    if (!consultation) return;
    try {
      const res = await fhirApi.getEncounter(consultation.consultation_id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir_encounter_${consultation.consultation_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  // --- Prescription helpers ---
  const addRx = () => setPrescription([...prescription, { ...emptyRx }]);
  const removeRx = (idx: number) => setPrescription(prescription.filter((_, i) => i !== idx));
  const updateRx = (idx: number, field: keyof PrescriptionItem, val: string) => {
    const copy = [...prescription];
    copy[idx] = { ...copy[idx], [field]: val };
    setPrescription(copy);
  };

  // --- ICD helpers ---
  const addICD = () => setIcdCodes([...icdCodes, { ...emptyICD }]);
  const removeICD = (idx: number) => setIcdCodes(icdCodes.filter((_, i) => i !== idx));
  const updateICD = (idx: number, field: keyof ICDCodeItem, val: string | number) => {
    const copy = [...icdCodes];
    copy[idx] = { ...copy[idx], [field]: val };
    setIcdCodes(copy);
  };

  // --- EMR Data helpers ---
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

  // --- Extraction Data helpers ---
  const extractionEntries = Object.entries(extractionData);
  const updateExField = (key: string, val: string) => {
    try { setExtractionData({ ...extractionData, [key]: JSON.parse(val) }); } catch { setExtractionData({ ...extractionData, [key]: val }); }
  };
  const addExField = () => {
    const key = prompt('Enter field name:');
    if (key && !extractionData[key]) setExtractionData({ ...extractionData, [key]: '' });
  };
  const removeExField = (key: string) => {
    const copy = { ...extractionData };
    delete copy[key];
    setExtractionData(copy);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading consultation...</div>;
  if (error || !consultation) return <div className="text-center py-12 text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />Consultation not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Consultation Editor</h1>
            <p className="text-sm text-muted-foreground">
              Patient: {consultation.patient_id} &middot; {consultation.consultation_date || 'No date'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadFHIR} className="px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> FHIR
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </header>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4" /> Consultation saved successfully!
        </motion.div>
      )}

      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        {['draft', 'confirmed', 'reviewed'].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* SOAP Note */}
      <SectionToggle title="SOAP Note" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['subjective', 'objective', 'assessment', 'plan'] as const).map(field => (
            <div key={field}>
              <label className="text-xs font-medium text-muted-foreground capitalize mb-1 block">{field}</label>
              <textarea
                value={soap[field]}
                onChange={e => setSOAP({ ...soap, [field]: e.target.value })}
                rows={4}
                className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          ))}
        </div>
      </SectionToggle>

      {/* Patient Summary */}
      <SectionToggle title="Patient Summary" icon={FileText}>
        <textarea
          value={patientSummary}
          onChange={e => setPatientSummary(e.target.value)}
          rows={4}
          placeholder="Auto-generated summary from AI... You can edit this."
          className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </SectionToggle>

      {/* Prescription Editor */}
      <SectionToggle title={`Prescription (${prescription.filter(p => p.drug.trim()).length})`} icon={Pill}>
        <div className="space-y-3">
          {prescription.map((rx, idx) => (
            <motion.div key={idx} layout className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-3">
                <input type="text" placeholder="Drug" value={rx.drug} onChange={e => updateRx(idx, 'drug', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Dose" value={rx.dose} onChange={e => updateRx(idx, 'dose', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Frequency" value={rx.frequency} onChange={e => updateRx(idx, 'frequency', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Duration" value={rx.duration} onChange={e => updateRx(idx, 'duration', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <input type="text" placeholder="Notes" value={rx.notes || ''} onChange={e => updateRx(idx, 'notes', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeRx(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          <button onClick={addRx} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      </SectionToggle>

      {/* ICD Codes Editor */}
      <SectionToggle title={`ICD Codes (${icdCodes.filter(c => c.code.trim()).length})`} icon={Stethoscope}>
        <div className="space-y-3">
          {icdCodes.map((icd, idx) => (
            <motion.div key={idx} layout className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <input type="text" placeholder="Code (e.g. E11.9)" value={icd.code} onChange={e => updateICD(idx, 'code', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-6">
                <input type="text" placeholder="Description" value={icd.description} onChange={e => updateICD(idx, 'description', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="col-span-2">
                <select value={String(icd.version)} onChange={e => updateICD(idx, 'version', parseInt(e.target.value) || 10)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="10">ICD-10</option>
                  <option value="9">ICD-9</option>
                </select>
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeICD(idx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          <button onClick={addICD} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <Plus className="w-4 h-4" /> Add ICD Code
          </button>
        </div>
      </SectionToggle>

      {/* EMR Data Editor (MedGemma generated) */}
      <SectionToggle title="EMR Data (AI Generated)" icon={Edit3} defaultOpen={emrEntries.length > 0}>
        <p className="text-xs text-muted-foreground mb-3">Edit the structured EMR data generated by MedGemma. Fields like vitals, diagnosis, etc.</p>
        <div className="space-y-2">
          {emrEntries.map(([key, val]) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <span className="text-sm font-medium text-muted-foreground">{key}</span>
              </div>
              <div className="col-span-8">
                <input
                  type="text"
                  value={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  onChange={e => updateEmrField(key, e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeEmrField(key)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {emrEntries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No EMR data. AI analysis will populate this.</p>}
          <button onClick={addEmrField} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      </SectionToggle>

      {/* Extraction Data Editor (MedGemma generated) */}
      <SectionToggle title="Extraction Data (AI Generated)" icon={Edit3} defaultOpen={extractionEntries.length > 0}>
        <p className="text-xs text-muted-foreground mb-3">Edit MedGemma extraction output. Complex values are shown as JSON.</p>
        <div className="space-y-2">
          {extractionEntries.map(([key, val]) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-3">
                <span className="text-sm font-medium text-muted-foreground">{key}</span>
              </div>
              <div className="col-span-8">
                {typeof val === 'object' ? (
                  <textarea
                    value={JSON.stringify(val, null, 2)}
                    onChange={e => updateExField(key, e.target.value)}
                    rows={3}
                    className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(val)}
                    onChange={e => updateExField(key, e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>
              <div className="col-span-1 flex justify-center pt-1">
                <button onClick={() => removeExField(key)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {extractionEntries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No extraction data. Process audio to generate.</p>}
          <button onClick={addExField} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      </SectionToggle>
    </div>
  );
}
