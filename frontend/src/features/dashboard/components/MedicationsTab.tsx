import React from "react";

const medications = [
  { medicine: "Metformin", dose: "500mg", time: "Morning & Evening", active: true },
  { medicine: "Amlodipine", dose: "5mg", time: "Morning", active: true },
  { medicine: "Vitamin D3", dose: "60K IU", time: "Weekly (Sunday)", active: false },
];

const thStyle: React.CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  fontWeight: "var(--font-weight-medium)" as string,
  color: "var(--color-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  color: "var(--color-text-muted)",
};

const MedicationsTab: React.FC = () => (
  <div className="animate-fade-in">
    <h2 style={{ marginBottom: "var(--space-6)" }}>Current Medications</h2>

    <div className="card" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
            <th style={thStyle}>Medicine</th>
            <th style={thStyle}>Dose</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Reminder</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((med) => (
            <tr key={med.medicine} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ ...tdStyle, fontWeight: "var(--font-weight-medium)" as string, color: "var(--color-text-primary)" }}>
                {med.medicine}
              </td>
              <td style={tdStyle}>{med.dose}</td>
              <td style={tdStyle}>{med.time}</td>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 24,
                    width: 44,
                    borderRadius: "var(--radius-full)",
                    backgroundColor: med.active ? "var(--color-primary)" : "var(--color-neutral-400)",
                    padding: 2,
                    transition: "background var(--transition)",
                  }}
                >
                  <div
                    style={{
                      height: 20,
                      width: 20,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-white)",
                      transform: med.active ? "translateX(20px)" : "translateX(0)",
                      transition: "transform var(--transition)",
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default MedicationsTab;
