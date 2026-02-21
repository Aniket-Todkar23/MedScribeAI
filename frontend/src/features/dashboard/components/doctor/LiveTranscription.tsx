import { motion } from "framer-motion";
import {
  Mic, MicOff, FileText, TrendingUp, Stethoscope, Users
} from "lucide-react";

interface LiveTranscriptionProps {
  isRecording: boolean;
  transcript: string;
  onToggleRecording: () => void;
}

const LiveTranscription = ({ isRecording, transcript, onToggleRecording }: LiveTranscriptionProps) => {
  return (
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
          onClick={onToggleRecording}
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
  );
};

export default LiveTranscription;
