import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, FileText, Stethoscope, Users, Loader2, CheckCircle2
} from "lucide-react";
import { useIsMobile } from "../../../../hooks/useMediaQuery";

interface LiveTranscriptionProps {
  isRecording: boolean;
  transcript: string;
  onToggleRecording: () => void;
  /** Call to finalise consultation (extract, summarise, etc.) */
  onFinalise?: () => void;
  /** Whether a batch is currently being sent */
  isSending?: boolean;
  /** Current batch index */
  batchIndex?: number;
  /** Whether finalise is in progress */
  isFinalising?: boolean;
  /** Whether consultation has been finalised */
  isComplete?: boolean;
  /** Whether there's a consultation in progress */
  hasConsultation?: boolean;
}

const LiveTranscription = ({
  isRecording,
  transcript,
  onToggleRecording,
  onFinalise,
  isSending = false,
  batchIndex = 0,
  isFinalising = false,
  isComplete = false,
  hasConsultation = false,
}: LiveTranscriptionProps) => {
  const isMobile = useIsMobile();
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when transcript updates
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [transcript]);

  const canFinalise = !isRecording && transcript.length > 10 && !isFinalising && !isComplete && hasConsultation;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '400px' : '650px',
      borderRadius: '16px', overflow: 'hidden',
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.04)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '12px 14px' : '16px 20px',
        background: isRecording
          ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'
          : isFinalising
            ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
            : isComplete
              ? 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)'
              : 'linear-gradient(135deg, #0B3C3D 0%, #1F9FA3 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            {isFinalising ? <Loader2 size={17} color="white" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={17} color="white" />}
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
              {isFinalising ? 'Analyzing Consultation...' : isComplete ? 'Consultation Complete' : 'Live Consultation'}
            </h3>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 500 }}>
            {isRecording
              ? `Recording... Batch ${batchIndex}${isSending ? ' · Transcribing...' : ''}`
              : isFinalising
                ? 'Generating summaries, extracting entities...'
                : isComplete
                  ? 'Summary & report are ready in the AI panel →'
                  : hasConsultation
                    ? 'Recording paused'
                    : 'Ready to record'}
          </p>
        </div>
        {!isFinalising && !isComplete && (
          <button
            onClick={onToggleRecording}
            disabled={isFinalising}
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
        )}
        {isComplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontSize: '12px', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Done
          </div>
        )}
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1, padding: '16px',
          backgroundColor: '#FAFCFC',
          overflowY: 'auto',
          fontSize: '13px', lineHeight: '1.7',
        }}
      >
        {isRecording || transcript ? (
          <div>
            {transcript.split('\n\n').filter(Boolean).map((paragraph, idx) => {
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
            {isSending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0', color: '#94A3B8', fontSize: '11px' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Transcribing batch...
              </div>
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
              {hasConsultation ? 'Click "Start" to begin recording' : 'Create a consultation to begin'}
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

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.04)',
        backgroundColor: 'white',
        display: 'flex', gap: '8px'
      }}>
        <button
          disabled={!canFinalise}
          onClick={onFinalise}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 14px', borderRadius: '10px', border: 'none',
            background: canFinalise
              ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
              : isFinalising
                ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                : isComplete
                  ? 'linear-gradient(135deg, #16A34A, #15803D)'
                  : 'rgba(0,0,0,0.04)',
            color: canFinalise || isFinalising || isComplete ? 'white' : '#CBD5E1',
            fontSize: '12px', fontWeight: 600,
            cursor: canFinalise ? 'pointer' : 'not-allowed',
            boxShadow: canFinalise ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
            transition: 'all 0.2s',
            opacity: isFinalising ? 0.8 : 1,
          }}
        >
          {isFinalising ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating Report...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle2 size={14} /> Report Ready
            </>
          ) : (
            <>
              <FileText size={14} /> Generate Summary & Report
            </>
          )}
        </button>
      </div>

      {/* Spin animation keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LiveTranscription;
