import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Heart, Pill, Activity, Loader2, User, Bot } from "lucide-react";
import type { ChatMessage } from "./types";
import { useIsMobile } from "../../../hooks/useMediaQuery";
import { aiService } from "../../../services/aiService";

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Hello! I'm your AI health assistant powered by Diagnostic-IQ. I can help you understand your health records, medications, and answer general health questions. How can I help you today?",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

const quickSuggestions = [
  { label: "Explain my vitals", icon: Activity },
  { label: "Medication info", icon: Pill },
  { label: "Health tips", icon: Heart },
];

const AIChatTab = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + "px";
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage: ChatMessage = { role: "user", text: trimmed, time: now };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const reply = await aiService.chat(trimmed, { role: "patient" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply.text,
          time: reply.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I'm sorry, I couldn't process your request right now. Please try again in a moment.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%", padding: isMobile ? "12px" : "24px", overflow: "hidden", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isMobile ? "10px" : "14px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(31,159,163,0.25)",
            }}
          >
            <Sparkles size={17} color="white" />
          </div>
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0B3C3D",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              AI Health Assistant
            </h2>
            <p style={{ fontSize: "11px", color: "#1F9FA3", margin: 0, fontWeight: 500 }}>
              Powered by Diagnostic-IQ
            </p>
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            backgroundColor: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.15)",
            fontSize: "10px",
            color: "#16A34A",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#16A34A",
            }}
          />
          Online
        </div>
      </div>

      {/* Chat container */}
      <div
        style={{
          flex: 1,
          borderRadius: "14px",
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.04)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          maxHeight: "100%",
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "14px" : "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  borderRadius: "50%",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                    : "linear-gradient(135deg, #1F9FA3, #17858A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: msg.role === "user"
                    ? "0 2px 8px rgba(99,102,241,0.3)"
                    : "0 2px 8px rgba(31,159,163,0.3)",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {msg.role === "user" ? (
                  <User size={16} color="white" />
                ) : (
                  <Bot size={16} color="white" />
                )}
              </div>
              {/* Message content */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", flex: 1, minWidth: 0 }}>
                {msg.role === "assistant" && (
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#1F9FA3", marginBottom: "4px" }}>
                    AI Assistant
                  </span>
                )}
                {msg.role === "user" && (
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#6366F1", marginBottom: "4px" }}>
                    You
                  </span>
                )}
                <div
                  style={{
                    maxWidth: isMobile ? "90%" : "85%",
                    padding: isMobile ? "10px 12px" : "12px 16px",
                    borderRadius:
                      msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #1F9FA3, #17858A)"
                        : "#F8FDFD",
                    color: msg.role === "user" ? "white" : "#334155",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    boxShadow:
                      msg.role === "user"
                        ? "0 2px 8px rgba(31,159,163,0.25)"
                        : "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(31,159,163,0.06)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {msg.text}
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#94A3B8",
                    marginTop: "4px",
                    padding: "0 4px",
                  }}
                >
                  {msg.time}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "10px" }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1F9FA3, #17858A)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(31,159,163,0.3)",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Bot size={16} color="white" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#1F9FA3", marginBottom: "4px" }}>
                  AI Assistant
                </span>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: "4px 14px 14px 14px",
                    background: "#F8FDFD",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(31,159,163,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#1F9FA3",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  <Loader2 size={14} className="ai-spin" />
                  Thinking...
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid rgba(31,159,163,0.08)",
            background: "linear-gradient(180deg, transparent 0%, rgba(31,159,163,0.02) 100%)",
            flexShrink: 0,
          }}
        >
          {/* Quick suggestions */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "12px",
              overflowX: "auto",
            }}
          >
            {quickSuggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setInput(s.label);
                  textareaRef.current?.focus();
                }}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid rgba(31,159,163,0.2)",
                  backgroundColor: "rgba(31,159,163,0.04)",
                  color: "#1F9FA3",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  opacity: isLoading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.1)";
                    e.currentTarget.style.borderColor = "rgba(31,159,163,0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.04)";
                  e.currentTarget.style.borderColor = "rgba(31,159,163,0.2)";
                }}
              >
                <s.icon size={12} /> {s.label}
              </button>
            ))}
          </div>

          {/* Input box */}
          <div
            style={{
              padding: "4px 4px 4px 14px",
              boxShadow: "0 1px 4px rgba(31,159,163,0.06)",
              borderRadius: "14px",
              backgroundColor: "white",
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              border: "1.5px solid rgba(31,159,163,0.15)",
              transition: "border-color 0.25s ease, box-shadow 0.25s ease",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isLoading ? "Waiting for response..." : "Ask about your health..."}
              disabled={isLoading}
              rows={2}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                padding: "12px 0",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                backgroundColor: "transparent",
                maxHeight: "120px",
                overflowY: "auto",
                color: "#334155",
                lineHeight: "1.4",
                opacity: isLoading ? 0.6 : 1,
                minHeight: "unset",
                height: "auto",
                width: "auto",
                boxShadow: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'transparent';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.borderColor = "rgba(31,159,163,0.4)";
                  parent.style.boxShadow =
                    "0 0 0 3px rgba(31,159,163,0.08), 0 1px 4px rgba(31,159,163,0.1)";
                }
              }}
              onBlur={(e) => {
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.borderColor = "rgba(31,159,163,0.15)";
                  parent.style.boxShadow = "0 1px 4px rgba(31,159,163,0.06)";
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                minHeight: "36px",
                borderRadius: "10px",
                border: "none",
                padding: 0,
                cursor: input.trim() && !isLoading ? "pointer" : "default",
                background:
                  input.trim() && !isLoading
                    ? "linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)"
                    : "rgba(31,159,163,0.06)",
                color: input.trim() && !isLoading ? "white" : "#CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                flexShrink: 0,
                marginBottom: "4px",
                boxShadow:
                  input.trim() && !isLoading ? "0 2px 8px rgba(31,159,163,0.3)" : "none",
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isLoading) {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(31,159,163,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  input.trim() && !isLoading
                    ? "0 2px 8px rgba(31,159,163,0.3)"
                    : "none";
              }}
            >
              {isLoading ? (
                <Loader2 size={16} className="ai-spin" />
              ) : (
                <Send
                  size={16}
                  style={{ transform: "rotate(-45deg)", marginLeft: "2px", marginBottom: "1px" }}
                />
              )}
            </button>
          </div>
          <p
            style={{
              fontSize: "10px",
              color: "#94A3B8",
              textAlign: "center",
              marginTop: "8px",
              fontWeight: 500,
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes ai-spin-kf { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .ai-spin { animation: ai-spin-kf 1s linear infinite; }`}</style>
    </section>
  );
};

export default AIChatTab;
