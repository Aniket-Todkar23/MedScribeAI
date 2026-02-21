import React from "react";
import { Heart, Droplets, Pill, Clock, AlertTriangle } from "lucide-react";

const cards = [
  { label: "Blood Pressure", value: "120/80", status: "Normal", icon: Heart, badge: "badge-teal" },
  { label: "Sugar Level", value: "180 mg/dL", status: "High", icon: Droplets, badge: "badge-red" },
  { label: "Compliance", value: "90%", status: "Good", icon: Pill, badge: "badge-teal" },
  { label: "Next Visit", value: "3 Days", status: "Upcoming", icon: Clock, badge: "badge-blue" },
] as const;

const HealthStatusTab: React.FC = () => (
  <div className="animate-fade-in">
    <div style={{ marginBottom: "var(--space-6)" }}>
      <h2>Health Status</h2>
      <p className="text-secondary text-sm">Welcome, Rahul Sharma</p>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-4 gap-4" style={{ marginBottom: "var(--space-8)" }}>
      {cards.map(({ label, value, status, icon: Icon, badge }) => (
        <div key={label} className="card card-body">
          <div className="flex flex-between items-start" style={{ marginBottom: "var(--space-4)" }}>
            <Icon size={24} color="var(--color-primary)" />
            <span className={`badge ${badge}`}>{status}</span>
          </div>
          <p className="font-bold" style={{ fontSize: "var(--text-h3)" }}>{value}</p>
          <p className="text-sm text-secondary" style={{ marginTop: "var(--space-1)" }}>{label}</p>
        </div>
      ))}
    </div>

    {/* Quick Alert */}
    <div className="alert alert-warning">
      <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="font-semibold" style={{ marginBottom: 2 }}>Sugar Level Alert</p>
        <p>Your blood sugar is above the recommended range. Please consult your doctor.</p>
      </div>
    </div>
  </div>
);

export default HealthStatusTab;
