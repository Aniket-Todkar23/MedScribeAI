import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Square, Upload, Clock, ArrowLeft, CheckCircle,
  ExternalLink, AlertCircle, Loader2, Download,
} from "lucide-react";
import { appointmentService } from "../services/appointmentService";
import type { Appointment } from "../services/appointmentService";

const MeetingRoom: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ recordingUrl: string; blobName: string } | null>(null);
  const [sasUrl, setSasUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Fetch appointment details
  useEffect(() => {
    if (!appointmentId) return;
    (async () => {
      try {
        const data = await appointmentService.getById(appointmentId);
        setAppointment(data);
      } catch {
        setError("Failed to load appointment details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;

      // Audio visualizer
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // chunks every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied. Please allow microphone permission.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  const handleUpload = async () => {
    if (!recordedBlob || !appointmentId) return;
    setUploading(true);
    setError(null);
    try {
      const filename = `recording-${appointmentId}-${Date.now()}.webm`;
      const result = await appointmentService.uploadRecording(appointmentId, recordedBlob, filename);
      setUploadResult(result);

      // Get signed URL
      if (result.blobName) {
        const url = await appointmentService.getRecordingSasUrl(result.blobName);
        setSasUrl(url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload recording. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0F172A" }}>
        <Loader2 size={40} className="animate-spin" style={{ color: "#14B8A6" }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px",
      color: "white",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 800, marginBottom: 32 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14, marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Consultation Room</h1>
            {appointment && (
              <p style={{ color: "#94A3B8", fontSize: 14 }}>
                Patient: {appointment.patient?.full_name || "—"} &middot;{" "}
                {new Date(appointment.appointment_date).toLocaleString()}
              </p>
            )}
          </div>
          {appointment?.meet_link && (
            <a
              href={appointment.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                backgroundColor: "#14B8A6", color: "white", textDecoration: "none",
              }}
            >
              <ExternalLink size={16} /> Open Google Meet
            </a>
          )}
        </div>
      </div>

      {/* Main recording card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "100%", maxWidth: 800, backgroundColor: "#1E293B",
          borderRadius: 24, padding: 40, border: "1px solid #334155",
          textAlign: "center",
        }}
      >
        {/* Audio level visualizer */}
        <div style={{
          width: 160, height: 160, borderRadius: "50%", margin: "0 auto 32px",
          background: isRecording
            ? `radial-gradient(circle, rgba(20,184,166,${0.3 + audioLevel * 0.7}) 0%, rgba(20,184,166,0.05) 70%)`
            : "radial-gradient(circle, rgba(148,163,184,0.1) 0%, transparent 70%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.1s",
          boxShadow: isRecording ? `0 0 ${60 + audioLevel * 40}px rgba(20,184,166,${0.2 + audioLevel * 0.3})` : "none",
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            backgroundColor: isRecording ? "#14B8A6" : "#475569",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${1 + audioLevel * 0.15})`,
            transition: "transform 0.1s, background-color 0.3s",
          }}>
            {isRecording ? (
              isPaused ? <MicOff size={40} color="white" /> : <Mic size={40} color="white" />
            ) : (
              <Mic size={40} color="#94A3B8" />
            )}
          </div>
        </div>

        {/* Timer */}
        <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "monospace", marginBottom: 8, letterSpacing: 2 }}>
          {formatTime(recordingTime)}
        </div>
        <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 32 }}>
          {isRecording
            ? isPaused ? "Recording paused" : "Recording in progress…"
            : recordedBlob
              ? `Recording complete (${(recordedBlob.size / 1024 / 1024).toFixed(2)} MB)`
              : "Ready to record consultation"}
        </p>

        {/* Controls */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 32px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                backgroundColor: "#14B8A6", color: "white", border: "none", cursor: "pointer",
              }}
            >
              <Mic size={20} /> Start Recording
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={togglePause}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "14px 28px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                  backgroundColor: "#F59E0B", color: "white", border: "none", cursor: "pointer",
                }}
              >
                {isPaused ? <><Mic size={18} /> Resume</> : <><MicOff size={18} /> Pause</>}
              </button>
              <button
                onClick={stopRecording}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "14px 28px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                  backgroundColor: "#EF4444", color: "white", border: "none", cursor: "pointer",
                }}
              >
                <Square size={18} /> Stop Recording
              </button>
            </>
          )}

          {!isRecording && recordedBlob && !uploadResult && (
            <>
              <button
                onClick={startRecording}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "14px 28px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                  backgroundColor: "#475569", color: "white", border: "none", cursor: "pointer",
                }}
              >
                <Mic size={18} /> Re-record
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "14px 32px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                  backgroundColor: "#14B8A6", color: "white", border: "none", cursor: "pointer",
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? (
                  <><Loader2 size={18} className="animate-spin" /> Uploading…</>
                ) : (
                  <><Upload size={18} /> Save Recording</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20, padding: "12px 20px", borderRadius: 12,
            backgroundColor: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#FCA5A5",
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Upload Success */}
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 32, padding: "24px", borderRadius: 16,
              backgroundColor: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              <CheckCircle size={24} style={{ color: "#14B8A6" }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#14B8A6" }}>Recording Saved!</span>
            </div>
            <p style={{ color: "#94A3B8", fontSize: 13, marginBottom: 16 }}>
              Your consultation recording has been securely stored in Azure Blob Storage.
            </p>
            {sasUrl && (
              <a
                href={sasUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  backgroundColor: "#14B8A6", color: "white", textDecoration: "none",
                }}
              >
                <Download size={16} /> Download Recording
              </a>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Tips */}
      <div style={{
        width: "100%", maxWidth: 800, marginTop: 24,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
      }}>
        {[
          { icon: Mic, title: "Audio Quality", desc: "Speak clearly near your microphone for best results." },
          { icon: Clock, title: "No Time Limit", desc: "Record for as long as needed. Files are chunked automatically." },
          { icon: Upload, title: "Secure Storage", desc: "Recordings are encrypted and stored in Azure Blob Storage." },
        ].map((tip, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "#1E293B", borderRadius: 14, padding: "20px",
              border: "1px solid #334155", textAlign: "center",
            }}
          >
            <tip.icon size={24} style={{ color: "#14B8A6", marginBottom: 8 }} />
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{tip.title}</h4>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingRoom;
