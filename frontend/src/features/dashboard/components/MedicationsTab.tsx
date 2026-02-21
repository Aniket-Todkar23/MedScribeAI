import { motion } from "framer-motion";
import { Pill, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "../../../hooks/useMediaQuery";

interface Medication {
  medicine: string;
  dose: string;
  frequency: string;
  time: string;
  category: string;
  active: boolean;
  refillDate: string;
  doctor: string;
}

const medications: Medication[] = [
  {
    medicine: "Metformin",
    dose: "500mg",
    frequency: "Twice daily",
    time: "Morning & Evening",
    category: "Diabetes",
    active: true,
    refillDate: "Mar 5, 2026",
    doctor: "Dr. Hambire",
  },
  {
    medicine: "Amlodipine",
    dose: "5mg",
    frequency: "Once daily",
    time: "Morning",
    category: "Blood Pressure",
    active: true,
    refillDate: "Mar 12, 2026",
    doctor: "Dr. Hambire",
  },
  {
    medicine: "Atorvastatin",
    dose: "10mg",
    frequency: "Once daily",
    time: "Night",
    category: "Cholesterol",
    active: true,
    refillDate: "Mar 20, 2026",
    doctor: "Dr. Gupta",
  },
  {
    medicine: "Vitamin D3",
    dose: "60K IU",
    frequency: "Weekly",
    time: "Sunday",
    category: "Supplement",
    active: false,
    refillDate: "Completed",
    doctor: "Dr. Sharma",
  },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  Diabetes: { bg: "rgba(214,69,69,0.08)", text: "#D64545" },
  "Blood Pressure": { bg: "rgba(31,159,163,0.08)", text: "#1F9FA3" },
  Cholesterol: { bg: "rgba(99,102,241,0.08)", text: "#6366F1" },
  Supplement: { bg: "rgba(245,158,11,0.08)", text: "#F59E0B" },
};

const MedicationsTab = () => {
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(
    Object.fromEntries(medications.map((m) => [m.medicine, m.active]))
  );
  const isMobile = useIsMobile();

  const activeMeds = medications.filter((m) => toggleState[m.medicine]);
  const inactiveMeds = medications.filter((m) => !toggleState[m.medicine]);

  return (
    <section>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
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
            Medications
          </h2>
          <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontWeight: 500 }}>
            {activeMeds.length} active · {inactiveMeds.length} completed
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              backgroundColor: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.15)",
              fontSize: "11px",
              color: "#16A34A",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <CheckCircle2 size={12} /> 90% compliance
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "8px" : "10px",
          marginBottom: "16px",
        }}
      >
        {[
          { label: "Active Medications", value: String(activeMeds.length), icon: Pill, accent: "#1F9FA3", bg: "rgba(31,159,163,0.06)" },
          { label: "Next Refill", value: "Mar 5", icon: Clock, accent: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
          { label: "Interactions", value: "None", icon: AlertCircle, accent: "#16A34A", bg: "rgba(34,197,94,0.06)" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "14px 16px",
              borderRadius: "14px",
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.04)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "16px",
                right: "16px",
                height: "2px",
                borderRadius: "0 0 2px 2px",
                background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}60)`,
              }}
            />
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: stat.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <stat.icon size={14} color={stat.accent} strokeWidth={2.2} />
            </div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0B3C3D",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </h3>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0", fontWeight: 500 }}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Medication cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {medications.map((med, i) => {
          const isActive = toggleState[med.medicine];
          const catColor = categoryColors[med.category] || categoryColors.Supplement;

          return (
            <motion.div
              key={med.medicine}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.06 }}
              whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}
              style={{
                padding: "16px 18px",
                borderRadius: "14px",
                backgroundColor: "white",
                border: "1px solid rgba(0,0,0,0.04)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                opacity: isActive ? 1 : 0.6,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: isMobile ? "wrap" : undefined,
                  gap: isMobile ? "10px" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "14px", minWidth: 0, flex: 1 }}>
                  {/* Pill icon */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      backgroundColor: catColor.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Pill size={18} color={catColor.text} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: 650,
                          color: "#0B3C3D",
                          margin: 0,
                        }}
                      >
                        {med.medicine}
                      </h4>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: catColor.bg,
                          color: catColor.text,
                        }}
                      >
                        {med.category}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                      {med.dose} · {med.frequency} · {med.time}
                    </p>
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                        Prescribed by {med.doctor}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
                      <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                        Refill: {med.refillDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() =>
                    setToggleState((prev) => ({
                      ...prev,
                      [med.medicine]: !prev[med.medicine],
                    }))
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 26,
                    width: 46,
                    borderRadius: "9999px",
                    backgroundColor: isActive ? "#1F9FA3" : "#E1E3EB",
                    padding: 3,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.25s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      height: 20,
                      width: 20,
                      borderRadius: "50%",
                      backgroundColor: "white",
                      transform: isActive ? "translateX(20px)" : "translateX(0)",
                      transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default MedicationsTab;
