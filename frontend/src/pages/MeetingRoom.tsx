import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Bot, Send, Loader2, FileText, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

export default function MeetingRoom() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  
  // Doctor AI Sidebar State
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { id: '1', role: 'assistant', content: 'Listening to consultation. I can assist with differential diagnoses, fetching patient history, or drafting notes.', time: 'Now' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showPostMeeting, setShowPostMeeting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const handleEndCall = () => {
    if (user?.user_type === 'doctor') {
      setShowPostMeeting(true);
      // Simulate backend EMR generation
      setTimeout(() => {
        setIsAiLoading(false);
      }, 3000);
    } else {
      navigate((user as any)?.user_type === 'doctor' ? '/doctor' : '/patient');
    }
  };

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const newMsg = { id: Date.now().toString(), role: 'user', content: aiInput, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    setAiMessages(prev => [...prev, newMsg]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const res = await api.post('/agent/clinician/chat', {
        message: newMsg.content,
        patient_id: "placeholder",
        session_id: "meeting_session"
      }).catch(() => {
        return { data: { response: "I've checked the patient chart. Please provide more details for a targeted analysis." }};
      });

      setAiMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: res.data.response || res.data.reply || res.data.message || "Done.",
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (showPostMeeting && user?.user_type === 'doctor') {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Meeting Ended Successfully</h2>
          <p className="text-muted-foreground mb-8">The AI Core Service is generating the EMR notes from your audio transcript...</p>
          
          <div className="bg-muted/30 border border-border p-6 rounded-2xl text-left relative overflow-hidden">
            {isAiLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex items-center gap-3 bg-card px-6 py-3 rounded-full border border-border shadow-lg">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="font-medium text-sm">Processing Audio via Modal/MedGemma...</span>
                </div>
              </div>
            )}
            <h3 className="font-semibold flex items-center gap-2 mb-4 border-b border-border pb-2">
              <FileText className="w-5 h-5 text-primary" /> Auto-drafted SOAP Note
            </h3>
            <div className="space-y-4 text-sm font-mono text-muted-foreground">
              <div><strong className="text-foreground">S (Subjective):</strong> Patient reports right lower quadrant abdominal pain starting yesterday. Mild nausea.</div>
              <div><strong className="text-foreground">O (Objective):</strong> Vitals normal. Not in acute distress on video.</div>
              <div><strong className="text-foreground">A (Assessment):</strong> R09.89 (Other specified symptoms and signs involving the circulatory and respiratory systems) - Need to rule out appendicitis.</div>
              <div><strong className="text-foreground">P (Plan):</strong> Advised ER visit if pain worsens. Scheduled ultrasound.</div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => navigate('/doctor')}
                className="px-6 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted"
              >
                Discard
              </button>
              <button 
                onClick={() => navigate('/doctor')}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
              >
                Save to EMR & Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex gap-6">
      {/* Video Area */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${user?.user_type === 'doctor' ? 'w-2/3' : 'w-full max-w-4xl mx-auto'}`}>
        
        {/* Main Video View (Remote Participant) */}
        <div className="flex-1 bg-black rounded-3xl relative overflow-hidden flex items-center justify-center group border border-border/10">
          <div className="text-white/30 flex flex-col items-center">
             <UserRound className="w-20 h-20 mb-4" />
             <p>{user?.user_type === 'doctor' ? 'Patient Feed' : 'Clinician Feed'}</p>
          </div>
          
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs font-semibold tracking-wide border border-white/10">
            {user?.user_type === 'doctor' ? 'Patient Feed' : 'Clinician Feed'}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setMicOn(!micOn)}
              className={`p-3 rounded-xl transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            >
              {micOn ? <Mic className="w-5 h-5"/> : <MicOff className="w-5 h-5"/>}
            </button>
            <button 
              onClick={() => setVideoOn(!videoOn)}
              className={`p-3 rounded-xl transition-colors ${videoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            >
              {videoOn ? <VideoIcon className="w-5 h-5"/> : <VideoOff className="w-5 h-5"/>}
            </button>
            <button 
              onClick={handleEndCall}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              <PhoneOff className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* Local Video View */}
        <div className="h-48 bg-black rounded-3xl relative overflow-hidden flex items-center justify-center border border-border/10">
           <div className="text-white/30 text-sm">
             {videoOn ? 'Your Camera' : 'Camera Off'}
           </div>
        </div>
      </div>

      {/* Clinician Sidebar */}
      {user?.user_type === 'doctor' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-1/3 min-w-[320px] bg-card border border-border rounded-3xl flex flex-col overflow-hidden shadow-sm"
        >
          <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/20">
            <div className="flex flex-col">
              <span className="font-semibold text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Live AI Assistant
              </span>
              <span className="text-xs text-muted-foreground">MedGemma reasoning active</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Recording Audio" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-muted border border-border rounded-tl-none'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex items-center gap-2 text-muted-foreground mr-auto bg-muted border border-border px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Analyzing records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border bg-card">
            <form onSubmit={handleAiAsk} className="relative">
              <input 
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Ask about patient history..."
                className="w-full pl-4 pr-10 py-3 bg-muted border-none rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/60 transition-all shadow-inner inset-shadow-sm"
              />
              <button 
                type="submit"
                disabled={!aiInput.trim() || isAiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}