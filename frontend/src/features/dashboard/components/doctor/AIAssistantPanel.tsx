import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageSquare, AlertCircle, Send, TrendingUp, Heart,
  FileText, Pill, Stethoscope, Activity, Download, ClipboardList, ShieldAlert
} from "lucide-react";
import type { ChatMessage } from "./types";
import type {
  DoctorSummary, PatientSummary, ConsultationEntities, IcdCode, SoapNote,
} from "../../../../services/consultationService";
import { getDoctorPdfUrl } from "../../../../services/consultationService";

interface AIAssistantPanelProps {
  aiPanelCollapsed: boolean;
  setAiPanelCollapsed: (v: boolean) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  /* ── Real data from consultation pipeline ── */
  consultationId?: string | null;
  doctorSummary?: DoctorSummary | null;
  patientSummary?: PatientSummary | null;
  entities?: ConsultationEntities | null;
  icdCodes?: IcdCode[] | null;
  soapNote?: SoapNote | null;
  isComplete?: boolean;
}

const AIAssistantPanel = ({
  aiPanelCollapsed,
  setAiPanelCollapsed,
  isMobile = false,
  isOpen = false,
  consultationId = null,
  doctorSummary = null,
  patientSummary = null,
  entities = null,
  icdCodes = null,
  soapNote = null,
  isComplete = false,
}: AIAssistantPanelProps) => {
  const [chatTab, setChatTab] = useState<'summary' | 'insights' | 'alerts'>('summary');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hello! I\'m your AI assistant. Complete a consultation to see real-time results here.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I\'m analyzing your request. This is a simulated response — in production, I\'d be connected to your clinical AI engine.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  const mobileStyles = isMobile ? {
    position: 'fixed' as const,
    right: isOpen ? 0 : '-100%',
    top: '56px',
    bottom: 0,
    width: '320px',
    zIndex: 50,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } : {};

  // Choose tabs based on whether we have data
  const tabs = isComplete
    ? [
        { id: 'summary' as const, label: 'Summary', icon: ClipboardList },
        { id: 'insights' as const, label: 'Details', icon: Sparkles },
        { id: 'alerts' as const, label: 'Alerts', icon: AlertCircle },
      ]
    : [
        { id: 'summary' as const, label: 'Chat', icon: MessageSquare },
        { id: 'insights' as const, label: 'Insights', icon: Sparkles },
        { id: 'alerts' as const, label: 'Alerts', icon: AlertCircle },
      ];

  return (
    <aside
      style={{
        backgroundColor: '#F8FDFD',
        borderLeft: '1px solid rgba(31,159,163,0.12)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '320px' : (aiPanelCollapsed ? '60px' : '320px'),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...mobileStyles
      }}
    >
      {!aiPanelCollapsed && (
        <>
          {/* ── HEADER ── */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(31,159,163,0.1)',
            background: 'linear-gradient(180deg, rgba(31,159,163,0.06) 0%, transparent 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: isComplete
                  ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)'
                  : 'linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(31,159,163,0.25)'
              }}>
                <Sparkles size={17} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0B3C3D', margin: 0, letterSpacing: '-0.2px' }}>
                  {isComplete ? 'Consultation Results' : 'AI Assistant'}
                </h3>
                <p style={{ fontSize: '11px', color: '#1F9FA3', margin: 0, fontWeight: 500 }}>
                  {isComplete ? 'MedGemma Analysis' : 'Diagnostic-IQ'}
                </p>
              </div>
            </div>

            {/* ── TABS ── */}
            <div style={{
              display: 'flex', gap: '4px',
              backgroundColor: 'rgba(31,159,163,0.06)',
              borderRadius: '10px', padding: '3px'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChatTab(tab.id)}
                  style={{
                    flex: 1, padding: '7px 8px', border: 'none', borderRadius: '8px',
                    fontSize: '11.5px', fontWeight: chatTab === tab.id ? 600 : 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '5px',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    backgroundColor: chatTab === tab.id ? 'white' : 'transparent',
                    color: chatTab === tab.id ? '#1F9FA3' : '#94A3B8',
                    boxShadow: chatTab === tab.id ? '0 1px 4px rgba(31,159,163,0.12)' : 'none'
                  }}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════ SUMMARY / CHAT TAB ══════════ */}
          {chatTab === 'summary' && (
            <>
              {isComplete && doctorSummary ? (
                /* ── Real doctor summary from MedGemma ── */
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Chief Complaint */}
                  {doctorSummary.chief_complaint && (
                    <SectionCard icon={Stethoscope} title="Chief Complaint" color="#1F9FA3">
                      <p style={pStyle}>{doctorSummary.chief_complaint}</p>
                    </SectionCard>
                  )}

                  {/* Assessment */}
                  {doctorSummary.assessment && (
                    <SectionCard icon={Activity} title="Assessment" color="#7C3AED">
                      <p style={pStyle}>{doctorSummary.assessment}</p>
                    </SectionCard>
                  )}

                  {/* Diagnoses */}
                  {doctorSummary.diagnoses && doctorSummary.diagnoses.length > 0 && (
                    <SectionCard icon={FileText} title="Diagnoses" color="#DC2626">
                      {doctorSummary.diagnoses.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < doctorSummary.diagnoses!.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                          <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>{d.condition}</span>
                          {d.icd_code && <span style={{ fontSize: '10px', color: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.08)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{d.icd_code}</span>}
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Plan */}
                  {doctorSummary.plan && doctorSummary.plan.length > 0 && (
                    <SectionCard icon={ClipboardList} title="Treatment Plan" color="#16A34A">
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {doctorSummary.plan.map((p, i) => (
                          <li key={i} style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>{p}</li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {/* Medications */}
                  {doctorSummary.medications_prescribed && doctorSummary.medications_prescribed.length > 0 && (
                    <SectionCard icon={Pill} title="Medications" color="#F59E0B">
                      {doctorSummary.medications_prescribed.map((m, i) => (
                        <div key={i} style={{ padding: '6px 0', borderBottom: i < doctorSummary.medications_prescribed!.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{m.name} {m.dosage}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{m.frequency} · {m.duration}</div>
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Follow-up */}
                  {doctorSummary.follow_up && (
                    <SectionCard icon={TrendingUp} title="Follow-up" color="#0EA5E9">
                      <p style={pStyle}>{doctorSummary.follow_up}</p>
                    </SectionCard>
                  )}

                  {/* SOAP Note */}
                  {soapNote && (
                    <SectionCard icon={FileText} title="SOAP Note" color="#64748B">
                      {soapNote.subjective && <><strong style={{ fontSize: '11px', color: '#1F9FA3' }}>S:</strong> <span style={{ fontSize: '12px', color: '#475569' }}>{soapNote.subjective}</span><br /></>}
                      {soapNote.objective && <><strong style={{ fontSize: '11px', color: '#1F9FA3' }}>O:</strong> <span style={{ fontSize: '12px', color: '#475569' }}>{soapNote.objective}</span><br /></>}
                      {soapNote.assessment && <><strong style={{ fontSize: '11px', color: '#1F9FA3' }}>A:</strong> <span style={{ fontSize: '12px', color: '#475569' }}>{soapNote.assessment}</span><br /></>}
                      {soapNote.plan && <><strong style={{ fontSize: '11px', color: '#1F9FA3' }}>P:</strong> <span style={{ fontSize: '12px', color: '#475569' }}>{soapNote.plan}</span></>}
                    </SectionCard>
                  )}

                  {/* Download PDF */}
                  {consultationId && (
                    <a
                      href={getDoctorPdfUrl(consultationId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '12px', borderRadius: '12px', textDecoration: 'none',
                        background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                        color: 'white', fontSize: '13px', fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(31,159,163,0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Download size={15} /> Download Doctor Report (PDF)
                    </a>
                  )}
                </div>
              ) : (
                /* ── Chat fallback when no consultation results ── */
                <>
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '14px'
                  }}>
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {msg.role === 'assistant' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '6px',
                              backgroundColor: 'rgba(31,159,163,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Sparkles size={11} color="#1F9FA3" />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#1F9FA3' }}>AI Assistant</span>
                          </div>
                        )}
                        <div style={{
                          maxWidth: '88%', padding: '10px 14px',
                          borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                          background: msg.role === 'user' ? 'linear-gradient(135deg, #1F9FA3, #17858A)' : 'white',
                          color: msg.role === 'user' ? 'white' : '#334155',
                          fontSize: '13px', lineHeight: '1.6',
                          boxShadow: msg.role === 'user'
                            ? '0 2px 8px rgba(31,159,163,0.25)'
                            : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(31,159,163,0.06)',
                          whiteSpace: 'pre-line'
                        }}>
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', padding: '0 4px' }}>{msg.time}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Chat input */}
                  <div style={{
                    padding: '12px 14px 14px',
                    borderTop: '1px solid rgba(31,159,163,0.08)',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(31,159,163,0.03) 100%)'
                  }}>
                    <div style={{
                      display: 'flex', gap: '8px', alignItems: 'flex-end',
                      backgroundColor: 'white', borderRadius: '14px',
                      border: '1.5px solid rgba(31,159,163,0.15)',
                      padding: '4px 4px 4px 14px',
                      boxShadow: '0 1px 4px rgba(31,159,163,0.06)'
                    }}>
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                        }}
                        placeholder="Ask anything..."
                        rows={1}
                        style={{
                          flex: 1, resize: 'none', border: 'none',
                          padding: '8px 0', fontSize: '13px', fontFamily: 'inherit',
                          outline: 'none', backgroundColor: 'transparent',
                          maxHeight: '80px', overflowY: 'auto', color: '#334155', lineHeight: '1.4'
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        style={{
                          width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                          cursor: chatInput.trim() ? 'pointer' : 'default',
                          background: chatInput.trim() ? 'linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)' : 'rgba(31,159,163,0.06)',
                          color: chatInput.trim() ? 'white' : '#CBD5E1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Send size={16} style={{ transform: 'rotate(-45deg)', marginLeft: '2px', marginBottom: '1px' }} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══════════ INSIGHTS / DETAILS TAB ══════════ */}
          {chatTab === 'insights' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isComplete && entities ? (
                <>
                  {/* ICD Codes */}
                  {icdCodes && icdCodes.length > 0 && (
                    <SectionCard icon={TrendingUp} title="ICD Codes" color="#7C3AED">
                      {icdCodes.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', padding: '4px 0' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', fontFamily: 'monospace', minWidth: '60px' }}>{c.code}</span>
                          <span style={{ fontSize: '12px', color: '#475569' }}>{c.description}</span>
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Vitals */}
                  {entities.vitals && entities.vitals.length > 0 && (
                    <SectionCard icon={Activity} title="Extracted Vitals" color="#0EA5E9">
                      {entities.vitals.map((v: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{v.name || v.type || 'Vital'}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{v.value} {v.unit || ''}</span>
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Symptoms */}
                  {entities.symptoms && entities.symptoms.length > 0 && (
                    <SectionCard icon={Stethoscope} title="Symptoms Identified" color="#F59E0B">
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {entities.symptoms.map((s: any, i: number) => (
                          <li key={i} style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>
                            {s.name || s.symptom || JSON.stringify(s)}
                            {s.severity && <span style={{ fontSize: '10px', color: '#DC2626', marginLeft: '6px' }}>({s.severity})</span>}
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {/* Medications found in conversation */}
                  {entities.medications && entities.medications.length > 0 && (
                    <SectionCard icon={Pill} title="Medications Mentioned" color="#16A34A">
                      {entities.medications.map((m: any, i: number) => (
                        <div key={i} style={{ padding: '4px 0', fontSize: '12px', color: '#334155' }}>
                          <strong>{m.name || m.medication}</strong> {m.dosage && `· ${m.dosage}`} {m.frequency && `· ${m.frequency}`}
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Diagnoses from entities */}
                  {entities.diagnoses && entities.diagnoses.length > 0 && (
                    <SectionCard icon={FileText} title="Diagnoses (Entity Extraction)" color="#DC2626">
                      {entities.diagnoses.map((d: any, i: number) => (
                        <div key={i} style={{ padding: '4px 0', fontSize: '12px', color: '#334155' }}>
                          {d.name || d.diagnosis || JSON.stringify(d)}
                        </div>
                      ))}
                    </SectionCard>
                  )}
                </>
              ) : (
                /* Placeholder */
                <>
                  <EmptyInsightCard icon={Sparkles} title="Clinical Insight" color="#1F9FA3"
                    text="Complete a consultation to see AI-extracted clinical insights here." />
                  <EmptyInsightCard icon={TrendingUp} title="Suggested Actions" color="#1F9FA3"
                    text="ICD codes, medications, and follow-up recommendations will appear here after analysis." />
                </>
              )}
            </div>
          )}

          {/* ══════════ ALERTS TAB ══════════ */}
          {chatTab === 'alerts' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isComplete && entities ? (
                <>
                  {/* Allergies */}
                  {entities.allergies && entities.allergies.length > 0 && (
                    <SectionCard icon={ShieldAlert} title="Allergy Alerts" color="#DC2626">
                      {entities.allergies.map((a: any, i: number) => (
                        <div key={i} style={{ padding: '6px 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <AlertCircle size={14} color="#DC2626" />
                          <span style={{ fontSize: '12px', color: '#7F1D1D', fontWeight: 500 }}>{a.name || a.allergen || JSON.stringify(a)}</span>
                          {a.reaction && <span style={{ fontSize: '10px', color: '#991B1B' }}>— {a.reaction}</span>}
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Warning signs from patient summary */}
                  {patientSummary?.warning_signs && patientSummary.warning_signs.length > 0 && (
                    <SectionCard icon={AlertCircle} title="Warning Signs" color="#F59E0B">
                      <ul style={{ paddingLeft: '16px', margin: 0 }}>
                        {patientSummary.warning_signs.map((w, i) => (
                          <li key={i} style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.8' }}>{w}</li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {/* Patient-friendly summary preview */}
                  {patientSummary && (
                    <SectionCard icon={Heart} title="Patient Summary Preview" color="#16A34A">
                      {patientSummary.visit_summary && <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 6px', lineHeight: '1.6' }}>{patientSummary.visit_summary}</p>}
                      {patientSummary.your_diagnosis && <p style={{ fontSize: '12px', color: '#334155', margin: '0 0 6px', fontWeight: 600 }}>Diagnosis: {patientSummary.your_diagnosis}</p>}
                      {patientSummary.encouraging_note && <p style={{ fontSize: '11px', color: '#16A34A', margin: 0, fontStyle: 'italic' }}>"{patientSummary.encouraging_note}"</p>}
                    </SectionCard>
                  )}

                  {/* Follow-up reminder */}
                  {doctorSummary?.follow_up && (
                    <SectionCard icon={TrendingUp} title="Follow-up Reminder" color="#0EA5E9">
                      <p style={pStyle}>{doctorSummary.follow_up}</p>
                    </SectionCard>
                  )}

                  {/* No allergies fallback */}
                  {(!entities.allergies || entities.allergies.length === 0) && (
                    <EmptyInsightCard icon={ShieldAlert} title="No Allergy Alerts" color="#16A34A"
                      text="No allergies were detected in this consultation." />
                  )}
                </>
              ) : (
                <>
                  <EmptyInsightCard icon={AlertCircle} title="Allergy Alerts" color="#DC2626"
                    text="Complete a consultation to see allergy and drug interaction alerts." />
                  <EmptyInsightCard icon={Heart} title="Patient Summary" color="#16A34A"
                    text="A patient-friendly summary will be generated and emailed after consultation." />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── COLLAPSED STATE ── */}
      {aiPanelCollapsed && (
        <div style={{
          padding: '16px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: isComplete
              ? 'linear-gradient(135deg, #16A34A, #15803D)'
              : 'linear-gradient(135deg, #1F9FA3, #17858A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(31,159,163,0.25)'
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div style={{ width: '20px', height: '1px', backgroundColor: 'rgba(31,159,163,0.15)', margin: '2px 0' }} />
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setChatTab(tab.id); setAiPanelCollapsed(false); }}
              title={tab.label}
              style={{
                width: '38px', height: '38px', borderRadius: '10px',
                border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: chatTab === tab.id ? 'rgba(31,159,163,0.1)' : 'transparent',
                color: chatTab === tab.id ? '#1F9FA3' : '#94A3B8',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)'
              }}
              onMouseEnter={(e) => {
                if (chatTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.06)';
                  e.currentTarget.style.color = '#1F9FA3';
                }
              }}
              onMouseLeave={(e) => {
                if (chatTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }
              }}
            >
              <tab.icon size={18} strokeWidth={chatTab === tab.id ? 2.5 : 2} />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};

/* ──────────── Shared styles & sub-components ──────────── */

const pStyle: React.CSSProperties = {
  fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: '1.6',
};

function SectionCard({ icon: Icon, title, color, children }: {
  icon: any; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '14px', borderRadius: '12px',
        backgroundColor: `${color}08`,
        border: `1px solid ${color}18`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={14} color={color} />
        </div>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>{title}</h4>
      </div>
      {children}
    </motion.div>
  );
}

function EmptyInsightCard({ icon: Icon, title, color, text }: {
  icon: any; title: string; color: string; text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '14px', borderRadius: '12px',
        backgroundColor: 'rgba(31,159,163,0.04)',
        border: '1px solid rgba(31,159,163,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={14} color={color} />
        </div>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>{title}</h4>
      </div>
      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: '1.6' }}>{text}</p>
    </motion.div>
  );
}

export default AIAssistantPanel;
