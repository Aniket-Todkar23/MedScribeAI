import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageSquare, AlertCircle, Send, TrendingUp, Heart, Calendar, Loader2, User, Bot
} from "lucide-react";
import type { ChatMessage } from "./types";
import { aiService } from "../../../../services/aiService";

interface AIAssistantPanelProps {
  aiPanelCollapsed: boolean;
  setAiPanelCollapsed: (v: boolean) => void;
  isMobile?: boolean;
  isOpen?: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    text: "Hello Doctor! I'm your AI clinical assistant. I can help with patient analysis, drug interactions, and clinical decision support. How can I help you today?",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const AIAssistantPanel = ({
  aiPanelCollapsed,
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + "px";
    }
  }, [chatInput]);

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isLoading) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { role: 'user', text: trimmed, time: now }]);
    setChatInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const reply = await aiService.chat(trimmed, { role: "doctor" });
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: reply.text,
        time: reply.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      console.error("AI chat error:", err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: "I'm sorry, I couldn't process your request right now. Please try again in a moment.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const mobileStyles = isMobile ? {
    position: 'fixed' as const,
    right: isOpen ? 0 : '-100%',
    top: '56px',
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
    <aside
      style={{
        backgroundColor: '#F8FDFD',
        borderLeft: '1px solid rgba(31,159,163,0.12)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        width: isMobile ? '320px' : (aiPanelCollapsed ? '60px' : '320px'),
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...mobileStyles
      }}
    >
      {!aiPanelCollapsed && (
        <>
          {/* HEADER */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(31,159,163,0.1)',
            background: 'linear-gradient(180deg, rgba(31,159,163,0.06) 0%, transparent 100%)',
            flexShrink: 0,
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

            {/* TABS */}
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

          {/* CHAT TAB */}
          {chatTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Messages area */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                    style={{
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        minWidth: '28px',
                        borderRadius: '50%',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                          : 'linear-gradient(135deg, #1F9FA3, #17858A)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: msg.role === 'user'
                          ? '0 2px 6px rgba(99,102,241,0.3)'
                          : '0 2px 6px rgba(31,159,163,0.3)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {msg.role === 'user' ? (
                        <User size={14} color="white" />
                      ) : (
                        <Bot size={14} color="white" />
                      )}
                    </div>
                    {/* Message content */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', flex: 1, minWidth: 0 }}>
                      {msg.role === 'assistant' && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#1F9FA3', marginBottom: '3px' }}>AI Assistant</span>
                      )}
                      {msg.role === 'user' && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#6366F1', marginBottom: '3px' }}>You</span>
                      )}
                      <div style={{
                        maxWidth: '88%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #1F9FA3, #17858A)'
                          : 'white',
                        color: msg.role === 'user' ? 'white' : '#334155',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        boxShadow: msg.role === 'user'
                          ? '0 2px 8px rgba(31,159,163,0.25)'
                          : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(31,159,163,0.06)',
                        whiteSpace: 'pre-line'
                      }}>
                        {msg.text}
                      </div>
                      <span style={{
                        fontSize: '10px', color: '#94A3B8',
                        marginTop: '3px', padding: '0 4px'
                      }}>
                        {msg.time}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        minWidth: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(31,159,163,0.3)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <Bot size={14} color="white" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#1F9FA3', marginBottom: '3px' }}>AI Assistant</span>
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: '4px 14px 14px 14px',
                      background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(31,159,163,0.06)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      color: '#1F9FA3', fontSize: '12px', fontWeight: 500
                    }}>
                      <Loader2 size={14} className="ai-spin" />
                      Thinking...
                    </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{
                padding: '12px 14px 14px',
                borderTop: '1px solid rgba(31,159,163,0.08)',
                background: 'linear-gradient(180deg, transparent 0%, rgba(31,159,163,0.03) 100%)',
                flexShrink: 0,
              }}>
                {/* Quick suggestions */}
                <div style={{
                  display: 'flex', gap: '6px', marginBottom: '10px',
                  overflowX: 'auto', paddingBottom: '2px'
                }}>
                  {['Summarize vitals', 'Drug check', 'SOAP note'].map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setChatInput(s);
                        textareaRef.current?.focus();
                      }}
                      disabled={isLoading}
                      style={{
                        padding: '4px 10px', borderRadius: '20px',
                        border: '1px solid rgba(31,159,163,0.2)',
                        backgroundColor: 'rgba(31,159,163,0.04)',
                        color: '#1F9FA3', fontSize: '11px', fontWeight: 500,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                        opacity: isLoading ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.1)';
                          e.currentTarget.style.borderColor = 'rgba(31,159,163,0.35)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(31,159,163,0.2)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'flex-end',
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(31,159,163,0.15)',
                  padding: '4px 4px 4px 14px',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                  boxShadow: '0 1px 4px rgba(31,159,163,0.06)'
                }}>
                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isLoading ? "Waiting for response..." : "Ask anything..."}
                    disabled={isLoading}
                    rows={2}
                    style={{
                      flex: 1, resize: 'none', border: 'none',
                      padding: '8px 0',
                      fontSize: '13px', fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'transparent',
                      maxHeight: '120px', overflowY: 'auto',
                      color: '#334155', lineHeight: '1.4',
                      opacity: isLoading ? 0.6 : 1,
                      minHeight: 'unset',
                      height: 'auto',
                      width: 'auto',
                      boxShadow: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'transparent';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.borderColor = 'rgba(31,159,163,0.4)';
                        parent.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08), 0 1px 4px rgba(31,159,163,0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.borderColor = 'rgba(31,159,163,0.15)';
                        parent.style.boxShadow = '0 1px 4px rgba(31,159,163,0.06)';
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isLoading}
                    style={{
                      width: '36px', height: '36px', minWidth: '36px', minHeight: '36px',
                      borderRadius: '10px',
                      border: 'none',
                      padding: 0,
                      cursor: chatInput.trim() && !isLoading ? 'pointer' : 'default',
                      background: chatInput.trim() && !isLoading
                        ? 'linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)'
                        : 'rgba(31,159,163,0.06)',
                      color: chatInput.trim() && !isLoading ? 'white' : '#CBD5E1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      flexShrink: 0,
                      marginBottom: '4px',
                      boxShadow: chatInput.trim() && !isLoading ? '0 2px 8px rgba(31,159,163,0.3)' : 'none',
                      opacity: 1,
                    }}
                    onMouseEnter={(e) => {
                      if (chatInput.trim() && !isLoading) {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(31,159,163,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = chatInput.trim() && !isLoading ? '0 2px 8px rgba(31,159,163,0.3)' : 'none';
                    }}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="ai-spin" />
                    ) : (
                      <Send size={16} style={{
                        transform: 'rotate(-45deg)',
                        marginLeft: '2px', marginBottom: '1px'
                      }} />
                    )}
                  </button>
                </div>
                <p style={{
                  fontSize: '10px', color: '#94A3B8',
                  textAlign: 'center', marginTop: '8px', fontWeight: 500
                }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          )}

          {/* INSIGHTS TAB */}
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

          {/* ALERTS TAB */}
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

      {/* Spin animation */}
      <style>{`@keyframes ai-spin-kf { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .ai-spin { animation: ai-spin-kf 1s linear infinite; }`}</style>
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
