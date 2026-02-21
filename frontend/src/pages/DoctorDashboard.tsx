import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Users, AlertTriangle, Search, Mic, MicOff,
  FileText, Pill, Calendar, Check, X, LogOut, ClipboardList
} from "lucide-react";

const mockAppointments = [
  { id: 1, patient: "Rahul Sharma", time: "10:00 AM", type: "Follow-up" },
  { id: 2, patient: "Priya Patel", time: "11:30 AM", type: "New Visit" },
  { id: 3, patient: "Amit Kumar", time: "02:00 PM", type: "Emergency" },
];

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "consultation" | "emr">("dashboard");
  const [isRecording, setIsRecording] = useState(false);
  const [consultationStep, setConsultationStep] = useState(0);

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: Activity },
    { id: "search" as const, label: "Patient Search", icon: Search },
    { id: "consultation" as const, label: "Consultation", icon: Mic },
    { id: "emr" as const, label: "EMR Records", icon: ClipboardList },
  ];

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
          <span className="badge badge-teal mt-auto mb-auto" style={{ marginLeft: 'auto' }}>Doctor</span>
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
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2>Today's Overview</h2>
              <p className="text-secondary text-sm">Welcome back, Dr. Smith</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-4 gap-4" style={{ marginBottom: 'var(--space-8)' }}>
              {[
                { label: "Total Patients", value: "24", icon: Users, color: "var(--color-primary)" },
                { label: "Emergency", value: "3", icon: AlertTriangle, color: "var(--color-red)" },
                { label: "Appointments", value: "12", icon: Calendar, color: "var(--color-blue)" },
                { label: "EMRs Generated", value: "18", icon: FileText, color: "var(--color-primary-700)" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card card-body">
                  <div className="flex flex-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
                    <Icon size={20} color={color} />
                    <span className="font-bold" style={{ fontSize: 'var(--text-h3)' }}>{value}</span>
                  </div>
                  <p className="text-sm text-secondary">{label}</p>
                </div>
              ))}
            </div>

            {/* Appointment Approvals */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 'var(--text-h4)' }}>Pending Appointments</h3>
                <span className="badge badge-amber">{mockAppointments.length} pending</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mockAppointments.map((apt, index) => (
                  <div 
                    key={apt.id} 
                    className="flex flex-between items-center" 
                    style={{ 
                      padding: 'var(--space-3) var(--space-6)',
                      borderBottom: index !== mockAppointments.length - 1 ? '1px solid var(--color-border)' : 'none'
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">{apt.patient}</p>
                      <p className="text-caption text-muted">{apt.time} · {apt.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-icon" style={{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary)' }}>
                        <Check size={16} />
                      </button>
                      <button className="btn btn-icon" style={{ backgroundColor: 'var(--color-red-soft)', color: 'var(--color-red)' }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATIENT SEARCH */}
        {activeTab === "search" && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Patient Search</h2>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--color-text-muted)' }} />
                <input type="text" placeholder="Enter patient phone number..." style={{ paddingLeft: '40px' }} />
              </div>

              {/* Mock result */}
              <div className="card card-body" style={{ marginTop: 'var(--space-6)' }}>
                <div className="flex flex-between items-start">
                  <div>
                    <h3 style={{ fontSize: 'var(--text-h4)' }}>Rahul Sharma</h3>
                    <p className="text-sm text-muted">+91 98765 43210 · Male, 34 yrs</p>
                  </div>
                  <span className="badge badge-teal">Active</span>
                </div>
                <hr className="divider-sm" />
                <div className="text-sm space-y-2">
                  <p className="text-muted"><strong className="text-primary">Last Visit:</strong> Feb 15, 2026 — Routine Check-up</p>
                  <p className="text-muted"><strong className="text-primary">Conditions:</strong> Type 2 Diabetes, Hypertension</p>
                </div>
                <button 
                  className="btn btn-primary mt-auto" 
                  style={{ marginTop: 'var(--space-4)' }}
                  onClick={() => { setActiveTab("consultation"); setConsultationStep(0); }}
                >
                  <Mic size={16} /> Start Consultation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONSULTATION */}
        {activeTab === "consultation" && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Consultation</h2>
            
            {/* Steps indicator */}
            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-8)' }}>
              {["Recording", "AI Processing", "Generated Output"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div 
                    className="flex flex-center" 
                    style={{ 
                      height: '32px', width: '32px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-caption)', fontWeight: 'bold',
                      backgroundColor: consultationStep >= i ? 'var(--color-primary)' : 'var(--color-neutral-400)',
                      color: consultationStep >= i ? 'var(--color-white)' : 'var(--color-text-muted)'
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-secondary">{step}</span>
                  {i < 2 && <div style={{ height: '2px', width: '32px', backgroundColor: consultationStep > i ? 'var(--color-primary)' : 'var(--color-border)' }} />}
                </div>
              ))}
            </div>

            {/* Step 0: Recording */}
            {consultationStep === 0 && (
              <div className="card card-body text-center m-auto" style={{ maxWidth: '400px', padding: 'var(--space-10) var(--space-6)' }}>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={isRecording ? "animate-pulse" : ""}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto var(--space-4)', height: '80px', width: '80px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
                    backgroundColor: isRecording ? 'var(--color-red)' : 'var(--color-primary)',
                    color: 'var(--color-white)',
                    boxShadow: isRecording ? '0 0 0 8px var(--color-red-soft)' : 'none'
                  }}
                >
                  {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <h3 style={{ fontSize: 'var(--text-h4)' }}>{isRecording ? "Recording..." : "Start Recording"}</h3>
                <p className="text-sm text-muted">Capture doctor-patient conversation</p>
                {isRecording && (
                  <button 
                    className="btn btn-secondary mt-auto" 
                    style={{ marginTop: 'var(--space-6)' }} 
                    onClick={() => { setIsRecording(false); setConsultationStep(1); setTimeout(() => setConsultationStep(2), 2000); }}
                  >
                    Stop & Process
                  </button>
                )}
              </div>
            )}

            {/* Step 1: Processing */}
            {consultationStep === 1 && (
              <div className="card card-body text-center m-auto" style={{ maxWidth: '400px', padding: 'var(--space-10) var(--space-6)' }}>
                <div className="animate-spin m-auto" style={{ height: '48px', width: '48px', border: '4px solid var(--color-primary-200)', borderTopColor: 'var(--color-primary)', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-4)' }} />
                <h3 style={{ fontSize: 'var(--text-h4)' }}>AI Processing...</h3>
                <p className="text-sm text-muted">Extracting vitals, symptoms & diagnosis</p>
              </div>
            )}

            {/* Step 2: Output */}
            {consultationStep === 2 && (
              <div className="grid grid-2 gap-6">
                <div className="card card-body">
                  <h3 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-h4)' }}>
                    <FileText size={20} color="var(--color-primary)" /> EMR Entry
                  </h3>
                  <div className="text-sm flex flex-col gap-3">
                    {[
                      ["Patient", "Rahul Sharma, 34M"],
                      ["Symptoms", "Persistent headache, fatigue, blurred vision"],
                      ["Vitals", "BP: 150/95, HR: 82, Temp: 98.6°F"],
                      ["Diagnosis", "Hypertensive episode"],
                      ["ICD Code", "I10 — Essential Hypertension"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="font-medium text-muted">{label}</p>
                        <p className="text-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card card-body">
                  <h3 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-h4)' }}>
                    <Pill size={20} color="var(--color-primary)" /> Suggested Treatment
                  </h3>
                  <div className="text-sm flex flex-col gap-3">
                    <div style={{ backgroundColor: 'var(--color-primary-100)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                      <p className="font-medium" style={{ color: 'var(--color-primary-dark)' }}>Amlodipine 5mg</p>
                      <p className="text-muted">Once daily, morning</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-primary-100)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                      <p className="font-medium" style={{ color: 'var(--color-primary-dark)' }}>Losartan 50mg</p>
                      <p className="text-muted">Once daily, evening</p>
                    </div>
                    <div className="alert alert-warning" style={{ marginTop: 'var(--space-2)' }}>
                      <div>
                        <p className="font-bold">⚠ Contraindication Alert</p>
                        <p>Check for existing ACE inhibitor use</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" style={{ marginTop: 'var(--space-6)' }}>
                    <button className="btn btn-primary btn-sm">Save EMR</button>
                    <button className="btn btn-ghost btn-sm">Print</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab("emr")}>View Records</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EMR RECORDS */}
        {activeTab === "emr" && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: 'var(--space-6)' }}>EMR Records</h2>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Date</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Patient</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Diagnosis</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>ICD</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: "Feb 21, 2026", patient: "Rahul Sharma", diag: "Hypertensive episode", icd: "I10", status: "Completed" },
                    { date: "Feb 20, 2026", patient: "Priya Patel", diag: "Acute bronchitis", icd: "J20.9", status: "Pending" },
                    { date: "Feb 19, 2026", patient: "Amit Kumar", diag: "Type 2 Diabetes", icd: "E11", status: "Completed" },
                  ].map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{r.date}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--font-weight-medium)' }}>{r.patient}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>{r.diag}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}><span className="badge badge-neutral">{r.icd}</span></td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span className={`badge ${r.status === "Completed" ? "badge-teal" : "badge-amber"}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;