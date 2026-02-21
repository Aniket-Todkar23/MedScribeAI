import React from "react";
import { Download } from "lucide-react";

const reports = [
  { date: "Feb 15, 2026", doctor: "Dr. Hambire", summary: "Routine check-up — Blood pressure normal, sugar slightly elevated", symptoms: "Fatigue, headache" },
  { date: "Jan 28, 2026", doctor: "Dr. Hambire", summary: "Follow-up — Medication adjusted for diabetes", symptoms: "Dizziness, thirst" },
  { date: "Jan 10, 2026", doctor: "Dr. Gupta", summary: "Initial consultation — Diagnosed with Type 2 Diabetes", symptoms: "Frequent urination, weight loss" },
];

const ReportsTab: React.FC = () => (
  <div className="animate-fade-in">
    <h2 style={{ marginBottom: "var(--space-6)" }}>Reports</h2>

    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {reports.map((report) => (
        <div key={report.date} className="card card-body">
          <div className="flex flex-between items-start">
            <div>
              <h3 style={{ fontSize: "var(--text-h4)" }}>{report.date}</h3>
              <p className="text-sm text-secondary">{report.doctor}</p>
            </div>
            <button className="btn btn-secondary btn-sm">
              <Download size={14} /> PDF
            </button>
          </div>
          <hr className="divider-sm" />
          <p className="text-sm">{report.summary}</p>
          <p className="text-caption text-muted" style={{ marginTop: "var(--space-2)" }}>
            <strong>Symptoms:</strong> {report.symptoms}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default ReportsTab;
