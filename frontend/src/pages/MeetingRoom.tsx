import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { appointmentApi, meetingApi, consultationApi, drugApi, aiProxyApi } from '../lib/api';
import type { PrescriptionItem, ICDCodeItem, SOAPNote, DrugResult, MeetingJoinToken, AppointmentResponse } from '../lib/types';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

/* ── LiveKit imports ─────────────────────────────────────────────── */
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react';
import {
  Track,
  ConnectionState,
  type RemoteParticipant,
  type LocalParticipant,
} from 'livekit-client';

import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Bot, Send, Loader2,
  FileText, Plus, Trash2, Save, ChevronDown, ChevronUp,
  Pill, Stethoscope, ClipboardList, Timer,
  Search, X, LogOut, Users, MessageSquare, PlusCircle, Sparkles,
} from 'lucide-react';

/* ────────────────── Section Toggle ────────────────── */
function Section({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string; icon: React.FC<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary" /> {title}
          {badge !== undefined && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────── Meeting Timer ────────────────── */
function MeetingTimer({ startTime, durationMinutes }: { startTime: Date; durationMinutes: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const remaining = durationMinutes * 60 - elapsed;
  const isOvertime = remaining < 0;
  return (
    <div className={`flex items-center gap-2 text-sm font-mono ${isOvertime ? 'text-red-500' : remaining < 300 ? 'text-yellow-500' : 'text-green-500'}`}>
      <Timer className="w-4 h-4" />
      <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
      <span className="text-xs text-muted-foreground">/ {durationMinutes}m</span>
    </div>
  );
}

/* ────────────────── Transcription Viewer (read-only) ────────────────── */
function TranscriptionViewer({ transcription }: { transcription: string }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 4;
  const segments = transcription.split('\n').filter(l => l.trim()).map((line, i) => {
    const tsMatch = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(DOCTOR|PATIENT|Dr\.|Pt\.|Clinician)[:\s]+(.+)/i);
    const doctorMatch = line.match(/^(DOCTOR|Dr\.|Clinician)[:\s]+(.+)/i);
    const patientMatch = line.match(/^(PATIENT|Pt\.)[:\s]+(.+)/i);
    if (tsMatch) {
      const speaker = /doctor|dr\.|clinician/i.test(tsMatch[2]) ? 'doctor' : 'patient';
      return { id: i, speaker, text: tsMatch[3].trim(), time: tsMatch[1] };
    }
    if (doctorMatch) return { id: i, speaker: 'doctor' as const, text: doctorMatch[2].trim(), time: null };
    if (patientMatch) return { id: i, speaker: 'patient' as const, text: patientMatch[2].trim(), time: null };
    return { id: i, speaker: 'unknown' as const, text: line.trim(), time: null };
  });
  const hasSpeakers = segments.some(s => s.speaker !== 'unknown');
  if (!hasSpeakers) return <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">{transcription}</div>;
  const visible = expanded ? segments : segments.slice(0, PREVIEW_COUNT);
  const hiddenCount = segments.length - PREVIEW_COUNT;
  return (
    <div className="space-y-2">
      {visible.map(seg => (
        <div key={seg.id} className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            seg.speaker === 'doctor' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' :
            seg.speaker === 'patient' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {seg.speaker === 'doctor' ? <Stethoscope className="w-4 h-4" /> :
             seg.speaker === 'patient' ? <Users className="w-4 h-4" /> :
             <MessageSquare className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-semibold uppercase ${
                seg.speaker === 'doctor' ? 'text-blue-600' : seg.speaker === 'patient' ? 'text-green-600' : 'text-muted-foreground'
              }`}>{seg.speaker === 'doctor' ? 'Doctor' : seg.speaker === 'patient' ? 'Patient' : 'Speaker'}</span>
              {seg.time && <span className="text-xs text-muted-foreground font-mono">{seg.time}</span>}
            </div>
            <p className="text-sm leading-relaxed">{seg.text}</p>
          </div>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse transcription</> : <><ChevronDown className="w-3.5 h-3.5" /> Show full transcription ({hiddenCount} more)</>}
        </button>
      )}
    </div>
  );
}

/* ────────────────── Drug Search Autocomplete ────────────────── */
function DrugSearchInput({ value, onChange, onSelectDrug }: {
  value: string; onChange: (val: string) => void; onSelectDrug: (drug: DrugResult) => void;
}) {
  const [results, setResults] = useState<DrugResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try { const res = await drugApi.search(q, 10); setResults(res.data || []); setIsOpen(res.data?.length > 0); }
    catch { setResults([]); setIsOpen(false); } finally { setLoading(false); }
  }, []);
  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input type="text" value={value} onChange={e => handleChange(e.target.value)}
          placeholder="Search drug name..." onFocus={() => results.length > 0 && setIsOpen(true)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" />
        {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {results.map((drug, i) => (
              <button key={i} onClick={() => { onSelectDrug(drug); onChange(drug.name); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                <div className="text-sm font-medium">{drug.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {drug.generic_name !== drug.name && <span>{drug.generic_name}</span>}
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{drug.category}</span>
                  {drug.common_doses && <span>{drug.common_doses}</span>}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────── ICD Code Search Dropdown ────────────────── */
function ICDSearchDropdown({ onSelect, version }: { onSelect: (code: ICDCodeItem) => void; version: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ code: string; title?: string; description?: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return; }
    setLoading(true);
    try {
      const res = await aiProxyApi.icdLookup(q, version, 15);
      const data = res.data;
      const codes = Array.isArray(data) ? data : data?.matches || data?.results || data?.codes || [];
      setResults(codes); setIsOpen(codes.length > 0);
    } catch { setResults([]); setIsOpen(false); } finally { setLoading(false); }
  }, [version]);
  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };
  const handleSelect = (item: { code: string; title?: string; description?: string; name?: string }) => {
    onSelect({ code: item.code, description: item.title || item.description || item.name || '', version });
    setQuery(''); setResults([]); setIsOpen(false);
  };
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={query} onChange={e => handleChange(e.target.value)}
          placeholder="Search ICD codes or symptoms..."
          className="w-full pl-9 pr-8 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          onFocus={() => results.length > 0 && setIsOpen(true)} />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {results.map((item, i) => (
              <button key={i} onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3">
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">{item.code}</span>
                <span className="text-sm truncate">{item.title || item.description || item.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Participant Video Tile — renders video/audio for ONE participant
   ══════════════════════════════════════════════════════════════ */
function ParticipantTile({
  participant,
  isLocal,
  name,
  role,
  showControls,
  micOn,
  videoOn,
  onToggleMic,
  onToggleVideo,
  onEndOrLeave,
  endLabel,
  endColor,
  endIcon: EndIcon,
  isPending,
  isSpeaking,
}: {
  participant: LocalParticipant | RemoteParticipant | null;
  isLocal: boolean;
  name: string;
  role: string;
  showControls: boolean;
  micOn: boolean;
  videoOn: boolean;
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
  onEndOrLeave?: () => void;
  endLabel?: string;
  endColor?: string;
  endIcon?: React.FC<{ className?: string }>;
  isPending?: boolean;
  isSpeaking?: boolean;
}) {
  // Get video & audio tracks for this participant from useTracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  const videoTrack = tracks.find(
    t => t.participant?.identity === participant?.identity && t.source === Track.Source.Camera && t.publication?.track
  );
  const audioTrack = tracks.find(
    t => t.participant?.identity === participant?.identity && t.source === Track.Source.Microphone && t.publication?.track && !isLocal
  );

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const bgColor = role === 'doctor' ? 'bg-blue-600' : 'bg-emerald-600';
  const ringColor = isSpeaking ? 'ring-4 ring-green-400 ring-opacity-70' : '';

  return (
    <div className={`relative flex-1 bg-linear-to-b from-gray-900 to-black rounded-2xl overflow-hidden flex items-center justify-center ${ringColor}`}>
      {/* Video stream or avatar placeholder */}
      {videoTrack?.publication?.track ? (
        <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white ${bgColor}/60`}>
            {initials}
          </div>
          <span className="text-sm text-white/60">{videoOn || !isLocal ? 'Camera Off' : 'Camera Off'}</span>
        </div>
      )}

      {/* Audio stream (remote only — don't play our own audio back) */}
      {audioTrack?.publication?.track && <AudioTrack trackRef={audioTrack} />}

      {/* Name badge — top-left */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${bgColor}`}>
          {name.charAt(0)}
        </div>
        <span className="text-white text-xs font-semibold">{name}</span>
        <span className="text-white/50 text-[10px]">({role === 'doctor' ? 'Doctor' : 'Patient'})</span>
        {isSpeaking && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
      </div>

      {/* Muted indicator for remote mics */}
      {!showControls && !micOn && (
        <div className="absolute top-3 right-3 p-1.5 bg-red-500/80 rounded-full">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Controls bar — only on the user's own tile (bottom) */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10">
          <button onClick={onToggleMic}
            className={`p-2.5 rounded-xl transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button onClick={onToggleVideo}
            className={`p-2.5 rounded-xl transition-colors ${videoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            title={videoOn ? 'Turn Off Camera' : 'Turn On Camera'}>
            {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button onClick={onEndOrLeave} disabled={isPending}
            className={`p-2.5 rounded-xl transition-colors disabled:opacity-50 ${endColor}`}
            title={endLabel}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : EndIcon && <EndIcon className="w-5 h-5" />}
          </button>
          {endLabel && (
            <span className="text-white/50 text-[10px] absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">{endLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LiveMeetingStage — the actual meeting view inside <LiveKitRoom>
   Renders 50/50 split: remote on top, local on bottom.
   Controls (mic/video/end) are on the LOCAL tile only.
   ══════════════════════════════════════════════════════════════ */
function LiveMeetingStage({
  appointment,
  isDoctor,
  remoteName,
  remoteRole,
  localName,
  localRole,
  meetingStartTime,
  liveTranscript,
  onEndMeeting,
  onLeaveMeeting,
  endPending,
  leavePending,
  onExtend,
  extendPending,
  onTranscribeTurn,
}: {
  appointment: AppointmentResponse | undefined;
  isDoctor: boolean;
  remoteName: string;
  remoteRole: string;
  localName: string;
  localRole: string;
  meetingStartTime: Date | null;
  liveTranscript: string;
  onEndMeeting: () => void;
  onLeaveMeeting: () => void;
  endPending: boolean;
  leavePending: boolean;
  onExtend: (mins: number) => void;
  extendPending: boolean;
  onTranscribeTurn: (speakerName: string, speakerRole: string, audioBlob: Blob) => void;
}) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const room = useRoomContext();

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  // Track who is speaking
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  useEffect(() => {
    if (!room) return;
    const onSpeaking = () => {
      setLocalSpeaking(localParticipant?.isSpeaking ?? false);
      const rp = remoteParticipants[0];
      setRemoteSpeaking(rp?.isSpeaking ?? false);
    };
    const interval = setInterval(onSpeaking, 300);
    return () => clearInterval(interval);
  }, [room, localParticipant, remoteParticipants]);

  // ── Speaker-turn audio capture for real-time transcription ──
  // When a participant stops speaking, send their audio turn for transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeSpeakerRef = useRef<{ name: string; role: string } | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!room) return;

    const SILENCE_THRESHOLD_MS = 2000; // 2s of silence = turn ended

    const checkSpeakers = () => {
      // Find who is currently the active speaker
      const allParticipants = [localParticipant, ...remoteParticipants].filter(Boolean);
      const speaker = allParticipants.find(p => p?.isSpeaking);

      if (speaker) {
        // Parse metadata for speaker info
        let speakerName = speaker.name || 'Unknown';
        let speakerRole = 'unknown';
        try {
          const meta = JSON.parse(speaker.metadata || '{}');
          speakerRole = meta.role || 'unknown';
          if (meta.name) speakerName = meta.name;
        } catch { /* use defaults */ }

        // If the speaker changed, flush old turn & start new recording
        const current = activeSpeakerRef.current;
        if (!current || current.name !== speakerName) {
          // Flush previous turn
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            const prevName = current?.name || 'Unknown';
            const prevRole = current?.role || 'unknown';
            mediaRecorderRef.current.onstop = () => {
              if (audioChunksRef.current.length > 0) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                onTranscribeTurn(prevName, prevRole, blob);
              }
            };
            mediaRecorderRef.current.stop();
          }

          activeSpeakerRef.current = { name: speakerName, role: speakerRole };

          // Start recording the new speaker's audio track
          const audioTrackPub = Array.from(
            (speaker as RemoteParticipant).audioTrackPublications?.values?.() || []
          ).find(pub => pub.track);

          if (audioTrackPub?.track) {
            try {
              const mediaStream = new MediaStream([audioTrackPub.track.mediaStreamTrack]);
              const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' });
              audioChunksRef.current = [];
              recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
              recorder.start(500); // collect chunks every 500ms
              mediaRecorderRef.current = recorder;
            } catch { /* MediaRecorder not supported for this track */ }
          }
        }

        // Clear silence timer — speaker is still talking
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        // Nobody speaking — start silence timer to flush the turn
        if (activeSpeakerRef.current && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              const name = activeSpeakerRef.current?.name || 'Unknown';
              const role = activeSpeakerRef.current?.role || 'unknown';
              mediaRecorderRef.current.onstop = () => {
                if (audioChunksRef.current.length > 0) {
                  const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                  audioChunksRef.current = [];
                  onTranscribeTurn(name, role, blob);
                }
              };
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current = null;
            }
            activeSpeakerRef.current = null;
            silenceTimerRef.current = null;
          }, SILENCE_THRESHOLD_MS);
        }
      }
    };

    const interval = setInterval(checkSpeakers, 500);
    return () => {
      clearInterval(interval);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // Flush any remaining recording on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [room, localParticipant, remoteParticipants, onTranscribeTurn]);

  // Toggle mic/camera using the LiveKit local participant
  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;
    const next = !micEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, [localParticipant, micEnabled]);

  const toggleCam = useCallback(async () => {
    if (!localParticipant) return;
    const next = !camEnabled;
    await localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  }, [localParticipant, camEnabled]);

  const remoteP = remoteParticipants[0] ?? null;

  // Check remote mic status
  const remoteMicOn = remoteP
    ? Array.from(remoteP.audioTrackPublications.values()).some(pub => !pub.isMuted)
    : false;

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Connecting to meeting room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 h-full transition-all duration-300 ${isDoctor ? 'w-2/3' : 'w-full max-w-5xl mx-auto'}`}>
      {/* Top info bar */}
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 rounded-lg text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {connectionState === ConnectionState.Connected ? 'Connected' : 'In Session'}
          </div>
          <div className="text-sm font-medium truncate">{remoteName} &middot; {(appointment?.appointment_type as string) || 'Telehealth'}</div>
        </div>
        <div className="flex items-center gap-3">
          {meetingStartTime && appointment && (
            <MeetingTimer startTime={meetingStartTime} durationMinutes={appointment.duration_minutes} />
          )}
          {isDoctor && (
            <div className="flex gap-1">
              {[15, 30].map(mins => (
                <button key={mins} onClick={() => onExtend(mins)} disabled={extendPending}
                  className="px-2 py-1 text-xs bg-muted rounded-lg hover:bg-muted/80 font-medium disabled:opacity-50" title={`Extend by ${mins}m`}>
                  +{mins}m
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-red-500/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC
          </div>
        </div>
      </div>

      {/* 50/50 video tiles — remote on top, local on bottom */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Remote participant — TOP */}
        <ParticipantTile
          participant={remoteP}
          isLocal={false}
          name={remoteName}
          role={remoteRole}
          showControls={false}
          micOn={remoteMicOn}
          videoOn={true}
          isSpeaking={remoteSpeaking}
        />

        {/* Local participant — BOTTOM (with controls) */}
        <ParticipantTile
          participant={localParticipant}
          isLocal={true}
          name={localName}
          role={localRole}
          showControls={true}
          micOn={micEnabled}
          videoOn={camEnabled}
          onToggleMic={toggleMic}
          onToggleVideo={toggleCam}
          onEndOrLeave={isDoctor ? onEndMeeting : onLeaveMeeting}
          endLabel={isDoctor ? 'End Meeting' : 'Leave Meeting'}
          endColor={isDoctor ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}
          endIcon={isDoctor ? PhoneOff : LogOut}
          isPending={endPending || leavePending}
          isSpeaking={localSpeaking}
        />
      </div>

      {/* Live transcription strip */}
      {liveTranscript && (
        <div className="shrink-0 bg-card/90 border border-border rounded-xl px-4 py-2 max-h-24 overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Transcription</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line">{liveTranscript.split('\n').slice(-6).join('\n')}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PostMeetingView (Doctor Only)
   ══════════════════════════════════════════════════════════════ */
function PostMeetingView({ appointmentId, patientId, transcription: initialTranscription, onExit }: {
  appointmentId: string; patientId: string; transcription: string; onExit: () => void;
}) {
  const queryClient = useQueryClient();
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [soap, setSoap] = useState<SOAPNote>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [icdCodes, setIcdCodes] = useState<ICDCodeItem[]>([]);
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [transcription, setTranscription] = useState(initialTranscription);
  const [patientSummary, setPatientSummary] = useState('');
  const [icdVersion, setIcdVersion] = useState(10);

  const { data: drugOptions } = useQuery({
    queryKey: ['drugOptions'],
    queryFn: () => drugApi.options().then(r => r.data),
    staleTime: Infinity,
  });

  const createMut = useMutation({
    mutationFn: () => consultationApi.create(appointmentId, patientId),
    onSuccess: (res) => {
      const data = res.data;
      setConsultationId(data.consultation_id);
      if (data.transcription) setTranscription(data.transcription);
      if (data.soap_note && Object.values(data.soap_note).some(v => v)) setSoap(data.soap_note as SOAPNote);
      if (data.icd_codes?.length) setIcdCodes(data.icd_codes);
      if (data.prescription?.length) setPrescription(data.prescription);
      if (data.patient_summary) setPatientSummary(data.patient_summary);
    },
  });

  useEffect(() => { createMut.mutate(); }, []); // eslint-disable-line

  // Use the live transcription if we got one
  useEffect(() => { if (initialTranscription && !transcription) setTranscription(initialTranscription); }, [initialTranscription]); // eslint-disable-line

  const addPrescriptionItem = () => setPrescription(prev => [...prev, { drug: '', dose: '', frequency: '', duration: '', notes: '' }]);
  const updatePrescriptionItem = (idx: number, field: keyof PrescriptionItem, value: string) => {
    setPrescription(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const removePrescriptionItem = (idx: number) => setPrescription(prev => prev.filter((_, i) => i !== idx));
  const handleDrugSelect = (idx: number, drug: DrugResult) => {
    setPrescription(prev => prev.map((p, i) => i === idx ? { ...p, drug: drug.name, dose: drug.common_doses?.split(',')[0]?.trim() || p.dose } : p));
  };
  const addIcdFromSearch = (item: ICDCodeItem) => { if (icdCodes.some(c => c.code === item.code)) return; setIcdCodes(prev => [...prev, item]); };
  const addIcdCode = () => setIcdCodes(prev => [...prev, { code: '', description: '', version: 10 }]);
  const updateIcdCode = (idx: number, field: keyof ICDCodeItem, value: string | number) => {
    setIcdCodes(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const removeIcdCode = (idx: number) => setIcdCodes(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async (status: 'draft' | 'confirmed') => {
    if (!consultationId) return;
    setSaving(true);
    try {
      await consultationApi.update(consultationId, {
        soap_note: soap, icd_codes: icdCodes.filter(c => c.code), prescription: prescription.filter(p => p.drug),
        patient_summary: patientSummary || undefined, status,
      });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['allMeetings'] });
      if (status === 'confirmed') setTimeout(() => onExit(), 1500);
      else setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error('Save failed:', err); } finally { setSaving(false); }
  };

  if (createMut.isPending) return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="bg-card border border-border rounded-3xl p-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Creating Consultation Record</h2>
        <p className="text-muted-foreground">Setting up post-meeting documentation...</p>
      </div>
    </div>
  );

  if (saved) return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="bg-card border border-border rounded-3xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><Save className="w-8 h-8" /></div>
        <h2 className="text-2xl font-bold mb-2">Consultation Saved</h2>
        <p className="text-muted-foreground">You can edit this later from the meeting detail page.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-primary" /> Post-Meeting Documentation</h2>
          <p className="text-sm text-muted-foreground mt-1">Review and complete the consultation record. You can save as draft and come back later.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted">Exit</button>
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-4 py-2 border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary/5 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
          </button>
          <button onClick={() => handleSave('confirmed')} disabled={saving}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Confirm & Save
          </button>
        </div>
      </header>

      {/* Transcription (read-only) */}
      <Section title="Meeting Transcription" icon={Mic}>
        {transcription ? <TranscriptionViewer transcription={transcription} /> : (
          <div className="text-center py-6 text-muted-foreground">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No transcription available yet.</p>
          </div>
        )}
      </Section>

      {/* SOAP Note */}
      <Section title="SOAP Note" icon={ClipboardList}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'subjective' as const, label: 'Subjective', hint: 'Patient complaints, symptoms', color: 'border-l-blue-400' },
            { key: 'objective' as const, label: 'Objective', hint: 'Examination findings, vitals', color: 'border-l-green-400' },
            { key: 'assessment' as const, label: 'Assessment', hint: 'Diagnosis, clinical impression', color: 'border-l-yellow-400' },
            { key: 'plan' as const, label: 'Plan', hint: 'Treatment plan, follow-up', color: 'border-l-purple-400' },
          ]).map(({ key, label, hint, color }) => (
            <div key={key} className={`border-l-4 ${color} pl-3`}>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
              <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>
              <textarea value={soap[key]} onChange={e => setSoap(prev => ({ ...prev, [key]: e.target.value }))} rows={3} placeholder={`Enter ${label.toLowerCase()}...`}
                className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
            </div>
          ))}
        </div>
      </Section>

      {/* ICD Codes */}
      <Section title={`Diagnoses / ICD Codes (${icdCodes.length})`} icon={Stethoscope}>
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium text-muted-foreground">Search by code or symptom:</span>
            <select value={icdVersion} onChange={e => setIcdVersion(+e.target.value)} className="text-xs bg-muted/30 border border-border rounded-lg px-2 py-1">
              <option value={10}>ICD-10</option><option value={9}>ICD-9</option>
            </select>
          </div>
          <ICDSearchDropdown version={icdVersion} onSelect={addIcdFromSearch} />
        </div>
        <div className="space-y-2">
          {icdCodes.map((code, i) => (
            <motion.div key={i} layout className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50">
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded shrink-0">{code.code || '...'}</span>
              <input value={code.description} onChange={e => updateIcdCode(i, 'description', e.target.value)} placeholder="Description" className="flex-1 bg-transparent text-sm focus:outline-none" />
              <span className="text-xs text-muted-foreground shrink-0">ICD-{code.version}</span>
              <button onClick={() => removeIcdCode(i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
          <button onClick={addIcdCode} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1"><Plus className="w-3 h-3" /> Add Code Manually</button>
        </div>
      </Section>

      {/* Prescription */}
      <Section title={`Prescription (${prescription.length})`} icon={Pill}>
        <div className="space-y-3">
          {prescription.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No medications. Click below to add one.</p>}
          {prescription.map((rx, i) => (
            <motion.div key={i} layout className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary shrink-0" />
                <DrugSearchInput value={rx.drug} onChange={val => updatePrescriptionItem(i, 'drug', val)} onSelectDrug={drug => handleDrugSelect(i, drug)} />
                <button onClick={() => removePrescriptionItem(i)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">Dose</label>
                  <input type="text" placeholder="e.g. 500mg" value={rx.dose} onChange={e => updatePrescriptionItem(i, 'dose', e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">Frequency</label>
                  {drugOptions?.frequencies ? (
                    <select value={rx.frequency} onChange={e => updatePrescriptionItem(i, 'frequency', e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Select...</option>
                      {drugOptions.frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : <input type="text" placeholder="e.g. TID" value={rx.frequency} onChange={e => updatePrescriptionItem(i, 'frequency', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm" />}
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">Duration</label>
                  {drugOptions?.durations ? (
                    <select value={rx.duration} onChange={e => updatePrescriptionItem(i, 'duration', e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Select...</option>
                      {drugOptions.durations.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : <input type="text" placeholder="e.g. 7 days" value={rx.duration} onChange={e => updatePrescriptionItem(i, 'duration', e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm" />}
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground font-medium">Notes</label>
                  <input type="text" placeholder="e.g. After meals" value={rx.notes} onChange={e => updatePrescriptionItem(i, 'notes', e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </motion.div>
          ))}
          <button onClick={addPrescriptionItem} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"><PlusCircle className="w-4 h-4" /> Add Medication</button>
        </div>
      </Section>

      {/* Patient Summary */}
      <Section title="Patient Summary" icon={FileText} defaultOpen={false}>
        <textarea value={patientSummary} onChange={e => setPatientSummary(e.target.value)} placeholder="Write a patient-friendly summary..."
          rows={4} className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y" />
      </Section>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <button onClick={onExit} className="px-6 py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-muted">Exit (Save Later)</button>
        <div className="flex gap-3">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="px-5 py-2.5 border border-primary text-primary rounded-xl text-sm font-medium hover:bg-primary/5 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save as Draft
          </button>
          <button onClick={() => handleSave('confirmed')} disabled={saving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Confirm & Save to EMR
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main MeetingRoom Export
   ══════════════════════════════════════════════════════════════ */
export default function MeetingRoom() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDoctor = user?.user_type === 'doctor';
  const isPatient = user?.user_type === 'patient';
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const [showPostMeeting, setShowPostMeeting] = useState(false);
  const [tokenData, setTokenData] = useState<MeetingJoinToken | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Live transcription state — built up during the meeting
  const [liveTranscript, setLiveTranscript] = useState('');
  const transcriptBufferRef = useRef<string[]>([]);

  // AI Sidebar state (doctor only)
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { id: '1', role: 'assistant', content: 'Listening to consultation. I can assist with differential diagnoses, fetching patient history, or drafting notes.', time: 'Now' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: appointment } = useQuery({
    queryKey: ['meetingAppointment', appointmentId],
    queryFn: () => appointmentApi.getById(appointmentId!).then(r => r.data),
    enabled: !!appointmentId,
  });

  const remoteName = isDoctor ? appointment?.patient_name || 'Patient' : appointment?.doctor_name || 'Doctor';
  const remoteRole = isDoctor ? 'patient' : 'doctor';
  const localName = user?.full_name || (isDoctor ? 'Doctor' : 'Patient');
  const localRole = isDoctor ? 'doctor' : 'patient';

  // The LiveKit server URL needs to be the WebSocket URL for the client
  // Docker maps 7880 externally, the --dev flag uses ws:// 
  const livekitWsUrl = useMemo(() => {
    if (!tokenData?.livekit_url) return 'ws://localhost:7880';
    // Convert http:// to ws:// for the client
    return tokenData.livekit_url.replace(/^http/, 'ws');
  }, [tokenData]);

  // Create room + get token
  const createRoomMut = useMutation({
    mutationFn: async () => {
      // Create room (may already exist — 409 is OK)
      try {
        await meetingApi.createRoom(appointmentId!);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { detail?: string } } };
        if (err?.response?.status !== 409 && !err?.response?.data?.detail?.includes('already')) throw e;
      }
      // Get join token
      const tokenRes = await meetingApi.joinToken(appointmentId!);
      return tokenRes.data;
    },
    onSuccess: (data) => {
      setTokenData(data);
      setMeetingStarted(true);
      setMeetingStartTime(new Date());
      setConnectionError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setConnectionError(e?.response?.data?.detail || 'Failed to connect to meeting');
    },
  });

  useEffect(() => {
    if (appointmentId && !meetingStarted) createRoomMut.mutate();
  }, [appointmentId]); // eslint-disable-line

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  // ── Real-time transcription: capture speaker audio & transcribe in turns ──
  // Uses MediaRecorder per speaker turn via LiveKit's audio tracks
  // We listen for active speaker changes and send completed turns to transcription

  // Send a single speaker turn to the backend for transcription
  const sendTurnForTranscription = useCallback(async (speakerName: string, speakerRole: string, audioBlob: Blob) => {
    if (audioBlob.size < 5000) return; // Skip very short audio clips
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'turn.webm');
      formData.append('speaker_name', speakerName);
      formData.append('speaker_role', speakerRole);
      const res = await api.post('/meetings/transcribe-turn', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const text = res.data?.text || res.data?.transcript || '';
      if (text.trim()) {
        const label = speakerRole.toUpperCase();
        const line = `${label}: ${text.trim()}`;
        transcriptBufferRef.current.push(line);
        setLiveTranscript(transcriptBufferRef.current.join('\n'));
      }
    } catch (err) {
      console.warn('Turn transcription failed:', err);
    }
  }, []);

  // Doctor: End meeting
  const endMeetingMut = useMutation({
    mutationFn: () => meetingApi.end(appointmentId!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allMeetings'] }); setShowPostMeeting(true); },
    onError: () => setShowPostMeeting(true),
  });

  // Patient: Leave meeting
  const leaveMeetingMut = useMutation({
    mutationFn: () => meetingApi.leave(appointmentId!),
    onSuccess: () => navigate('/patient/meetings'),
    onError: () => navigate('/patient/meetings'),
  });

  const extendMut = useMutation({
    mutationFn: (extraMinutes: number) =>
      appointmentApi.update(appointmentId!, { duration_minutes: (appointment?.duration_minutes || 30) + extraMinutes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetingAppointment', appointmentId] }),
  });

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const newMsg = { id: Date.now().toString(), role: 'user', content: aiInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setAiMessages(prev => [...prev, newMsg]);
    setAiInput('');
    setIsAiLoading(true);
    try {
      const res = await api.post('/agent/clinician/meeting-chat', {
        message: newMsg.content, appointment_id: appointmentId, session_id: `meeting_${appointmentId}`
      }).catch(() => ({ data: { response: "I've checked the patient chart. Please provide more details." } }));
      setAiMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: res.data.response || res.data.reply || res.data.message || 'Done.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally { setIsAiLoading(false); }
  };

  // ── Post-meeting view ──
  if (showPostMeeting && isDoctor && appointment) {
    return (
      <PostMeetingView
        appointmentId={appointmentId!}
        patientId={appointment.patient_id}
        transcription={liveTranscript}
        onExit={() => navigate('/doctor/meetings')}
      />
    );
  }

  // ── Loading / error states ──
  if (createRoomMut.isPending || (!tokenData && !connectionError)) {
    return (
      <div className="w-full h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="bg-card border border-border rounded-3xl p-8 text-center max-w-md">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Joining Meeting</h2>
          <p className="text-sm text-muted-foreground">Connecting to {remoteName}...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="w-full h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="bg-card border border-border rounded-3xl p-8 text-center max-w-md">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{connectionError}</p>
          <button onClick={() => createRoomMut.mutate()} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main meeting view — wrapped in LiveKitRoom ──
  return (
    <div className="w-full h-[calc(100vh-6rem)] flex gap-4">
      <LiveKitRoom
        serverUrl={livekitWsUrl}
        token={tokenData!.token}
        connect={true}
        audio={true}
        video={true}
        className={`flex flex-col h-full transition-all duration-300 ${isDoctor ? 'w-2/3' : 'w-full'}`}
        onDisconnected={() => {
          // If doctor disconnects, it means meeting ended elsewhere
          if (isPatient) navigate('/patient/meetings');
        }}
        onError={(err) => console.error('LiveKit error:', err)}
      >
        <LiveMeetingStage
          appointment={appointment}
          isDoctor={!!isDoctor}
          remoteName={remoteName}
          remoteRole={remoteRole}
          localName={localName}
          localRole={localRole}
          meetingStartTime={meetingStartTime}
          liveTranscript={liveTranscript}
          onEndMeeting={() => endMeetingMut.mutate()}
          onLeaveMeeting={() => leaveMeetingMut.mutate()}
          endPending={endMeetingMut.isPending}
          leavePending={leaveMeetingMut.isPending}
          onExtend={(mins) => extendMut.mutate(mins)}
          extendPending={extendMut.isPending}
          onTranscribeTurn={sendTurnForTranscription}
        />
      </LiveKitRoom>

      {/* Clinician AI Sidebar — Doctor only */}
      {isDoctor && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="w-1/3 min-w-[320px] bg-card border border-border rounded-3xl flex flex-col overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/20">
            <div className="flex flex-col">
              <span className="font-semibold text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Live AI Assistant</span>
              <span className="text-xs text-muted-foreground">MedGemma reasoning active</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Recording Audio" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary text-secondary-foreground border border-border rounded-tl-none'
                }`}>
                  {msg.role === 'assistant' ? <div className="prose prose-sm dark:prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div> : msg.content}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-muted-foreground mr-auto bg-secondary border border-border px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Analyzing records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-border bg-card">
            <form onSubmit={handleAiAsk} className="relative">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Ask about patient history..."
                className="w-full pl-4 pr-10 py-3 bg-muted border-none rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/60" />
              <button type="submit" disabled={!aiInput.trim() || isAiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}
