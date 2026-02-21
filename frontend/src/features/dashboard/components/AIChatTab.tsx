import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Heart, Pill, Activity } from "lucide-react";
import type { ChatMessage } from "./types";
import { useIsMobile } from "../../../hooks/useMediaQuery";

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Hello! I'm your AI health assistant powered by Diagnostic-IQ. I can help you understand your health records, medications, and answer general health questions. How can I help you today?",
    time: "10:30 AM",
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
  const isMobile = useIsMobile();

  const handleSend = () => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text: input, time: now }]);
    setInput("");

    setTimeout(() => {
      const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Based on your recent health records:\n\n• Your blood pressure has been improving (120/80 mmHg - normal range)\n• Blood sugar at 180 mg/dL is above target — continue your Metformin and follow dietary guidelines\n• Medication compliance is at 90% — great job!\n\nWould you like me to explain anything in more detail?",
          time: responseTime,
        },
      ]);
    }, 1200);
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%", padding: isMobile ? "12px" : "24px" }}>
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
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
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
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(31,159,163,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles size={11} color="#1F9FA3" />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#1F9FA3" }}>
                    AI Assistant
                  </span>
                </div>
              )}
              <div
                style={{
                  maxWidth: isMobile ? "90%" : "75%",
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
            </motion.div>
          ))}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid rgba(31,159,163,0.08)",
            background: "linear-gradient(180deg, transparent 0%, rgba(31,159,163,0.02) 100%)",
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
                onClick={() => setInput(s.label)}
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
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.1)";
                  e.currentTarget.style.borderColor = "rgba(31,159,163,0.35)";
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
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              backgroundColor: "white",
              borderRadius: "14px",
              border: "1.5px solid rgba(31,159,163,0.15)",
              padding: "4px 4px 4px 14px",
              transition: "border-color 0.25s ease, box-shadow 0.25s ease",
              boxShadow: "0 1px 4px rgba(31,159,163,0.06)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your health..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                padding: "8px 0",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                backgroundColor: "transparent",
                maxHeight: "80px",
                overflowY: "auto",
                color: "#334155",
                lineHeight: "1.4",
              }}
              onFocus={(e) => {
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
              disabled={!input.trim()}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "none",
                cursor: input.trim() ? "pointer" : "default",
                background: input.trim()
                  ? "linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)"
                  : "rgba(31,159,163,0.06)",
                color: input.trim() ? "white" : "#CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                flexShrink: 0,
                boxShadow: input.trim() ? "0 2px 8px rgba(31,159,163,0.3)" : "none",
              }}
              onMouseEnter={(e) => {
                if (input.trim()) {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(31,159,163,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = input.trim()
                  ? "0 2px 8px rgba(31,159,163,0.3)"
                  : "none";
              }}
            >
              <Send
                size={16}
                style={{ transform: "rotate(-45deg)", marginLeft: "2px", marginBottom: "1px" }}
              />
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
    </section>
  );
};

export default AIChatTab;
