import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Activity, Users, Search, Mic, MicOff,
  FileText, Calendar, LogOut, ChevronsLeft, ChevronsRight, ChevronLeft,
  Home, TrendingUp, Heart, Phone, Printer, ScrollText, Stethoscope,
  Send, Sparkles, MessageSquare, AlertCircle,
  Trash2, RotateCcw, Save, Plus, ClipboardList, AlertTriangle, Copy, Check
} from "lucide-react";

// Analytics Data
const diabetesData = [
  { name: "Diabetic", value: 234, color: "#D64545" },
  { name: "Non-Diabetic", value: 1013, color: "#1F9FA3" }
];

const heartDiseaseData = [
  { name: "Heart Disease", value: 187, color: "#F5A524" },
  { name: "Healthy", value: 1060, color: "#1F9FA3" }
];

const asthmaData = [
  { name: "Asthmatic", value: 156, color: "#1E9DF1" },
  { name: "Non-Asthmatic", value: 1091, color: "#1F9FA3" }
];

const ageDistributionData = [
  { name: "0-18", value: 98, color: "#4FBBC0" },
  { name: "19-35", value: 342, color: "#1F9FA3" },
  { name: "36-50", value: 487, color: "#136364" },
  { name: "51-65", value: 234, color: "#0B3C3D" },
  { name: "65+", value: 86, color: "#F5A524" }
];

const DoctorDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFound, setPatientFound] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeTab, setActiveTab] = useState("analytics");
  
  const [chatTab, setChatTab] = useState<'chat' | 'insights' | 'alerts'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello Dr. Hambire! I\'m your AI assistant. How can I help you today?', time: '10:30 AM' },
    { role: 'user', text: 'What are the latest vitals for the current patient?', time: '10:31 AM' },
    { role: 'assistant', text: 'Based on the latest records:\n• BP: 138/88 mmHg (slightly elevated)\n• Weight: 185 lbs\n• BMI: 26.5 (overweight)\n• Temp: 98.4°F (normal)\n• O₂: 97% (normal)\n\nI recommend monitoring the blood pressure closely.', time: '10:31 AM' }
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I\'m analyzing your request. This is a simulated response — in production, I\'d be connected to your clinical AI engine.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  // Prescription form state
  const [prescriptionData, setPrescriptionData] = useState({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    notes: '',
    medications: [{ drug: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  });
  const [rxValidation, setRxValidation] = useState(false);
  const [rxSaved, setRxSaved] = useState(false);

  const clearPrescriptionForm = () => {
    setPrescriptionData({
      patientName: patientFound ? examplePatient.full_name : '',
      date: new Date().toISOString().split('T')[0],
      diagnosis: '',
      notes: '',
      medications: [{ drug: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    });
    setRxValidation(false);
    setRxSaved(false);
  };

  const isPrescriptionValid = () => {
    if (!prescriptionData.patientName.trim()) return false;
    if (!prescriptionData.diagnosis.trim()) return false;
    return prescriptionData.medications.every(m => m.drug.trim() && m.dosage.trim() && m.frequency.trim());
  };

  const handleSavePrescription = () => {
    setRxValidation(true);
    if (!isPrescriptionValid()) return;
    setRxSaved(true);
    setTimeout(() => setRxSaved(false), 2500);
  };

  const handlePrintPrescription = () => {
    setRxValidation(true);
    if (!isPrescriptionValid()) return;
    window.print();
  };

  const duplicateLastMedication = () => {
    const last = prescriptionData.medications[prescriptionData.medications.length - 1];
    setPrescriptionData({
      ...prescriptionData,
      medications: [...prescriptionData.medications, { ...last }]
    });
  };

  // Example patient data with complete medical history
  const examplePatient = {
    patient_id: '550e8400-e29b-41d4-a716-446655440000',
    full_name: 'John Michael Doe',
    phone: '+1234567890',
    email: 'john.doe@email.com',
    date_of_birth: '1975-06-15',
    age: 49,
    gender: 'Male',
    blood_group: 'O+',
    address: '123 Medical Plaza, Suite 456, Healthcare City, HC 12345',
    emergency_contact: '+1234567899',
    emergency_contact_name: 'Jane Doe (Spouse)',
    
    // Medical History from Onboarding
    onboarding: {
      has_diabetes: true,
      diabetes_type: 'Type 2',
      on_insulin: false,
      has_heart_disease: true,
      heart_conditions: ['Angina', 'Arrhythmia'],
      has_lung_disease: false,
      taking_medications: true,
      medications_list: 'Metformin 500mg (2x daily), Atorvastatin 20mg (once daily), Aspirin 81mg (once daily)',
      has_allergies: true,
      allergies_list: 'Penicillin (causes rash), Pollen',
      smoking_status: 'Never',
      alcohol_use: 'Occasionally',
      had_major_surgeries: true,
      surgeries_details: 'Appendectomy (2005), Knee arthroscopy (2018)',
    },

    // Vital Signs (Latest)
    vitals: {
      blood_pressure: '138/88 mmHg',
      heart_rate: '82 bpm',
      temperature: '98.4°F',
      weight: '185 lbs',
      height: '5\'10"',
      bmi: 26.5,
      oxygen_saturation: '97%',
      recorded_at: 'Feb 21, 2026 10:30 AM'
    },

    // Past Consultations
    consultations: [
      {
        date: 'Feb 15, 2026',
        time: '2:30 PM',
        doctor_name: 'Dr. Sarah Johnson',
        chief_complaint: 'Chest pain and shortness of breath',
        diagnosis: 'Angina pectoris, Type 2 Diabetes follow-up',
        icd_codes: ['I20.9 - Angina pectoris', 'E11.9 - Type 2 Diabetes'],
        prescription: [
          'Nitroglycerin 0.4mg - As needed for chest pain',
          'Metformin 500mg - Twice daily with meals',
          'Atorvastatin 20mg - Once daily at bedtime'
        ],
        notes: 'Patient reports intermittent chest pain for the past 3 days, especially during physical activity. ECG shows ST-segment changes. Stress test ordered. Follow-up in 2 weeks.',
        status: 'Completed'
      },
      {
        date: 'Jan 10, 2026',
        time: '11:00 AM',
        doctor_name: 'Dr. Michael Chen',
        chief_complaint: 'Routine diabetes checkup',
        diagnosis: 'Type 2 Diabetes mellitus - well controlled',
        icd_codes: ['E11.65 - Type 2 Diabetes with hyperglycemia'],
        prescription: [
          'Metformin 500mg - Twice daily',
          'Atorvastatin 20mg - Once daily'
        ],
        notes: 'HbA1c: 6.9%, Fasting glucose: 128 mg/dL. Diabetes well-controlled. Continue current medications. Encouraged daily 30-minute walks.',
        status: 'Completed'
      },
      {
        date: 'Nov 20, 2025',
        time: '9:15 AM',
        doctor_name: 'Dr. Emily Rodriguez',
        chief_complaint: 'Knee pain post-surgery follow-up',
        diagnosis: 'Post-operative recovery, Status post arthroscopy',
        icd_codes: ['M25.561 - Pain in right knee', 'Z98.891 - History of knee surgery'],
        prescription: [
          'Ibuprofen 400mg - Three times daily with food',
          'Physical Therapy - 3x per week for 6 weeks'
        ],
        notes: 'Excellent recovery. Full range of motion restored. Pain reduced from 7/10 to 3/10. Surgical site healed well.',
        status: 'Completed'
      }
    ],

    // Lab Results
    labs: [
      { test: 'HbA1c', value: '7.2%', range: '< 5.7%', status: 'High', date: 'Feb 14, 2026' },
      { test: 'Fasting Glucose', value: '142 mg/dL', range: '70-100 mg/dL', status: 'High', date: 'Feb 14, 2026' },
      { test: 'Total Cholesterol', value: '198 mg/dL', range: '< 200 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
      { test: 'LDL Cholesterol', value: '95 mg/dL', range: '< 100 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
      { test: 'HDL Cholesterol', value: '52 mg/dL', range: '> 40 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
      { test: 'Triglycerides', value: '165 mg/dL', range: '< 150 mg/dL', status: 'High', date: 'Feb 14, 2026' }
    ],

    // Documents
    documents: [
      { name: 'ECG Report - Feb 2026', type: 'ECG', date: 'Feb 15, 2026', size: '245 KB' },
      { name: 'Blood Work Results', type: 'Lab Report', date: 'Feb 14, 2026', size: '128 KB' },
      { name: 'Knee X-Ray Post-Op', type: 'X-Ray', date: 'Nov 20, 2025', size: '1.2 MB' }
    ]
  };

  const handleSearch = () => {
    // Search for the example patient with phone +1234567890
    if (searchQuery.trim() === '+1234567890' || searchQuery.trim() === '1234567890') {
      setPatientFound(true);
    } else {
      setPatientFound(false);
      alert('Patient not found. Try searching: +1234567890');
    }
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate live transcription
      setTranscript("Doctor: Good afternoon, John. How are you feeling today?\n\nPatient: Hi Doctor. I've been having some chest discomfort again, especially when I climb stairs.\n\nDoctor: I see. Can you describe the discomfort? Is it sharp, dull, or pressure-like?\n\nPatient: It's more like a pressure sensation, right in the center of my chest. It goes away when I rest for a few minutes.\n\nDoctor: How long does it typically last?\n\nPatient: Maybe 2-3 minutes. Sometimes my left arm feels a bit tingly too.\n\nDoctor: Have you been taking your medications regularly?\n\nPatient: Yes, I have the metformin twice a day and the atorvastatin at night. I also have the nitroglycerin you prescribed last visit.\n\nDoctor: Have you needed to use the nitroglycerin?\n\nPatient: Twice this week when the chest pressure was really uncomfortable.\n\nDoctor: Let me check your blood pressure and heart rate...\n\n[Measuring vitals]\n\nDoctor: Your BP is 138 over 88, slightly elevated. Heart rate is 82. I'd like to order a stress test to evaluate your heart function under exertion. We should also review your most recent lab results.");
    } else {
      setTranscript("");
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].payload.total;
      const pct = total ? ((payload[0].value / total) * 100).toFixed(1) : '—';
      return (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          padding: '10px 14px',
          borderRadius: '10px',
          border: `1.5px solid ${payload[0].payload.color}30`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          minWidth: '120px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: payload[0].payload.color,
              boxShadow: `0 0 6px ${payload[0].payload.color}40`
            }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D' }}>
              {payload[0].name}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>{payload[0].value} patients</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: payload[0].payload.color }}>{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `${sidebarCollapsed ? '60px' : '260px'} 1fr ${aiPanelCollapsed ? '60px' : '320px'}`,
        gridTemplateRows: 'auto 1fr',
        height: '100vh',
        backgroundColor: 'var(--color-surface)',
        transition: 'grid-template-columns var(--transition)'
      }}
    >
      
      {/* ══════════════ BREADCRUMB HEADER ══════════════ */}
      <header 
        style={{
          gridColumn: '1 / -1',
          backgroundColor: 'white',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Left Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'white',
            border: '1.5px solid rgba(31,159,163,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            color: '#1F9FA3',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 4px rgba(31,159,163,0.1)',
            padding: '0',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1F9FA3';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#1F9FA3';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.color = '#1F9FA3';
            e.currentTarget.style.borderColor = 'rgba(31,159,163,0.2)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(31,159,163,0.1)';
          }}
        >
          {sidebarCollapsed ? <ChevronsRight size={16} strokeWidth={2.5} /> : <ChevronsLeft size={16} strokeWidth={2.5} />}
        </button>

        {/* Right AI Panel Toggle */}
        <button
          onClick={() => setAiPanelCollapsed(!aiPanelCollapsed)}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'white',
            border: '1.5px solid rgba(31,159,163,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            color: '#1F9FA3',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 4px rgba(31,159,163,0.1)',
            padding: '0',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1F9FA3';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = '#1F9FA3';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.color = '#1F9FA3';
            e.currentTarget.style.borderColor = 'rgba(31,159,163,0.2)';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(31,159,163,0.1)';
          }}
        >
          {aiPanelCollapsed ? <ChevronsLeft size={16} strokeWidth={2.5} /> : <ChevronsRight size={16} strokeWidth={2.5} />}
        </button>

        {/* Breadcrumb Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#1F9FA3" strokeWidth={2.2} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0B3C3D', letterSpacing: '-0.3px' }}>
              Diagnostic-IQ
            </span>
          </div>
          <span style={{ color: '#CBD5E1', fontSize: '14px', userSelect: 'none' }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Home size={13} color="#94A3B8" />
            <span
              onClick={() => setActiveTab('analytics')}
              style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#1F9FA3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
            >
              Dashboard
            </span>
          </div>
          <span style={{ color: '#CBD5E1', fontSize: '14px', userSelect: 'none' }}>/</span>
          <span style={{ fontSize: '13px', color: '#1F9FA3', fontWeight: 600 }}>
            {activeTab === 'analytics' && !patientFound && 'Patient Analytics'}
            {activeTab === 'analytics' && patientFound && 'Patient Records'}
            {activeTab === 'search' && !patientFound && 'Search Patients'}
            {activeTab === 'search' && patientFound && 'Patient Records'}
            {activeTab === 'prescription' && 'Prescription'}
            {activeTab === 'appointments' && 'Appointments'}
            {activeTab === 'records' && 'EMR Records'}
            {activeTab === 'audit-logs' && 'Audit Logs'}
          </span>
        </div>

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '52px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(31,159,163,0.06)', color: '#1F9FA3',
            border: '1px solid rgba(31,159,163,0.1)'
          }}>
            Dr. Hambire
          </span>
          <Link
            to="/"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.15)', backgroundColor: 'white',
              color: '#EF4444', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            <LogOut size={14} /> Logout
          </Link>
        </div>
      </header>

      {/* ══════════════ LEFT SIDEBAR ══════════════ */}
      <aside 
        style={{
          backgroundColor: 'var(--color-white)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all var(--transition)'
        }}
      >
        <nav style={{
          padding: sidebarCollapsed ? '12px 6px' : '14px 12px',
          display: 'flex', flexDirection: 'column',
          gap: sidebarCollapsed ? '6px' : '4px',
          flex: 1,
          alignItems: sidebarCollapsed ? 'center' : 'stretch'
        }}>
          {[
            { icon: TrendingUp, label: "Analytics", id: "analytics" },
            { icon: Search, label: "Search", id: "search" },
            { icon: Printer, label: "Prescription", id: "prescription" },
            { icon: Calendar, label: "Appointments", id: "appointments" },
            { icon: FileText, label: "EMR Records", id: "records" },
            { icon: ScrollText, label: "Audit Logs", id: "audit-logs" }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: sidebarCollapsed ? '0' : '10px 12px',
                width: sidebarCollapsed ? '42px' : '100%',
                height: sidebarCollapsed ? '42px' : 'auto',
                borderRadius: sidebarCollapsed ? '12px' : '10px',
                border: 'none',
                backgroundColor: isActive
                  ? (sidebarCollapsed ? '#1F9FA3' : 'rgba(31,159,163,0.08)')
                  : 'transparent',
                color: isActive
                  ? (sidebarCollapsed ? 'white' : '#1F9FA3')
                  : '#64748B',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                position: 'relative',
                boxShadow: isActive && sidebarCollapsed
                  ? '0 2px 8px rgba(31,159,163,0.3)'
                  : 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = sidebarCollapsed
                    ? 'rgba(31,159,163,0.08)'
                    : 'rgba(31,159,163,0.04)';
                  e.currentTarget.style.color = '#1F9FA3';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              <item.icon
                size={sidebarCollapsed ? 20 : 17}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              {!sidebarCollapsed && (
                <span style={{ letterSpacing: '-0.1px' }}>{item.label}</span>
              )}
              {!sidebarCollapsed && isActive && (
                <div style={{
                  position: 'absolute',
                  left: '0', top: '50%', transform: 'translateY(-50%)',
                  width: '3px', height: '60%',
                  borderRadius: '0 3px 3px 0',
                  backgroundColor: '#1F9FA3'
                }} />
              )}
            </button>
            );
          })}
        </nav>
      </aside>

      {/* ══════════════ MAIN CONTENT AREA ══════════════ */}
      <main 
        style={{
          padding: 'var(--space-6)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)'
        }}
      >
        
        {/* ─────── PRESCRIPTION FORM ─────── */}
        {activeTab === 'prescription' && (
          <section id="prescription-form">
            {/* Header toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '16px', flexWrap: 'wrap', gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid rgba(31,159,163,0.2)', backgroundColor: 'white',
                    color: '#1F9FA3', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3C3D', margin: 0, letterSpacing: '-0.3px' }}>Prescription</h2>
                  <p style={{ fontSize: '11px', color: '#94A3B8', margin: '1px 0 0', fontWeight: 500 }}>Fill out all required fields</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={clearPrescriptionForm}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'white',
                    color: '#EF4444', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  <RotateCcw size={14} /> Clear Form
                </button>
                <button
                  onClick={handleSavePrescription}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid rgba(31,159,163,0.2)',
                    backgroundColor: rxSaved ? 'rgba(34,197,94,0.08)' : 'white',
                    color: rxSaved ? '#16A34A' : '#1F9FA3',
                    fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { if (!rxSaved) e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.06)'; }}
                  onMouseLeave={(e) => { if (!rxSaved) e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  {rxSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Draft</>}
                </button>
                <button
                  onClick={handlePrintPrescription}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(31,159,163,0.25)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(31,159,163,0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.25)'; }}
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            {/* Validation banner */}
            {rxValidation && !isPrescriptionValid() && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 16px', marginBottom: '14px', borderRadius: '10px',
                  backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)'
                }}
              >
                <AlertTriangle size={16} color="#EF4444" />
                <span style={{ fontSize: '12px', color: '#991B1B', fontWeight: 500 }}>
                  Please fill in all required fields — Patient Name, Diagnosis, and Drug Name / Dosage / Frequency for every medication.
                </span>
              </motion.div>
            )}

            {/* Printable card */}
            <div id="printable-prescription" style={{
              borderRadius: '16px', overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              backgroundColor: 'white'
            }}>
              {/* Card header */}
              <div style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0B3C3D 0%, #1F9FA3 100%)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <ClipboardList size={20} color="white" />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>Medical Prescription</h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>Dr. Hambire · License: MD-2024-001</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Date: {prescriptionData.date}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>Healthcare City Medical Center</p>
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                {/* ── Patient Info Section ── */}
                <div style={{
                  marginBottom: '20px', paddingBottom: '18px',
                  borderBottom: '1px solid rgba(31,159,163,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundColor: 'rgba(31,159,163,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={13} color="#1F9FA3" />
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#0B3C3D', margin: 0 }}>Patient Information</h4>
                    <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600 }}>*Required</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Name *</label>
                      <input
                        type="text"
                        value={prescriptionData.patientName}
                        onChange={(e) => setPrescriptionData({...prescriptionData, patientName: e.target.value})}
                        placeholder="Enter patient name"
                        style={{
                          width: '100%', padding: '9px 14px', borderRadius: '10px',
                          border: rxValidation && !prescriptionData.patientName.trim()
                            ? '1.5px solid #EF4444' : '1.5px solid rgba(31,159,163,0.15)',
                          fontSize: '13px', outline: 'none', transition: 'border-color 0.2s',
                          backgroundColor: 'white'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = rxValidation && !prescriptionData.patientName.trim() ? '#EF4444' : 'rgba(31,159,163,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                      {rxValidation && !prescriptionData.patientName.trim() && (
                        <span style={{ fontSize: '10px', color: '#EF4444', marginTop: '3px', display: 'block' }}>Patient name is required</span>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                      <input
                        type="date"
                        value={prescriptionData.date}
                        onChange={(e) => setPrescriptionData({...prescriptionData, date: e.target.value})}
                        style={{
                          width: '100%', padding: '9px 14px', borderRadius: '10px',
                          border: '1.5px solid rgba(31,159,163,0.15)', fontSize: '13px',
                          outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'white'
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(31,159,163,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diagnosis / Chief Complaint *</label>
                    <input
                      type="text"
                      value={prescriptionData.diagnosis}
                      onChange={(e) => setPrescriptionData({...prescriptionData, diagnosis: e.target.value})}
                      placeholder="e.g., Type 2 Diabetes Mellitus, Hypertension"
                      style={{
                        width: '100%', padding: '9px 14px', borderRadius: '10px',
                        border: rxValidation && !prescriptionData.diagnosis.trim()
                          ? '1.5px solid #EF4444' : '1.5px solid rgba(31,159,163,0.15)',
                        fontSize: '13px', outline: 'none', transition: 'border-color 0.2s',
                        backgroundColor: 'white'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = rxValidation && !prescriptionData.diagnosis.trim() ? '#EF4444' : 'rgba(31,159,163,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    {rxValidation && !prescriptionData.diagnosis.trim() && (
                      <span style={{ fontSize: '10px', color: '#EF4444', marginTop: '3px', display: 'block' }}>Diagnosis is required</span>
                    )}
                  </div>

                  {/* Linked patient info */}
                  {patientFound && (
                    <div style={{
                      marginTop: '12px', padding: '12px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(31,159,163,0.03)', border: '1px solid rgba(31,159,163,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1F9FA3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Linked Patient</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(34,197,94,0.08)', color: '#16A34A', fontWeight: 600 }}>Auto-filled</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '12px', color: '#475569' }}>
                        <span><strong>{examplePatient.full_name}</strong></span>
                        <span>{examplePatient.age}y, {examplePatient.gender}</span>
                        <span>Blood: {examplePatient.blood_group}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'BP', val: examplePatient.vitals.blood_pressure },
                          { label: 'Wt', val: examplePatient.vitals.weight },
                          { label: 'BMI', val: examplePatient.vitals.bmi },
                          { label: 'Temp', val: examplePatient.vitals.temperature },
                          { label: 'O₂', val: examplePatient.vitals.oxygen_saturation }
                        ].map(v => (
                          <span key={v.label} style={{
                            fontSize: '10.5px', padding: '3px 8px', borderRadius: '6px',
                            backgroundColor: 'white', border: '1px solid rgba(31,159,163,0.1)',
                            color: '#334155', fontWeight: 500
                          }}>
                            <strong style={{ color: '#1F9FA3' }}>{v.label}:</strong> {v.val}
                          </span>
                        ))}
                      </div>
                      {examplePatient.onboarding.has_allergies && (
                        <div style={{
                          marginTop: '8px', padding: '6px 10px', borderRadius: '8px',
                          backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                          <AlertTriangle size={12} color="#EF4444" />
                          <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                            Allergies: {examplePatient.onboarding.allergies_list}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Medications Section ── */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundColor: 'rgba(31,159,163,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={13} color="#1F9FA3" />
                      </div>
                      <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#0B3C3D', margin: 0 }}>Medications (Rx)</h4>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', backgroundColor: 'rgba(31,159,163,0.08)', color: '#1F9FA3', fontWeight: 700 }}>
                        {prescriptionData.medications.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {prescriptionData.medications.length > 0 && prescriptionData.medications[prescriptionData.medications.length - 1].drug.trim() && (
                        <button
                          onClick={duplicateLastMedication}
                          title="Duplicate last medication"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '5px 10px', borderRadius: '8px',
                            border: '1px solid rgba(31,159,163,0.15)', backgroundColor: 'white',
                            color: '#1F9FA3', fontSize: '11px', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(31,159,163,0.04)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                        >
                          <Copy size={12} /> Duplicate
                        </button>
                      )}
                      <button
                        onClick={() => setPrescriptionData({
                          ...prescriptionData,
                          medications: [...prescriptionData.medications, { drug: '', dosage: '', frequency: '', duration: '', instructions: '' }]
                        })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '5px 10px', borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                          color: 'white', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', boxShadow: '0 1px 4px rgba(31,159,163,0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  </div>

                  {prescriptionData.medications.length === 0 && (
                    <div style={{
                      padding: '32px', textAlign: 'center', borderRadius: '12px',
                      border: '2px dashed rgba(31,159,163,0.15)', backgroundColor: 'rgba(31,159,163,0.02)'
                    }}>
                      <FileText size={28} color="#CBD5E1" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>No medications added yet</p>
                      <button
                        onClick={() => setPrescriptionData({
                          ...prescriptionData,
                          medications: [{ drug: '', dosage: '', frequency: '', duration: '', instructions: '' }]
                        })}
                        style={{
                          marginTop: '10px', padding: '6px 14px', borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                          color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        <Plus size={13} style={{ verticalAlign: '-2px' }} /> Add First Medication
                      </button>
                    </div>
                  )}

                  {prescriptionData.medications.map((med, index) => {
                    const hasDrugErr = rxValidation && !med.drug.trim();
                    const hasDoseErr = rxValidation && !med.dosage.trim();
                    const hasFreqErr = rxValidation && !med.frequency.trim();
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                        style={{
                          marginBottom: '10px', padding: '14px 16px', borderRadius: '12px',
                          backgroundColor: 'rgba(31,159,163,0.02)',
                          border: (hasDrugErr || hasDoseErr || hasFreqErr)
                            ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(31,159,163,0.08)',
                          position: 'relative'
                        }}
                      >
                        {/* Medication number + remove */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            backgroundColor: 'rgba(31,159,163,0.08)', color: '#1F9FA3',
                            letterSpacing: '0.3px', textTransform: 'uppercase'
                          }}>
                            Rx #{index + 1}
                          </span>
                          {prescriptionData.medications.length > 1 && (
                            <button
                              onClick={() => {
                                const newMeds = prescriptionData.medications.filter((_, i) => i !== index);
                                setPrescriptionData({...prescriptionData, medications: newMeds});
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                border: '1px solid rgba(239,68,68,0.15)', backgroundColor: 'white',
                                color: '#EF4444', fontSize: '10px', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.04)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                            >
                              <Trash2 size={11} /> Remove
                            </button>
                          )}
                        </div>

                        {/* Row 1: Drug + Dosage */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Drug Name *</label>
                            <input
                              type="text" value={med.drug}
                              onChange={(e) => { const m = [...prescriptionData.medications]; m[index].drug = e.target.value; setPrescriptionData({...prescriptionData, medications: m}); }}
                              placeholder="e.g., Metformin"
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: '8px',
                                border: hasDrugErr ? '1.5px solid #EF4444' : '1.5px solid rgba(31,159,163,0.12)',
                                fontSize: '13px', outline: 'none', backgroundColor: 'white'
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = hasDrugErr ? '#EF4444' : 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Dosage *</label>
                            <input
                              type="text" value={med.dosage}
                              onChange={(e) => { const m = [...prescriptionData.medications]; m[index].dosage = e.target.value; setPrescriptionData({...prescriptionData, medications: m}); }}
                              placeholder="e.g., 500mg"
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: '8px',
                                border: hasDoseErr ? '1.5px solid #EF4444' : '1.5px solid rgba(31,159,163,0.12)',
                                fontSize: '13px', outline: 'none', backgroundColor: 'white'
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = hasDoseErr ? '#EF4444' : 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                          </div>
                        </div>

                        {/* Row 2: Frequency + Duration */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Frequency *</label>
                            <input
                              type="text" value={med.frequency}
                              onChange={(e) => { const m = [...prescriptionData.medications]; m[index].frequency = e.target.value; setPrescriptionData({...prescriptionData, medications: m}); }}
                              placeholder="e.g., Twice daily"
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: '8px',
                                border: hasFreqErr ? '1.5px solid #EF4444' : '1.5px solid rgba(31,159,163,0.12)',
                                fontSize: '13px', outline: 'none', backgroundColor: 'white'
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = hasFreqErr ? '#EF4444' : 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Duration</label>
                            <input
                              type="text" value={med.duration}
                              onChange={(e) => { const m = [...prescriptionData.medications]; m[index].duration = e.target.value; setPrescriptionData({...prescriptionData, medications: m}); }}
                              placeholder="e.g., 30 days"
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: '8px',
                                border: '1.5px solid rgba(31,159,163,0.12)',
                                fontSize: '13px', outline: 'none', backgroundColor: 'white'
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Instructions</label>
                          <textarea
                            value={med.instructions}
                            onChange={(e) => { const m = [...prescriptionData.medications]; m[index].instructions = e.target.value; setPrescriptionData({...prescriptionData, medications: m}); }}
                            placeholder="e.g., Take with meals, avoid alcohol"
                            rows={2}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: '8px', resize: 'vertical',
                              border: '1.5px solid rgba(31,159,163,0.12)',
                              fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                              backgroundColor: 'white'
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Notes Section ── */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '7px', backgroundColor: 'rgba(31,159,163,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ScrollText size={13} color="#1F9FA3" />
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#0B3C3D', margin: 0 }}>Additional Notes</h4>
                  </div>
                  <textarea
                    value={prescriptionData.notes}
                    onChange={(e) => setPrescriptionData({...prescriptionData, notes: e.target.value})}
                    placeholder="Follow-up instructions, lifestyle advice, next appointment, etc."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '10px', resize: 'vertical',
                      border: '1.5px solid rgba(31,159,163,0.12)',
                      fontSize: '13px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1F9FA3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(31,159,163,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(31,159,163,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* ── Doctor's Signature ── */}
                <div style={{
                  paddingTop: '18px',
                  borderTop: '1px solid rgba(31,159,163,0.1)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
                }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                    <p style={{ margin: '0 0 2px' }}>This prescription is digitally generated.</p>
                    <p style={{ margin: 0 }}>Verify with the prescribing physician.</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ borderBottom: '2px solid #0B3C3D', width: '180px', marginLeft: 'auto', marginBottom: '6px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0B3C3D', margin: 0 }}>Dr. Hambire</p>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>License: MD-2024-001</p>
                    <p style={{ fontSize: '10px', color: '#94A3B8', margin: '1px 0 0' }}>Healthcare City Medical Center</p>
                  </div>
                </div>
              </div>
            </div>

            <style>{`
              @media print {
                body * { visibility: hidden; }
                #printable-prescription, #printable-prescription * { visibility: visible; }
                #printable-prescription {
                  position: absolute; left: 0; top: 0; width: 100%;
                  box-shadow: none !important; border: none !important;
                }
                button, nav, aside, header, [id='prescription-form'] > div:first-child,
                [id='prescription-form'] > div:nth-child(2) { display: none !important; }
              }
            `}</style>
          </section>
        )}
        
        {/* ─────── UPPER ROW: ANALYTICS OVERVIEW ─────── */}
        {!patientFound && activeTab === 'analytics' && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3C3D', margin: 0, letterSpacing: '-0.3px' }}>
                Patient Analytics
              </h2>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0', fontWeight: 500 }}>Real-time overview of your practice</p>
            </div>
            <div style={{
              padding: '5px 12px', borderRadius: '20px',
              backgroundColor: 'rgba(31,159,163,0.06)',
              border: '1px solid rgba(31,159,163,0.12)',
              fontSize: '11px', color: '#1F9FA3', fontWeight: 600
            }}>
              Last 30 days
            </div>
          </div>
          
          {/* ── Summary Metric Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Patients', value: '1,247', change: '+12%', icon: Users, accent: '#1F9FA3', bg: 'rgba(31,159,163,0.06)' },
              { label: 'Appointments', value: '24', change: '+15%', icon: Calendar, accent: '#6366F1', bg: 'rgba(99,102,241,0.06)' },
              { label: 'Consultations', value: '18', change: '+8%', icon: Stethoscope, accent: '#F59E0B', bg: 'rgba(245,158,11,0.06)' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                style={{
                  position: 'relative', overflow: 'hidden',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'white',
                  border: '1px solid rgba(0,0,0,0.04)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  cursor: 'default',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
                }}
              >
                {/* Top accent line */}
                <div style={{
                  position: 'absolute', top: 0, left: '16px', right: '16px',
                  height: '2px', borderRadius: '0 0 2px 2px',
                  background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}60)`
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '9px',
                    backgroundColor: stat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <stat.icon size={16} color={stat.accent} strokeWidth={2.2} />
                  </div>
                  <span style={{
                    fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.3px',
                    padding: '2px 7px', borderRadius: '6px',
                    backgroundColor: stat.change.startsWith('+') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    color: stat.change.startsWith('+') ? '#16A34A' : '#DC2626'
                  }}>
                    {stat.change}
                  </span>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0B3C3D', margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {stat.value}
                </h3>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '4px 0 0', fontWeight: 500 }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Chart Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { title: 'Diabetes', data: diabetesData, badge: `${diabetesData[0].value} cases`, badgeColor: '#D64545', delay: 0 },
              { title: 'Heart Disease', data: heartDiseaseData, badge: `${heartDiseaseData[0].value} cases`, badgeColor: '#F5A524', delay: 0.07 },
              { title: 'Asthma', data: asthmaData, badge: `${asthmaData[0].value} cases`, badgeColor: '#1E9DF1', delay: 0.14 },
              { title: 'Age Groups', data: ageDistributionData, badge: '5 groups', badgeColor: '#1F9FA3', delay: 0.21 }
            ].map((chart) => (
              <motion.div
                key={chart.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + chart.delay }}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                style={{
                  borderRadius: '14px',
                  backgroundColor: 'white',
                  border: '1px solid rgba(0,0,0,0.04)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
                }}
              >
                {/* Chart header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(0,0,0,0.03)'
                }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#0B3C3D', margin: 0, letterSpacing: '-0.1px' }}>
                    {chart.title}
                  </h4>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.3px',
                    padding: '3px 8px', borderRadius: '6px',
                    backgroundColor: `${chart.badgeColor}12`,
                    color: chart.badgeColor
                  }}>
                    {chart.badge}
                  </span>
                </div>
                {/* Chart body */}
                <div style={{ height: '195px', padding: '4px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chart.data}
                        cx="50%"
                        cy="46%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={chart.delay * 1000}
                        animationDuration={900}
                        stroke="none"
                      >
                        {chart.data.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        iconType="circle"
                        iconSize={7}
                        formatter={(value: string, entry: any) => (
                          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                            {value} <span style={{ fontWeight: 700, color: '#334155' }}>({entry.payload.value})</span>
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
        )}

        {/* ─────── SEARCH BAR ─────── */}
        {(activeTab === 'analytics' || activeTab === 'search') && (
        <section>
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              borderRadius: '16px', padding: '6px',
              backgroundColor: 'white',
              border: '1.5px solid rgba(31,159,163,0.12)',
              boxShadow: '0 2px 12px rgba(31,159,163,0.06)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Phone size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search patient by phone number (e.g., +1234567890)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  paddingLeft: '42px', paddingRight: '14px',
                  width: '100%', padding: '12px 14px 12px 42px',
                  border: 'none', outline: 'none', backgroundColor: 'transparent',
                  fontSize: '13.5px', color: '#0B3C3D', fontWeight: 500,
                  fontFamily: 'inherit'
                }}
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: 'none', backgroundColor: 'rgba(239,68,68,0.06)',
                  color: '#EF4444', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'; }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>×</span>
              </button>
            )}
            <button
              onClick={handleSearch}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #1F9FA3, #17858A)',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(31,159,163,0.3)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,159,163,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Search size={15} /> Search
            </button>
          </motion.div>
        </section>
        )}

        {/* ─────── PATIENT RECORDS & TRANSCRIPTION ─────── */}
        {(activeTab === 'analytics' || activeTab === 'search') && (
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {patientFound && (
            <motion.div 
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              
              {/* Left: Patient Info & Records */}
              <div style={{
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                maxHeight: '650px', borderRadius: '16px',
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                {/* Patient Header Card */}
                <div style={{
                  padding: '18px 22px',
                  background: 'linear-gradient(135deg, #0B3C3D 0%, #1F9FA3 100%)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {/* Decorative circles */}
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)' }} />
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <button 
                        onClick={() => {
                          setPatientFound(false);
                          setSearchQuery('');
                          setTranscript('');
                          setIsRecording(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '4px 10px', borderRadius: '8px', marginBottom: '12px',
                          border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)',
                          color: 'white', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                      >
                        <ChevronLeft size={14} /> Back
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '17px', fontWeight: 700, color: 'white',
                          border: '1.5px solid rgba(255,255,255,0.2)'
                        }}>
                          {examplePatient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                            {examplePatient.full_name}
                          </h3>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '3px 0 0', fontWeight: 500 }}>
                            {examplePatient.phone} · {examplePatient.gender}, {examplePatient.age} yrs
                          </p>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px',
                        backgroundColor: 'rgba(34,197,94,0.2)', color: '#86EFAC',
                        letterSpacing: '0.5px', textTransform: 'uppercase'
                      }}>Active</span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)'
                      }}>Blood: {examplePatient.blood_group}</span>
                    </div>
                  </div>
                </div>
                
                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                  {/* ── Vitals Grid ── */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(31,159,163,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Heart size={12} color="#1F9FA3" />
                      </div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Current Vitals</h4>
                      <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: 500, marginLeft: 'auto' }}>{examplePatient.vitals.recorded_at}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      {[
                        { label: 'BP', value: examplePatient.vitals.blood_pressure, color: '#EF4444', bg: 'rgba(239,68,68,0.04)' },
                        { label: 'Weight', value: examplePatient.vitals.weight, color: '#6366F1', bg: 'rgba(99,102,241,0.04)' },
                        { label: 'BMI', value: examplePatient.vitals.bmi, color: '#F59E0B', bg: 'rgba(245,158,11,0.04)' },
                        { label: 'Temp', value: examplePatient.vitals.temperature, color: '#1F9FA3', bg: 'rgba(31,159,163,0.04)' },
                        { label: 'O₂', value: examplePatient.vitals.oxygen_saturation, color: '#10B981', bg: 'rgba(16,185,129,0.04)' }
                      ].map(v => (
                        <div key={v.label} style={{
                          padding: '10px 8px', borderRadius: '10px', textAlign: 'center',
                          backgroundColor: v.bg, border: `1px solid ${v.color}15`
                        }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: v.color, margin: 0, lineHeight: 1 }}>{v.value}</p>
                          <p style={{ fontSize: '9.5px', fontWeight: 600, color: '#94A3B8', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{v.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Medical Conditions ── */}
                  <div style={{
                    marginBottom: '14px', padding: '14px', borderRadius: '12px',
                    backgroundColor: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle size={12} color="#EF4444" />
                      </div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Medical Conditions</h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {examplePatient.onboarding.has_diabetes && (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                          backgroundColor: '#D64545', color: 'white'
                        }}>
                          {examplePatient.onboarding.diabetes_type} Diabetes
                        </span>
                      )}
                      {examplePatient.onboarding.has_heart_disease && examplePatient.onboarding.heart_conditions.map((cond, idx) => (
                        <span key={idx} style={{
                          fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                          backgroundColor: '#F5A524', color: 'white'
                        }}>
                          {cond}
                        </span>
                      ))}
                    </div>
                    {examplePatient.onboarding.has_allergies && (
                      <div style={{
                        padding: '8px 10px', borderRadius: '8px',
                        backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <AlertTriangle size={12} color="#EF4444" />
                        <span style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 500 }}>
                          <strong>Allergies:</strong> {examplePatient.onboarding.allergies_list}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Current Medications ── */}
                  <div style={{
                    marginBottom: '14px', padding: '14px', borderRadius: '12px',
                    backgroundColor: 'rgba(31,159,163,0.02)', border: '1px solid rgba(31,159,163,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(31,159,163,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={12} color="#1F9FA3" />
                      </div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Current Medications</h4>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.6 }}>{examplePatient.onboarding.medications_list}</p>
                  </div>

                  {/* ── Lab Results ── */}
                  <div style={{
                    marginBottom: '14px', padding: '14px', borderRadius: '12px',
                    backgroundColor: 'rgba(99,102,241,0.02)', border: '1px solid rgba(99,102,241,0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={12} color="#6366F1" />
                      </div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Recent Lab Results</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {examplePatient.labs.slice(0, 4).map((lab, idx) => (
                        <div key={idx} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 10px', borderRadius: '8px',
                          backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.04)'
                        }}>
                          <div>
                            <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#0B3C3D', margin: 0 }}>{lab.test}</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8', margin: '2px 0 0' }}>{lab.range}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: lab.status === 'High' ? '#EF4444' : '#16A34A' }}>
                              {lab.value}
                            </span>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px',
                              textTransform: 'uppercase', letterSpacing: '0.3px',
                              backgroundColor: lab.status === 'High' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                              color: lab.status === 'High' ? '#EF4444' : '#16A34A'
                            }}>{lab.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Past Consultations ── */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ScrollText size={12} color="#F59E0B" />
                      </div>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0B3C3D', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Past Consultations</h4>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px',
                        backgroundColor: 'rgba(245,158,11,0.08)', color: '#F59E0B'
                      }}>{examplePatient.consultations.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {examplePatient.consultations.map((consultation, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            padding: '12px 14px', borderRadius: '10px',
                            backgroundColor: 'white',
                            border: '1px solid rgba(0,0,0,0.04)',
                            borderLeft: '3px solid #1F9FA3',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <p style={{ fontSize: '12.5px', fontWeight: 650, color: '#0B3C3D', margin: 0 }}>
                              {consultation.chief_complaint}
                            </p>
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                              backgroundColor: 'rgba(31,159,163,0.06)', color: '#1F9FA3'
                            }}>{consultation.date}</span>
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#475569', margin: '0 0 4px' }}>
                            <strong style={{ color: '#334155' }}>Dx:</strong> {consultation.diagnosis}
                          </p>
                          <p style={{ fontSize: '10.5px', color: '#94A3B8', margin: '0 0 6px' }}>
                            {consultation.doctor_name} · {consultation.time}
                          </p>
                          <details>
                            <summary style={{
                              cursor: 'pointer', color: '#1F9FA3', fontSize: '11px', fontWeight: 600,
                              listStyle: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              <span style={{ fontSize: '8px' }}>▶</span> View Details
                            </summary>
                            <div style={{
                              marginTop: '8px', paddingTop: '8px', paddingLeft: '10px',
                              borderTop: '1px solid rgba(31,159,163,0.08)',
                              borderLeft: '2px solid rgba(31,159,163,0.15)',
                              display: 'flex', flexDirection: 'column', gap: '6px'
                            }}>
                              <div>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>ICD Codes</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {consultation.icd_codes.map((code, ci) => (
                                    <span key={ci} style={{
                                      fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px',
                                      backgroundColor: 'rgba(99,102,241,0.06)', color: '#6366F1'
                                    }}>{code}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Prescription</p>
                                <p style={{ fontSize: '11px', color: '#475569', margin: 0, lineHeight: 1.5 }}>{consultation.prescription.join(', ')}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Notes</p>
                                <p style={{ fontSize: '11px', color: '#475569', margin: 0, lineHeight: 1.5 }}>{consultation.notes}</p>
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Transcription */}
              <div style={{
                display: 'flex', flexDirection: 'column', maxHeight: '650px',
                borderRadius: '16px', overflow: 'hidden',
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                {/* Transcription Header */}
                <div style={{
                  padding: '16px 20px',
                  background: isRecording
                    ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
                    : 'linear-gradient(135deg, #0B3C3D 0%, #1F9FA3 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <Mic size={17} color="white" />
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
                        Live Consultation
                      </h3>
                    </div>
                    {isRecording && (
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 500 }}>
                        Recording in progress... AI is listening
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleRecording}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px',
                      backgroundColor: isRecording ? 'white' : 'rgba(255,255,255,0.15)',
                      color: isRecording ? '#DC2626' : 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isRecording ? '#FEE2E2' : 'rgba(255,255,255,0.25)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isRecording ? 'white' : 'rgba(255,255,255,0.15)'; }}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? 'Stop' : 'Start'}
                  </button>
                </div>
                
                {/* Transcription Body */}
                <div 
                  style={{
                    flex: 1, padding: '16px',
                    backgroundColor: '#FAFCFC',
                    overflowY: 'auto',
                    fontSize: '13px', lineHeight: '1.7',
                  }}
                >
                  {isRecording || transcript ? (
                    <div>
                      {transcript.split('\n\n').map((paragraph, idx) => {
                        const isDoctor = paragraph.startsWith('Doctor:');
                        const isPatient = paragraph.startsWith('Patient:');
                        
                        return (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: isDoctor ? -8 : 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                              marginBottom: '10px', padding: '10px 12px', borderRadius: '10px',
                              backgroundColor: isDoctor ? 'rgba(31,159,163,0.04)' : isPatient ? 'rgba(245,165,36,0.04)' : 'rgba(0,0,0,0.02)',
                              borderLeft: `3px solid ${isDoctor ? '#1F9FA3' : isPatient ? '#F5A524' : '#CBD5E1'}`,
                            }}
                          >
                            {isDoctor && (
                              <div style={{ fontWeight: 650, color: '#1F9FA3', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                <Stethoscope size={13} /> Doctor
                              </div>
                            )}
                            {isPatient && (
                              <div style={{ fontWeight: 650, color: '#F5A524', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                <Users size={13} /> Patient
                              </div>
                            )}
                            <p style={{ margin: 0, color: '#334155', fontSize: '12.5px' }}>
                              {paragraph.replace(/^(Doctor:|Patient:)\s*/, '')}
                            </p>
                          </motion.div>
                        );
                      })}
                      {isRecording && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ color: '#1F9FA3', fontSize: '18px', display: 'inline-block' }}
                        > ▊</motion.span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px 20px', textAlign: 'center' }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        backgroundColor: 'rgba(31,159,163,0.06)', border: '1px solid rgba(31,159,163,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '14px'
                      }}>
                        <Mic size={24} color="#CBD5E1" />
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 6px' }}>
                        Click "Start" to begin transcription
                      </p>
                      <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 12px', lineHeight: 1.5 }}>
                        AI will capture and analyze the conversation in real-time
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[
                          { emoji: '🤖', text: 'Real-time AI transcription' },
                          { emoji: '🎯', text: 'Auto-generate SOAP notes & ICD codes' },
                          { emoji: '💊', text: 'Smart prescription suggestions' }
                        ].map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '11px', color: '#64748B', fontWeight: 500
                          }}>
                            <span>{item.emoji}</span> {item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transcription Footer */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(0,0,0,0.04)',
                  backgroundColor: 'white',
                  display: 'flex', gap: '8px'
                }}>
                  <button 
                    disabled={!transcript}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 14px', borderRadius: '10px', border: 'none',
                      background: transcript ? 'linear-gradient(135deg, #1F9FA3, #17858A)' : 'rgba(0,0,0,0.04)',
                      color: transcript ? 'white' : '#CBD5E1',
                      fontSize: '12px', fontWeight: 600,
                      cursor: transcript ? 'pointer' : 'not-allowed',
                      boxShadow: transcript ? '0 2px 8px rgba(31,159,163,0.25)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FileText size={14} /> Generate SOAP Note
                  </button>
                  <button 
                    disabled={!transcript}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 14px', borderRadius: '10px', border: 'none',
                      background: transcript ? 'linear-gradient(135deg, #16A34A, #15803D)' : 'rgba(0,0,0,0.04)',
                      color: transcript ? 'white' : '#CBD5E1',
                      fontSize: '12px', fontWeight: 600,
                      cursor: transcript ? 'pointer' : 'not-allowed',
                      boxShadow: transcript ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <TrendingUp size={14} /> ICD Codes
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {!patientFound && (
            <motion.div 
              style={{ 
                flex: 1,
                borderRadius: '16px',
                backgroundColor: 'white',
                border: '2px dashed rgba(31,159,163,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px'
              }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ width: '260px', height: '260px', marginBottom: '12px' }}>
                <DotLottieReact
                  src="https://lottie.host/33afb46d-3996-42ae-a226-79b6f21c9942/7yftKeWX5f.lottie"
                  loop
                  autoplay
                />
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, fontWeight: 500, textAlign: 'center' }}>
                Search for a patient using their phone number to view records and start consultation
              </p>
            </motion.div>
          )}
        </section>
        )}
      </main>

      {/* ══════════════ RIGHT AI PANEL ══════════════ */}
      <aside 
        style={{
          backgroundColor: '#F8FDFD',
          borderLeft: '1px solid rgba(31,159,163,0.12)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all var(--transition)'
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
    </div>
  );
};

export default DoctorDashboard;