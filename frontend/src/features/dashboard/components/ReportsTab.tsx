import { motion } from "framer-motion";
import { Download, FileText, Eye, Search } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "../../../hooks/useMediaQuery";

const reports = [
  {
    date: "Feb 15, 2026",
    doctor: "Dr. Hambire",
    type: "Check-up",
    summary: "Routine check-up — Blood pressure normal, sugar slightly elevated",
    symptoms: "Fatigue, headache",
    files: 2,
  },
  {
    date: "Jan 28, 2026",
    doctor: "Dr. Hambire",
    type: "Follow-up",
    summary: "Follow-up — Medication adjusted for diabetes management",
    symptoms: "Dizziness, thirst",
    files: 3,
  },
  {
    date: "Jan 10, 2026",
    doctor: "Dr. Gupta",
    type: "Consultation",
    summary: "Initial consultation — Diagnosed with Type 2 Diabetes",
    symptoms: "Frequent urination, weight loss",
    files: 5,
  },
  {
    date: "Dec 20, 2025",
    doctor: "Dr. Sharma",
    type: "Lab Review",
    summary: "Annual blood panel review — Cholesterol levels borderline",
    symptoms: "No acute symptoms",
    files: 4,
  },
];

const typeColors: Record<string, { bg: string; text: string }> = {
  "Check-up": { bg: "rgba(31,159,163,0.08)", text: "#1F9FA3" },
  "Follow-up": { bg: "rgba(99,102,241,0.08)", text: "#6366F1" },
  Consultation: { bg: "rgba(245,158,11,0.08)", text: "#F59E0B" },
  "Lab Review": { bg: "rgba(30,157,241,0.08)", text: "#1E9DF1" },
};

const ReportsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const filtered = reports.filter(
    (r) =>
      r.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          marginBottom: "20px",
          gap: isMobile ? "10px" : undefined,
        }}
      >
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
            Medical Reports
          </h2>
          <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontWeight: 500 }}>
            {reports.length} reports available
          </p>
        </div>
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "10px",
            backgroundColor: "white",
            border: "1.5px solid rgba(31,159,163,0.15)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            width: isMobile ? "100%" : "240px",
          }}
        >
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "transparent",
              width: "100%",
              padding: "2px 0",
            }}
          />
        </div>
      </div>

      {/* Reports list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((report, i) => (
          <motion.div
            key={report.date}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
            style={{
              padding: "16px 18px",
              borderRadius: "14px",
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              cursor: "default",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? "10px" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? "10px" : "14px", minWidth: 0 }}>
                {/* Date box */}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(31,159,163,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#1F9FA3",
                      textTransform: "uppercase",
                      lineHeight: 1,
                      marginBottom: "2px",
                    }}
                  >
                    {report.date.split(" ")[0]}
                  </span>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0B3C3D",
                      lineHeight: 1,
                    }}
                  >
                    {report.date.split(" ")[1].replace(",", "")}
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: 650,
                        color: "#0B3C3D",
                        margin: 0,
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {report.doctor}
                    </h4>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        backgroundColor: typeColors[report.type]?.bg,
                        color: typeColors[report.type]?.text,
                      }}
                    >
                      {report.type}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                    {report.summary}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                      <strong style={{ color: "#64748B" }}>Symptoms:</strong> {report.symptoms}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <FileText size={11} /> {report.files} files
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignSelf: isMobile ? "flex-end" : undefined }}>
                <button
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid rgba(31,159,163,0.15)",
                    backgroundColor: "white",
                    color: "#1F9FA3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title="View report"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid rgba(31,159,163,0.15)",
                    backgroundColor: "white",
                    color: "#1F9FA3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title="Download PDF"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ReportsTab;
