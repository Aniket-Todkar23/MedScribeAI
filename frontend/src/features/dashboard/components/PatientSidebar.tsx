import React from "react";
import { Link } from "react-router-dom";
import { Activity, LogOut } from "lucide-react";
import type { PatientTab } from "./types";

interface PatientSidebarProps {
  tabs: PatientTab[];
  activeTab: string;
  onTabChange: (id: PatientTab["id"]) => void;
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({ tabs, activeTab, onTabChange }) => (
  <aside
    style={{
      width: 260,
      backgroundColor: "var(--color-white)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
    }}
  >
    {/* Brand */}
    <div
      className="flex items-center gap-2"
      style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)" }}
    >
      <Activity size={24} color="var(--color-primary)" />
      <span className="font-bold" style={{ fontSize: "var(--text-h4)" }}>Diagnostic-IQ</span>
      <span className="badge badge-blue mt-auto mb-auto" style={{ marginLeft: "auto" }}>Patient</span>
    </div>

    {/* Nav items */}
    <nav style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: 1 }}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === id ? "var(--color-primary-100)" : "transparent",
            color: activeTab === id ? "var(--color-primary)" : "var(--color-text-secondary)",
            fontWeight: activeTab === id ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
            cursor: "pointer",
            transition: "all var(--transition)",
          }}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </nav>

    {/* Logout */}
    <div style={{ padding: "var(--space-3)", borderTop: "1px solid var(--color-border)" }}>
      <Link to="/" className="btn btn-ghost btn-full justify-start text-muted">
        <LogOut size={18} /> Logout
      </Link>
    </div>
  </aside>
);

export default PatientSidebar;
