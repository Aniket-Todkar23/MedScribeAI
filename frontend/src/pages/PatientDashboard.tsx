import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Heart, Droplets, Pill, Calendar, MessageCircle,
  FileText, LogOut, Send, Download, AlertTriangle, Clock
} from "lucide-react";

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState<"health" | "reports" | "medications" | "appointments" | "chat">("health");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hello! I'm your AI health assistant. How can I help you today?" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const tabs = [
    { id: "health" as const, label: "Health Status", icon: Heart },
    { id: "reports" as const, label: "Reports", icon: FileText },
    { id: "medications" as const, label: "Medications", icon: Pill },
    { id: "appointments" as const, label: "Appointments", icon: Calendar },
    { id: "chat" as const, label: "AI Chat", icon: MessageCircle },
  ];

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: chatInput },
      { role: "assistant", text: "Based on your health records, your blood pressure has been well-controlled this week. Continue taking your medication as prescribed and maintain a low-sodium diet. Feel free to ask more questions!" },
    ]);
    setChatInput("");
  };

  return (
    <div className="flex" style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
      
      {/* Sidebar */}
      <aside 
        style={{ 
          width: '260px', 
          backgroundColor: 'var(--color-white)', 
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="flex items-center gap-2" style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <Activity size={24} color="var(--color-primary)" />
          <span className="font-bold" style={{ fontSize: 'var(--text-h4)' }}>AI-NETRA</span>
          <span className="badge badge-blue mt-auto mb-auto" style={{ marginLeft: 'auto' }}>Patient</span>
        </div>
        
        <nav style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: activeTab === id ? 'var(--color-primary-100)' : 'transparent',
                color: activeTab === id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === id ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'all var(--transition)'
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
          <Link to="/" className="btn btn-ghost btn-full justify-start text-muted">
            <LogOut size={18} /> Logout
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 'var(--space-8) var(--content-padding)', overflowY: 'auto' }}>
        
        {/* TAB 1: HEALTH STATUS */}
        {activeTab === "health" && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2>Health Status</h2>
              <p className="text-secondary text-sm">Welcome, Rahul Sharma</p>
            </div>

            <div className="grid grid-4 gap-4" style={{ marginBottom: 'var(--space-8)' }}>
              {[
                { label: "Blood Pressure", value: "120/80", status: "Normal", icon: Heart, badge: "badge-teal" },
                { label: "Sugar Level", value: "180 mg/dL", status: "High", icon: Droplets, badge: "badge-red" },
                { label: "Compliance", value: "90%", status: "Good", icon: Pill, badge: "badge-teal" },
                { label: "Next Visit", value: "3 Days", status: "Upcoming", icon: Clock, badge: "badge-blue" },
              ].map(({ label, value, status, icon: Icon, badge }) => (
                <div key={label} className="card card-body">
                  <div className="flex flex-between items-start" style={{ marginBottom: 'var(--space-4)' }}>
                    <Icon size={24} color="var(--color-primary)" />
                    <span className={`badge ${badge}`}>{status}</span>
                  </div>
                  <p className="font-bold" style={{ fontSize: 'var(--text-h3)' }}>{value}</p>
                  <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Quick Alert */}
            <div className="alert alert-warning">
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p className="font-semibold" style={{ marginBottom: '2px' }}>Sugar Level Alert</p>
                <p>Your blood sugar is above the recommended range. Please consult your doctor.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REPORTS */}
        {activeTab === "reports" && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Reports</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { date: "Feb 15, 2026", doctor: "Dr. Smith", summary: "Routine check-up — Blood pressure normal, sugar slightly elevated", symptoms: "Fatigue, headache" },
                { date: "Jan 28, 2026", doctor: "Dr. Smith", summary: "Follow-up — Medication adjusted for diabetes", symptoms: "Dizziness, thirst" },
                { date: "Jan 10, 2026", doctor: "Dr. Gupta", summary: "Initial consultation — Diagnosed with Type 2 Diabetes", symptoms: "Frequent urination, weight loss" },
              ].map((report) => (
                <div key={report.date} className="card card-body">
                  <div className="flex flex-between items-start">
                    <div>
                      <h3 style={{ fontSize: 'var(--text-h4)' }}>{report.date}</h3>
                      <p className="text-sm text-secondary">{report.doctor}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm">
                      <Download size={14} /> PDF
                    </button>
                  </div>
                  <hr className="divider-sm" />
                  <p className="text-sm">{report.summary}</p>
                  <p className="text-caption text-muted" style={{ marginTop: 'var(--space-2)' }}>
                    <strong>Symptoms:</strong> {report.symptoms}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEDICATIONS */}
        {activeTab === "medications" && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Current Medications</h2>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Medicine</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Dose</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Time</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { medicine: "Metformin", dose: "500mg", time: "Morning & Evening", active: true },
                    { medicine: "Amlodipine", dose: "5mg", time: "Morning", active: true },
                    { medicine: "Vitamin D3", dose: "60K IU", time: "Weekly (Sunday)", active: false },
                  ].map((med) => (
                    <tr key={med.medicine} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)' }}>{med.medicine}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>{med.dose}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>{med.time}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div 
                          style={{ 
                            display: 'inline-flex', alignItems: 'center', height: '24px', width: '44px', borderRadius: 'var(--radius-full)', 
                            backgroundColor: med.active ? 'var(--color-primary)' : 'var(--color-neutral-400)',
                            padding: '2px', transition: 'background var(--transition)'
                          }}
                        >
                          <div 
                            style={{ 
                              height: '20px', width: '20px', borderRadius: '50%', backgroundColor: 'var(--color-white)', 
                              transform: med.active ? 'translateX(20px)' : 'translateX(0)', transition: 'transform var(--transition)' 
                            }} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <div className="animate-fade-in">
            <div className="flex flex-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
              <h2>Appointments</h2>
              <button className="btn btn-primary">
                <Calendar size={18} /> Request New
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { date: "Feb 24, 2026", time: "10:00 AM", doctor: "Dr. Smith", type: "Follow-up", status: "Confirmed" },
                { date: "Mar 10, 2026", time: "2:30 PM", doctor: "Dr. Gupta", type: "Lab Review", status: "Pending" },
              ].map((apt) => (
                <div key={apt.date} className="card card-body flex flex-between items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex flex-col flex-center text-primary" 
                      style={{ height: '64px', width: '64px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-100)' }}
                    >
                      <span className="text-caption font-bold" style={{ lineHeight: 1, marginBottom: '4px' }}>
                        {apt.date.split(' ')[0].toUpperCase()}
                      </span>
                      <span style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-bold)', lineHeight: 1 }}>
                        {apt.date.split(' ')[1].replace(',', '')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold" style={{ fontSize: 'var(--text-h4)' }}>{apt.doctor}</p>
                      <p className="text-sm text-secondary">{apt.time} · {apt.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`badge ${apt.status === "Confirmed" ? "badge-teal" : "badge-amber"}`}>
                      {apt.status}
                    </span>
                    <button className="btn btn-ghost btn-sm">Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AI CHAT */}
        {activeTab === "chat" && (
          <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - var(--space-16))' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>AI Health Assistant</h2>
            
            {/* Chat Box */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div 
                      style={{ 
                        maxWidth: '80%', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)',
                        borderRadius: 'var(--radius-lg)', 
                        backgroundColor: msg.role === "user" ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: msg.role === "user" ? 'var(--color-white)' : 'var(--color-text-primary)',
                        border: msg.role === "user" ? 'none' : '1px solid var(--color-border)',
                        borderBottomRightRadius: msg.role === "user" ? '4px' : 'var(--radius-lg)',
                        borderBottomLeftRadius: msg.role === "assistant" ? '4px' : 'var(--radius-lg)'
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="card-footer" style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--color-white)' }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your health..."
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    style={{ flex: 1 }}
                  />
                  <button onClick={handleSendChat} className="btn btn-primary btn-icon">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default PatientDashboard;