import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, X } from "lucide-react";
import type { ChatMessage } from "./types";

interface AIChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AIChatSidebar = ({ open, onClose }: AIChatSidebarProps) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hello! I'm your Diagnostic-IQ assistant. How can I help you today?" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    // Mock AI response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Based on current medical records and AI analysis, I can help with clinical decision support, patient history lookups, and EMR guidance. Please provide more details about your query.",
        },
      ]);
    }, 800);
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-80 transform border-l border-border bg-card shadow-elevated transition-transform duration-300 lg:relative lg:z-auto lg:shadow-none ${
        open ? "translate-x-0" : "translate-x-full lg:hidden"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">AI Assistant</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-[calc(100%-3.5rem)] flex-col">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)}
              placeholder="Ask AI assistant..."
              className="text-xs h-9"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSendChat()}
            />
            <Button size="sm" onClick={handleSendChat} className="h-9 w-9 p-0 flex-shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AIChatSidebar;
