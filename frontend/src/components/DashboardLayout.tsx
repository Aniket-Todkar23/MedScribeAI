import { useState, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity, LogOut, Send, MessageCircle, Bot, ChevronRight,
  Home, PanelRightClose, PanelRightOpen, Menu, X
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  roleBadge: { label: string; className: string };
  breadcrumbs: BreadcrumbItem[];
}

const DashboardLayout = ({
  children,
  navItems,
  activeTab,
  onTabChange,
  roleBadge,
  breadcrumbs,
}: DashboardLayoutProps) => {
  const [rightOpen, setRightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
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
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Diagnostic-IQ</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.className}`}>
            {roleBadge.label}
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-primary-100 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-muted-foreground">
            <Link to="/"><LogOut className="h-4 w-4" /> Logout</Link>
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Diagnostic-IQ</span>
        </div>
        <button onClick={() => setRightOpen(!rightOpen)} className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[52px] z-20 border-b border-border bg-card p-3 lg:hidden">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onTabChange(id); setMobileMenuOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                activeTab === id ? "bg-primary-100 text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {/* Breadcrumb Bar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                {crumb.href ? (
                  <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="hidden lg:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            AI Assistant
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Right Sidebar — AI Chatbot */}
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-80 transform border-l border-border bg-card shadow-elevated transition-transform duration-300 lg:relative lg:z-auto lg:shadow-none ${
          rightOpen ? "translate-x-0" : "translate-x-full lg:hidden"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">AI Assistant</span>
          </div>
          <button onClick={() => setRightOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
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
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI assistant..."
                className="text-xs h-9"
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              />
              <Button size="sm" onClick={handleSendChat} className="h-9 w-9 p-0 flex-shrink-0">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {rightOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setRightOpen(false)} />
      )}
    </div>
  );
};

export default DashboardLayout;
