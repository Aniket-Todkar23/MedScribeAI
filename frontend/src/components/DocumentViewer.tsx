/**
 * DocumentViewer — Renders parsed AI analysis for a document.
 * Supports patient-facing and clinician-facing reports with proper
 * null/N/A handling and structured display.
 */

import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, BadgeCheck, Beaker, Brain,
  ChevronDown, ChevronUp, FileText, Heart, Loader2, Pill,
  Stethoscope, TestTube, User, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type {
  DocumentAnalysis, PatientReport, ClinicianReport,
  PatientSummary, DocPrescriptionItem, LabTest, LabPanel,
  ClinicalInsight, ClinicianSummary, DocumentMetadata, MedicationSuggestion,
} from '../lib/types';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Display value or N/A for required visible fields */
const na = (v?: string | number | null) =>
  v !== undefined && v !== null && v !== '' ? String(v) : 'N/A';

/** Only render a row if value exists */
const optRow = (label: string, v?: string | number | null) =>
  v !== undefined && v !== null && v !== ''
    ? <div className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-sm font-medium">{String(v)}</span>
      </div>
    : null;

const flagColor: Record<string, string> = {
  normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  abnormal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const urgencyColor: Record<string, string> = {
  routine: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  urgent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

/* ── Section wrapper ─────────────────────────────────────────────────────── */

function Section({ icon: Icon, title, children, defaultOpen = true }: {
  icon: React.FC<{ className?: string }>; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2.5 font-semibold text-sm">
          <Icon className="w-4.5 h-4.5 text-primary" /> {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function ProcessingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <h3 className="text-lg font-bold mb-2">AI Analysis in Progress</h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        MedGemma is analyzing your document. This may take 1–3 minutes depending on document complexity.
      </p>
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-refreshing…
      </div>
    </motion.div>
  );
}

function FailedState({ error }: { error?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold mb-2">Analysis Failed</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        {error || 'The AI service was unable to process this document. Please try uploading again.'}
      </p>
    </motion.div>
  );
}

function MetadataCard({ report }: { report: PatientReport }) {
  const hasAny = report.patient_name || report.report_date || report.lab_name || report.document_type;
  if (!hasAny) return null;
  return (
    <Section icon={FileText} title="Document Info">
      <div className="grid grid-cols-2 gap-x-6">
        {optRow('Patient', report.patient_name)}
        {optRow('Report Date', report.report_date)}
        {optRow('Facility / Lab', report.lab_name)}
        {optRow('Document Type', report.document_type?.replace(/_/g, ' '))}
        {optRow('Total Tests', report.total_tests_count)}
        {optRow('Processing Time', report.processing_time_ms ? `${(report.processing_time_ms / 1000).toFixed(1)}s` : undefined)}
      </div>
    </Section>
  );
}

function PatientSummaryCard({ summary }: { summary: PatientSummary }) {
  return (
    <Section icon={Heart} title="Your Health Summary">
      <div className="space-y-4">
        {summary.greeting && (
          <p className="text-sm leading-relaxed text-foreground/90 bg-primary/5 rounded-xl p-4 border border-primary/10">
            {summary.greeting}
          </p>
        )}
        {summary.what_was_tested && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <TestTube className="w-3.5 h-3.5" /> What Was Tested
            </h4>
            <p className="text-sm leading-relaxed">{summary.what_was_tested}</p>
          </div>
        )}
        {summary.key_results && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Key Results
            </h4>
            <p className="text-sm leading-relaxed">{summary.key_results}</p>
          </div>
        )}
        {summary.what_is_normal && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" /> What's Normal
            </h4>
            <p className="text-sm leading-relaxed text-green-700 dark:text-green-400">{summary.what_is_normal}</p>
          </div>
        )}
        {summary.what_needs_attention && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
            </h4>
            <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">{summary.what_needs_attention}</p>
          </div>
        )}
        {summary.next_steps && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Next Steps</h4>
            <p className="text-sm leading-relaxed">{summary.next_steps}</p>
          </div>
        )}
        {summary.lifestyle_tips && (
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5">Lifestyle Tips</h4>
            <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-300">{summary.lifestyle_tips}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

function PrescriptionsTable({ items }: { items: DocPrescriptionItem[] }) {
  if (!items.length) return null;
  return (
    <Section icon={Pill} title={`Prescriptions (${items.length})`}>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="pb-2 pr-4">Drug</th>
              <th className="pb-2 pr-4">Strength</th>
              <th className="pb-2 pr-4">Form</th>
              <th className="pb-2 pr-4">Qty</th>
              <th className="pb-2 pr-4">Instructions</th>
              <th className="pb-2">Prescriber</th>
            </tr>
          </thead>
          <tbody>
            {items.map((rx, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="py-2.5 pr-4 font-medium">{rx.drug_name}</td>
                <td className="py-2.5 pr-4">{na(rx.strength)}</td>
                <td className="py-2.5 pr-4">{na(rx.form)}</td>
                <td className="py-2.5 pr-4">{na(rx.quantity)}</td>
                <td className="py-2.5 pr-4 max-w-50">{na(rx.sig)}</td>
                <td className="py-2.5">{na(rx.prescribing_doctor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function AbnormalResultsList({ tests }: { tests: LabTest[] }) {
  if (!tests.length) return null;
  return (
    <Section icon={AlertTriangle} title={`Abnormal Results (${tests.length})`}>
      <div className="space-y-2">
        {tests.map((t, i) => (
          <div key={i} className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border border-border/30">
            <div>
              <span className="font-medium text-sm">{t.test_name}</span>
              {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono">{na(t.result)} {t.unit || ''}</span>
              {t.reference_range && <span className="text-xs text-muted-foreground">Ref: {t.reference_range}</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${flagColor[t.flag] || flagColor.normal}`}>
                {t.flag.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function LabPanelsView({ panels }: { panels: LabPanel[] }) {
  if (!panels.length) return null;
  return (
    <Section icon={Beaker} title={`Lab Panels (${panels.length})`} defaultOpen={false}>
      <div className="space-y-4">
        {panels.map((panel, pi) => (
          <div key={pi}>
            <h4 className="font-semibold text-sm mb-2">{panel.panel_name}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 pr-4">Test</th>
                    <th className="pb-2 pr-4">Result</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2 pr-4">Reference</th>
                    <th className="pb-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.tests.map((t, ti) => (
                    <tr key={ti} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.test_name}</td>
                      <td className="py-2 pr-4 font-mono">{na(t.result)}</td>
                      <td className="py-2 pr-4">{t.unit || '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{t.reference_range || '—'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${flagColor[t.flag] || flagColor.normal}`}>
                          {t.flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ClinicalInsightsSection({ insights }: { insights: ClinicalInsight[] }) {
  if (!insights.length) return null;
  return (
    <Section icon={Brain} title={`Clinical Insights (${insights.length})`}>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="bg-muted/30 rounded-xl p-4 border border-border/30">
            <div className="flex items-start justify-between mb-1.5">
              <h4 className="font-semibold text-sm">{ins.finding}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ml-2 ${urgencyColor[ins.urgency] || urgencyColor.routine}`}>
                {ins.urgency}
              </span>
            </div>
            <p className="text-sm text-foreground/80">{ins.significance}</p>
            {ins.suggested_followup && (
              <p className="text-xs text-muted-foreground mt-1.5">Follow-up: {ins.suggested_followup}</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function ClinicianSummaryCard({ summary }: { summary: ClinicianSummary }) {
  return (
    <Section icon={Stethoscope} title="Clinician Summary">
      <div className="space-y-4">
        {summary.overall_assessment && (
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5">Overall Assessment</h4>
            <p className="text-sm leading-relaxed">{summary.overall_assessment}</p>
          </div>
        )}

        {summary.critical_values.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1.5">Critical Values</h4>
            <ul className="space-y-1">
              {summary.critical_values.map((v, i) => (
                <li key={i} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(summary.system_findings).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">System Findings</h4>
            <div className="grid gap-2">
              {Object.entries(summary.system_findings).map(([sys, finding]) => (
                <div key={sys} className="bg-muted/30 rounded-lg p-3">
                  <span className="text-xs font-semibold capitalize">{sys.replace(/_/g, ' ')}</span>
                  <p className="text-sm text-foreground/80 mt-0.5">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.recommended_actions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Recommended Actions</h4>
            <ul className="space-y-1.5">
              {summary.recommended_actions.map((a, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.differential_considerations.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Differential Considerations</h4>
            <div className="flex flex-wrap gap-2">
              {summary.differential_considerations.map((d, i) => (
                <span key={i} className="bg-muted/50 px-3 py-1 rounded-full text-xs font-medium">{d}</span>
              ))}
            </div>
          </div>
        )}

        {summary.medication_recommendations.length > 0 && (
          <MedSuggestionsTable items={summary.medication_recommendations} />
        )}
      </div>
    </Section>
  );
}

function MedSuggestionsTable({ items }: { items: MedicationSuggestion[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Medication Recommendations</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="pb-2 pr-3">Name</th>
              <th className="pb-2 pr-3">Indication</th>
              <th className="pb-2 pr-3">Dose</th>
              <th className="pb-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="py-2 pr-3 font-medium">{m.name}</td>
                <td className="py-2 pr-3">{m.indication}</td>
                <td className="py-2 pr-3">{m.dose ? `${m.dose}${m.frequency ? `, ${m.frequency}` : ''}` : 'N/A'}</td>
                <td className="py-2 text-muted-foreground">{m.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClinicianMetadataCard({ metadata }: { metadata: DocumentMetadata }) {
  const hasAny = metadata.patient_name || metadata.report_date || metadata.lab_name || metadata.facility_name;
  if (!hasAny) return null;
  return (
    <Section icon={User} title="Patient & Document Information">
      <div className="grid grid-cols-2 gap-x-6">
        {optRow('Patient', metadata.patient_name)}
        {optRow('Age', metadata.age)}
        {optRow('Gender', metadata.gender)}
        {optRow('DOB', metadata.date_of_birth)}
        {optRow('Report Date', metadata.report_date)}
        {optRow('Collection Date', metadata.sample_collection_date)}
        {optRow('Lab / Facility', metadata.lab_name || metadata.facility_name)}
        {optRow('Ordering Physician', metadata.ordering_physician)}
        {optRow('Reporting Physician', metadata.reporting_physician)}
        {optRow('Document Type', metadata.document_type?.replace(/_/g, ' '))}
      </div>
    </Section>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

interface DocumentViewerProps {
  analysis: DocumentAnalysis;
  isDoctor?: boolean;
}

export default function DocumentViewer({ analysis, isDoctor = false }: DocumentViewerProps) {
  const status = analysis.analysis_status;

  // Processing state
  if (status === 'processing') return <ProcessingState />;

  // Failed state
  if (status === 'failed') return <FailedState error={analysis.error} />;

  const patientReport = analysis.patient_report as PatientReport | null | undefined;
  const clinicianReport = analysis.clinician_report as ClinicianReport | null | undefined;

  // No data
  if (!patientReport && !clinicianReport) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No analysis data available for this document.
      </div>
    );
  }

  // Clinician view (doctor sees clinician report if available)
  if (isDoctor && clinicianReport) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {clinicianReport.metadata && <ClinicianMetadataCard metadata={clinicianReport.metadata} />}
        {clinicianReport.clinician_summary && <ClinicianSummaryCard summary={clinicianReport.clinician_summary} />}
        <AbnormalResultsList tests={clinicianReport.abnormal_results || []} />
        <ClinicalInsightsSection insights={clinicianReport.clinical_insights || []} />
        <LabPanelsView panels={clinicianReport.panels || []} />
        <PrescriptionsTable items={clinicianReport.prescriptions || []} />

        {/* Also show patient report if available (toggle) */}
        {patientReport && patientReport.patient_summary && (
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patient-Friendly View</h3>
            <PatientSummaryCard summary={patientReport.patient_summary} />
          </div>
        )}
      </motion.div>
    );
  }

  // Patient view
  if (patientReport) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <MetadataCard report={patientReport} />
        {patientReport.patient_summary && <PatientSummaryCard summary={patientReport.patient_summary} />}
        <PrescriptionsTable items={patientReport.prescriptions || []} />
        <AbnormalResultsList tests={patientReport.abnormal_results || []} />
      </motion.div>
    );
  }

  return null;
}
