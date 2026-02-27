import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { DocumentResponse, DocumentAnalysis } from '../lib/types';
import { format, parseISO } from 'date-fns';
import {
  UploadCloud, FileText, CheckCircle2, ListCheck,
  Loader2, Eye, AlertCircle, X, Brain, ChevronRight,
} from 'lucide-react';
import DocumentViewer from '../components/DocumentViewer';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getAnalysisStatus(ar: DocumentAnalysis | Record<string, any>): 'processing' | 'completed' | 'failed' | 'none' {
  if (!ar || Object.keys(ar).length === 0) return 'none';
  const s = (ar as any).analysis_status;
  if (s === 'processing') return 'processing';
  if (s === 'failed') return 'failed';
  if (s === 'completed') return 'completed';
  // Legacy docs without analysis_status field
  if ((ar as any).patient_report || (ar as any).clinician_report) return 'completed';
  return 'none';
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  processing: { bg: 'rgb(219 234 254)', text: 'rgb(29 78 216)', label: 'Analyzing...' },
  completed:  { bg: 'rgb(220 252 231)', text: 'rgb(21 128 61)', label: 'AI Analyzed' },
  failed:     { bg: 'rgb(254 226 226)', text: 'rgb(185 28 28)', label: 'Failed' },
  none:       { bg: 'rgb(254 249 195)', text: 'rgb(161 98 7)', label: 'No Analysis' },
};

const DOC_TYPES = ['lab_report', 'prescription', 'xray', 'mri_scan', 'referral_letter', 'discharge_summary', 'other'] as const;

/* ── Component ───────────────────────────────────────────────────────────── */

export default function DocumentCenter() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [docType, setDocType] = useState('lab_report');
  const [notes, setNotes] = useState('');
  const [viewDocId, setViewDocId] = useState<string | null>(null);

  const isDoctor = user?.user_type === 'doctor';
  const userId = user?.id;

  /* ── Queries ─────────────────────────────────────────────────────────── */

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return documentApi.getByPatient(userId).then(r => r.data).catch(() => []);
    },
    enabled: !!userId,
  });

  // Determine if any doc is still processing → enable polling
  const hasProcessing = documents.some(
    (d: DocumentResponse) => getAnalysisStatus(d.analysis_result) === 'processing',
  );

  // Poll documents list every 5s while any doc is processing
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['documents', userId] });
    }, 5000);
    return () => clearInterval(interval);
  }, [hasProcessing, queryClient, userId]);

  /* ── Upload Mutation ─────────────────────────────────────────────────── */

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('patient_id', userId || '');
      fd.append('document_type', docType);
      if (notes) fd.append('notes', notes);
      return documentApi.upload(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setNotes('');
    },
  });

  /* ── Drag & Drop ─────────────────────────────────────────────────────── */

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) uploadMutation.mutate(e.dataTransfer.files[0]);
  }, [uploadMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]);
  }, [uploadMutation]);

  /* ── Currently viewed document ───────────────────────────────────────── */

  const viewedDoc = viewDocId ? documents.find((d: DocumentResponse) => d.document_id === viewDocId) : null;

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="mb-4 text-center md:text-left">
        <h1 className="text-3xl font-heading font-bold flex items-center justify-center md:justify-start gap-3">
          <FileText className="w-8 h-8 text-primary" /> Document Center
        </h1>
        <p className="text-muted-foreground mt-2">Upload medical records for instant AI-powered analysis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ─── LEFT COLUMN: Upload + List ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Zone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 ${
                dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-card hover:bg-muted/30'
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff" className="hidden" onChange={handleFileSelect} />
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 relative">
                {uploadMutation.isPending && <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />}
                <UploadCloud className={`w-7 h-7 ${uploadMutation.isPending ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <h3 className="text-lg font-bold mb-1">Upload Document</h3>
              <p className="text-muted-foreground text-xs max-w-xs mb-4">
                Drag and drop or click to browse. AI analysis starts automatically.
              </p>

              <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                {DOC_TYPES.map(t => (
                  <button key={t} onClick={() => setDocType(t)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${docType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="w-full max-w-xs mb-3 bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

              <button
                disabled={uploadMutation.isPending}
                onClick={() => fileRef.current?.click()}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Select File'}
              </button>

              {uploadMutation.isError && <p className="text-xs text-red-500 mt-2">Upload failed. Please try again.</p>}
              {uploadMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded! AI analysis in progress...
                </p>
              )}
            </div>
          </motion.div>

          {/* Documents List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ListCheck className="w-5 h-5 text-primary" /> {isDoctor ? 'Patient Records' : 'My Records'} ({documents.length})
              {hasProcessing && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-1" />}
            </h2>

            {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

            {!isLoading && documents.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No documents yet. Upload your first one!</p>
            )}

            <div className="space-y-3">
              {documents.map((doc: DocumentResponse) => {
                const status = getAnalysisStatus(doc.analysis_result);
                const badge = statusBadge[status];
                const isActive = viewDocId === doc.document_id;

                return (
                  <button
                    key={doc.document_id}
                    onClick={() => setViewDocId(isActive ? null : doc.document_id)}
                    className={`w-full text-left bg-card border rounded-2xl p-4 hover:shadow-md transition-all ${
                      isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          {status === 'processing'
                            ? <Brain className="w-5 h-5 animate-pulse" />
                            : <FileText className="w-5 h-5" />
                          }
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{doc.document_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploaded_at ? format(parseISO(doc.uploaded_at), 'MMM d, yyyy') : ''} &middot; {doc.document_type?.replace(/_/g, ' ') || 'unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          {badge.label}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Quick preview for completed docs */}
                    {status === 'completed' && (doc.analysis_result as any)?.patient_report?.patient_summary?.greeting && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-13">
                        {(doc.analysis_result as any).patient_report.patient_summary.greeting}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ─── RIGHT COLUMN: Analysis Viewer ──────────────────────────────── */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {viewedDoc ? (
              <motion.div
                key={viewedDoc.document_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="sticky top-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{viewedDoc.document_name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {viewedDoc.uploaded_at ? format(parseISO(viewedDoc.uploaded_at), 'MMM d, yyyy h:mm a') : ''}
                        {viewedDoc.file_size_kb ? ` · ${viewedDoc.file_size_kb} KB` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewDocId(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {viewedDoc.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-2.5 mb-4">
                    <span className="font-medium">Notes:</span> {viewedDoc.notes}
                  </p>
                )}

                {/* The Document Viewer */}
                <DocumentViewer
                  analysis={viewedDoc.analysis_result as DocumentAnalysis}
                  isDoctor={isDoctor}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden lg:flex flex-col items-center justify-center h-100 text-center text-muted-foreground"
              >
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-1">Select a Document</h3>
                <p className="text-sm max-w-xs">Click on any document from the list to view its AI-powered analysis here.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}