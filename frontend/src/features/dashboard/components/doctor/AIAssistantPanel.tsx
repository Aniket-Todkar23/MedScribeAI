import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, MessageSquare, AlertCircle, Send, TrendingUp, Heart, Calendar
} from "lucide-react";
import type { ChatMessage } from "./types";

interface AIAssistantPanelProps {
  aiPanelCollapsed: boolean;
  setAiPanelCollapsed: (v: boolean) => void;
  isMobile?: boolean;
  isOpen?: boolean;
}

const initialMessages: ChatMessage[] = [
  { role: 'assistant', text: 'Hello Dr. Hambire! I\'m your AI assistant. How can I help you today?', time: '10:30 AM' },
  { role: 'user', text: 'What are the latest vitals for the current patient?', time: '10:31 AM' },
  { role: 'assistant', text: 'Based on the latest records:\n• BP: 138/88 mmHg (slightly elevated)\n• Weight: 185 lbs\n• BMI: 26.5 (overweight)\n• Temp: 98.4°F (normal)\n• O₂: 97% (normal)\n\nI recommend monitoring the blood pressure closely.', time: '10:31 AM' }
];

const AIAssistantPanel = ({ 
  aiPanelCollapsed, 
  setAiPanelCollapsed,
  isMobile = false,
  isOpen = false
}: AIAssistantPanelProps) => {
  const [chatTab, setChatTab] = useState<'chat' | 'insights' | 'alerts'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);

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
    top: '56px', // Below header
    bottom: 0,
    width: '320px',
    zIndex: 50,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } : {};

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
                background: 'linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(31,159,163,0.25)'
              }}>
                <Sparkles size={17} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0B3C3D', margin: 0, letterSpacing: '-0.2px' }}>AI Assistant</h3>
                <p style={{ fontSize: '11px', color: '#1F9FA3', margin: 0, fontWeight: 500 }}>Diagnostic-IQ</p>
              </div>
            </div>

            {/* ── TABS ── */}
            <div style={{
              display: 'flex', gap: '4px',
              backgroundColor: 'rgba(31,159,163,0.06)',
              borderRadius: '10px', padding: '3px'
            }}>
              {[
                { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
                { id: 'insights' as const, label: 'Insights', icon: Sparkles },
                { id: 'alerts' as const, label: 'Alerts', icon: AlertCircle }
              ].map(tab => (
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

          {/* ── CHAT TAB ── */}
          {chatTab === 'chat' && (
            <>
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
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
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
                      maxWidth: '88%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                      backgroundColor: msg.role === 'user'
                        ? 'linear-gradient(135deg, #1F9FA3, #17858A)'
                        : 'white',
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
                      marginTop: '4px', padding: '0 4px'
                    }}>
                      {msg.time}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Input area */}
              <div style={{
                padding: '12px 14px 14px',
                borderTop: '1px solid rgba(31,159,163,0.08)',
                background: 'linear-gradient(180deg, transparent 0%, rgba(31,159,163,0.03) 100%)'
              }}>
                {/* Quick suggestions */}
                <div style={{
                  display: 'flex', gap: '6px', marginBottom: '10px',
                  overflowX: 'auto', paddingBottom: '2px'
                }}>
                  {['Summarize vitals', 'Drug check', 'SOAP note'].map(s => (
                    <button
                      key={s}
                      onClick={() => setChatInput(s)}
                      style={{
                        padding: '4px 10px', borderRadius: '20px',
                        border: '1px solid rgba(31,159,163,0.2)',
                        backgroundColor: 'rgba(31,159,163,0.04)',
                        color: '#1F9FA3', fontSize: '11px', fontWeight: 500,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(31,159,163,0.35)';
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
                }}
                onFocus={() => {}}
                >
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask anything..."
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', border: 'none',
                      padding: '8px 0',
                      fontSize: '13px', fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'transparent',
                      maxHeight: '80px', overflowY: 'auto',
                      color: '#334155',
                      lineHeight: '1.4'
                    }}
                    onFocus={(e) => {
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
                    disabled={!chatInput.trim()}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      border: 'none',
                      cursor: chatInput.trim() ? 'pointer' : 'default',
                      background: chatInput.trim()
                        ? 'linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)'
                        : 'rgba(31,159,163,0.06)',
                      color: chatInput.trim() ? 'white' : '#CBD5E1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      flexShrink: 0,
                      boxShadow: chatInput.trim() ? '0 2px 8px rgba(31,159,163,0.3)' : 'none',
                      transform: 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                      if (chatInput.trim()) {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(31,159,163,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = chatInput.trim() ? '0 2px 8px rgba(31,159,163,0.3)' : 'none';
                    }}
                  >
                    <Send size={16} style={{
                      transform: 'rotate(-45deg)',
                      marginLeft: '2px', marginBottom: '1px'
                    }} />
                  </button>
                </div>
                <p style={{
                  fontSize: '10px', color: '#94A3B8',
                  textAlign: 'center', marginTop: '8px', fontWeight: 500
                }}>
                  ↵ Enter to send · ⇧ Shift+Enter for new line
                </p>
              </div>
            </>
          )}

          {/* ── INSIGHTS TAB ── */}
          {chatTab === 'insights' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    backgroundColor: 'rgba(31,159,163,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Sparkles size={14} color="#1F9FA3" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>Clinical Insight</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
                  Patient shows elevated BP trends over the last 3 visits. Consider adjusting antihypertensive medication.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(31,159,163,0.04)',
                  border: '1px solid rgba(31,159,163,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: 'rgba(31,159,163,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <TrendingUp size={14} color="#1F9FA3" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>Suggested Actions</h4>
                </div>
                <ul style={{ fontSize: '13px', color: '#475569', paddingLeft: '18px', margin: 0, lineHeight: '2' }}>
                  <li>Review medication dosage</li>
                  <li>Schedule follow-up in 2 weeks</li>
                  <li>Recommend lifestyle changes</li>
                  <li>Order lipid panel + HbA1c</li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(245,158,11,0.04)',
                  border: '1px solid rgba(245,158,11,0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Heart size={14} color="#F59E0B" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', margin: 0 }}>Risk Assessment</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#78350F', margin: 0, lineHeight: '1.6' }}>
                  Moderate cardiovascular risk based on age, BP trends, and BMI. Framingham score: 15%.
                </p>
              </motion.div>
            </div>
          )}

          {/* ── ALERTS TAB ── */}
          {chatTab === 'alerts' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <AlertCircle size={14} color="#EF4444" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B', margin: 0 }}>Allergy Alert</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#7F1D1D', margin: 0, lineHeight: '1.6' }}>
                  Patient is allergic to <strong>Penicillin</strong> (causes rash). Avoid amoxicillin or ampicillin.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(245,158,11,0.04)',
                  border: '1px solid rgba(245,158,11,0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: 'rgba(245,158,11,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <AlertCircle size={14} color="#F59E0B" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', margin: 0 }}>Drug Interaction</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#78350F', margin: 0, lineHeight: '1.6' }}>
                  No critical interactions detected. Metformin + Atorvastatin combination is safe.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{
                  padding: '14px', borderRadius: '12px',
                  backgroundColor: 'rgba(31,159,163,0.04)',
                  border: '1px solid rgba(31,159,163,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    backgroundColor: 'rgba(31,159,163,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Calendar size={14} color="#1F9FA3" />
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>Follow-up Reminder</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
                  Patient's last HbA1c test was 3 months ago. Recommend scheduling a new test.
                </p>
              </motion.div>
            </div>
          )}
        </>
      )}

      {aiPanelCollapsed && (
        <div style={{
          padding: '16px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(31,159,163,0.25)'
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div style={{ width: '20px', height: '1px', backgroundColor: 'rgba(31,159,163,0.15)', margin: '2px 0' }} />
          {[
            { icon: MessageSquare, id: 'chat' as const, label: 'Chat' },
            { icon: Sparkles, id: 'insights' as const, label: 'Insights' },
            { icon: AlertCircle, id: 'alerts' as const, label: 'Alerts' }
          ].map(tab => (
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

export default AIAssistantPanel;
