import React from "react";
import { Calendar } from "lucide-react";

const appointments = [
  { date: "Feb 24, 2026", time: "10:00 AM", doctor: "Dr. Hambire", type: "Follow-up", status: "Confirmed" },
  { date: "Mar 10, 2026", time: "2:30 PM", doctor: "Dr. Gupta", type: "Lab Review", status: "Pending" },
];

const AppointmentsTab: React.FC = () => (
  <div className="animate-fade-in">
    <div className="flex flex-between items-center" style={{ marginBottom: "var(--space-6)" }}>
      <h2>Appointments</h2>
      <button className="btn btn-primary">
        <Calendar size={18} /> Request New
      </button>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {appointments.map((apt) => (
        <div key={apt.date} className="card card-body flex flex-between items-center">
          <div className="flex items-center gap-4">
            <div
              className="flex flex-col flex-center text-primary"
              style={{
                height: 64,
                width: 64,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary-100)",
              }}
            >
              <span className="text-caption font-bold" style={{ lineHeight: 1, marginBottom: 4 }}>
                {apt.date.split(" ")[0].toUpperCase()}
              </span>
              <span style={{ fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", lineHeight: 1 }}>
                {apt.date.split(" ")[1].replace(",", "")}
              </span>
            </div>
            <div>
              <p className="font-semibold" style={{ fontSize: "var(--text-h4)" }}>{apt.doctor}</p>
              <p className="text-sm text-secondary">{apt.time} · {apt.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`badge ${apt.status === "Confirmed" ? "badge-teal" : "badge-amber"}`}>
              {apt.status}
            </span>
            <button className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AppointmentsTab;
