import { useRef, useState, useCallback } from 'react';
import { sendAudioBatch, type AudioBatchResponse, type BatchTurn } from '../services/consultationService';

export interface UseAudioRecorderOptions {
  /** How often to send a batch (ms). Default 30 000 (30s) */
  batchIntervalMs?: number;
  /** Called when each batch is transcribed */
  onBatchTranscribed?: (resp: AudioBatchResponse) => void;
  /** Called on error */
  onError?: (err: Error) => void;
}

export interface UseAudioRecorderReturn {
  /** Start recording for a given consultation */
  startRecording: (consultationId: string) => Promise<void>;
  /** Stop recording — sends final leftover batch */
  stopRecording: () => Promise<void>;
  isRecording: boolean;
  /** Accumulated transcript text (appended per batch) */
  transcript: string;
  /** All turns from all batches (with adjusted timestamps) */
  allTurns: BatchTurn[];
  /** Current batch index */
  batchIndex: number;
  /** Whether a batch is currently being sent */
  isSending: boolean;
}

export function useAudioRecorder(opts: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    batchIntervalMs = 30000,
    onBatchTranscribed,
    onError,
  } = opts;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [allTurns, setAllTurns] = useState<BatchTurn[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);

  // Refs to survive across closures
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consultIdRef = useRef<string>('');
  const batchIdxRef = useRef(0);
  const prevEndTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  /** Flush current chunks as a batch */
  const flushBatch = useCallback(async () => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;

    // Grab chunks and reset
    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
    chunksRef.current = [];

    if (blob.size < 1000) return; // skip tiny silence chunks

    const idx = batchIdxRef.current;
    batchIdxRef.current += 1;
    setBatchIndex(batchIdxRef.current);

    setIsSending(true);
    try {
      const resp = await sendAudioBatch(
        consultIdRef.current,
        blob,
        idx,
        prevEndTimeRef.current,
      );

      prevEndTimeRef.current = resp.batch_end_time;

      // Append text
      if (resp.batch_text) {
        setTranscript(prev => prev ? `${prev}\n\n${resp.batch_text}` : resp.batch_text);
      }
      // Append turns
      if (resp.batch_turns?.length) {
        setAllTurns(prev => [...prev, ...resp.batch_turns]);
      }

      onBatchTranscribed?.(resp);
    } catch (err: any) {
      console.error('[useAudioRecorder] batch error:', err);
      onError?.(err);
    } finally {
      setIsSending(false);
    }
  }, [onBatchTranscribed, onError]);

  /** Start recording */
  const startRecording = useCallback(async (consultationId: string) => {
    consultIdRef.current = consultationId;
    batchIdxRef.current = 0;
    prevEndTimeRef.current = 0;
    chunksRef.current = [];
    setBatchIndex(0);
    setTranscript('');
    setAllTurns([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Collect data every second
      recorder.start(1000);
      isRecordingRef.current = true;
      setIsRecording(true);

      // Flush every batchIntervalMs
      intervalRef.current = setInterval(() => {
        if (isRecordingRef.current) {
          flushBatch();
        }
      }, batchIntervalMs);
    } catch (err: any) {
      console.error('[useAudioRecorder] mic access error:', err);
      onError?.(err);
    }
  }, [batchIntervalMs, flushBatch, onError]);

  /** Stop recording */
  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Flush remaining
    await flushBatch();
  }, [flushBatch]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    allTurns,
    batchIndex,
    isSending,
  };
}
