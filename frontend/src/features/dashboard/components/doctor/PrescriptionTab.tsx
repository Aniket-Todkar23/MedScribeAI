import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Users, FileText, Printer, ScrollText,
  RotateCcw, Save, Plus, ClipboardList, AlertTriangle, Copy, Check, Trash2
} from "lucide-react";
import type { DoctorTabId, PrescriptionData, ExamplePatient } from "./types";

interface PrescriptionTabProps {
  setActiveTab: (tab: DoctorTabId) => void;
  patientFound: boolean;
  patient: ExamplePatient;
}

const PrescriptionTab = ({ setActiveTab, patientFound, patient }: PrescriptionTabProps) => {
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>({
    patientName: patientFound ? patient.full_name : '',
    date: new Date().toISOString().split('T')[0],
    diagnosis: '',
    notes: '',
    medications: [{ drug: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  });
  const [rxValidation, setRxValidation] = useState(false);
  const [rxSaved, setRxSaved] = useState(false);

  const clearPrescriptionForm = () => {
    setPrescriptionData({
      patientName: patientFound ? patient.full_name : '',
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

  return (
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
                  <span><strong>{patient.full_name}</strong></span>
                  <span>{patient.age}y, {patient.gender}</span>
                  <span>Blood: {patient.blood_group}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'BP', val: patient.vitals.blood_pressure },
                    { label: 'Wt', val: patient.vitals.weight },
                    { label: 'BMI', val: patient.vitals.bmi },
                    { label: 'Temp', val: patient.vitals.temperature },
                    { label: 'O₂', val: patient.vitals.oxygen_saturation }
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
                {patient.onboarding.has_allergies && (
                  <div style={{
                    marginTop: '8px', padding: '6px 10px', borderRadius: '8px',
                    backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                      Allergies: {patient.onboarding.allergies_list}
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
  );
};

export default PrescriptionTab;
