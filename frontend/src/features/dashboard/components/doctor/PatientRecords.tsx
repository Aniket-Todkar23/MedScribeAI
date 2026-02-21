import {
  Heart, AlertTriangle, FileText, Activity, ScrollText,
  ChevronLeft
} from "lucide-react";
import type { ExamplePatient } from "./types";

interface PatientRecordsProps {
  patient: ExamplePatient;
  onBack: () => void;
}

const PatientRecords = ({ patient, onBack }: PatientRecordsProps) => {
  return (
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
              onClick={onBack}
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
                {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                  {patient.full_name}
                </h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '3px 0 0', fontWeight: 500 }}>
                  {patient.phone} · {patient.gender}, {patient.age} yrs
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
            }}>Blood: {patient.blood_group}</span>
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
            <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: 500, marginLeft: 'auto' }}>{patient.vitals.recorded_at}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {[
              { label: 'BP', value: patient.vitals.blood_pressure, color: '#EF4444', bg: 'rgba(239,68,68,0.04)' },
              { label: 'Weight', value: patient.vitals.weight, color: '#6366F1', bg: 'rgba(99,102,241,0.04)' },
              { label: 'BMI', value: patient.vitals.bmi, color: '#F59E0B', bg: 'rgba(245,158,11,0.04)' },
              { label: 'Temp', value: patient.vitals.temperature, color: '#1F9FA3', bg: 'rgba(31,159,163,0.04)' },
              { label: 'O₂', value: patient.vitals.oxygen_saturation, color: '#10B981', bg: 'rgba(16,185,129,0.04)' }
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
            {patient.onboarding.has_diabetes && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                backgroundColor: '#D64545', color: 'white'
              }}>
                {patient.onboarding.diabetes_type} Diabetes
              </span>
            )}
            {patient.onboarding.has_heart_disease && patient.onboarding.heart_conditions.map((cond, idx) => (
              <span key={idx} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                backgroundColor: '#F5A524', color: 'white'
              }}>
                {cond}
              </span>
            ))}
          </div>
          {patient.onboarding.has_allergies && (
            <div style={{
              padding: '8px 10px', borderRadius: '8px',
              backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <AlertTriangle size={12} color="#EF4444" />
              <span style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 500 }}>
                <strong>Allergies:</strong> {patient.onboarding.allergies_list}
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
          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.6 }}>{patient.onboarding.medications_list}</p>
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
            {patient.labs.slice(0, 4).map((lab, idx) => (
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
            }}>{patient.consultations.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {patient.consultations.map((consultation, idx) => (
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
  );
};

export default PatientRecords;
