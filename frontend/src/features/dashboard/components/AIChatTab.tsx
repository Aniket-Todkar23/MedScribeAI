import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const AIChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hello! I'm your AI health assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      {
        role: "assistant",
        text: "Based on your health records, your blood pressure has been well-controlled this week. Continue taking your medication as prescribed and maintain a low-sodium diet. Feel free to ask more questions!",
      },
    ]);
    setInput("");
  };

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: "calc(100vh - var(--space-16))" }}>
      <h2 style={{ marginBottom: "var(--space-4)" }}>AI Health Assistant</h2>

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "80%",
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: "var(--text-sm)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: msg.role === "user" ? "var(--color-primary)" : "var(--color-surface)",
                  color: msg.role === "user" ? "var(--color-white)" : "var(--color-text-primary)",
                  border: msg.role === "user" ? "none" : "1px solid var(--color-border)",
                  borderBottomRightRadius: msg.role === "user" ? 4 : "var(--radius-lg)",
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : "var(--radius-lg)",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="card-footer" style={{ padding: "var(--space-3) var(--space-4)", backgroundColor: "var(--color-white)" }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your health..."
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              style={{ flex: 1 }}
            />
            <button onClick={handleSend} className="btn btn-primary btn-icon">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatTab;
