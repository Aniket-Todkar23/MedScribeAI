import { motion } from "framer-motion";
import { Calendar, Clock, Video, MapPin, Plus, Phone } from "lucide-react";
import { useIsMobile } from "../../../hooks/useMediaQuery";

const appointments = [
  {
    date: "Feb 24, 2026",
    time: "10:00 AM",
    doctor: "Dr. Hambire",
    specialization: "Endocrinologist",
    type: "Follow-up",
    mode: "In-person",
    status: "Confirmed",
    location: "Room 204, Block A",
  },
  {
    date: "Mar 10, 2026",
    time: "2:30 PM",
    doctor: "Dr. Gupta",
    specialization: "Cardiologist",
    type: "Lab Review",
    mode: "Video Call",
    status: "Pending",
    location: "Telemedicine",
  },
  {
    date: "Mar 25, 2026",
    time: "11:00 AM",
    doctor: "Dr. Sharma",
    specialization: "General Physician",
    type: "Check-up",
    mode: "In-person",
    status: "Confirmed",
    location: "Room 102, Block B",
  },
];

const pastAppointments = [
  {
    date: "Feb 15, 2026",
    doctor: "Dr. Hambire",
    type: "Check-up",
    status: "Completed",
  },
  {
    date: "Jan 28, 2026",
    doctor: "Dr. Hambire",
    type: "Follow-up",
    status: "Completed",
  },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  Confirmed: { bg: "rgba(31,159,163,0.08)", text: "#1F9FA3" },
  Pending: { bg: "rgba(245,165,36,0.08)", text: "#F59E0B" },
  Completed: { bg: "rgba(34,197,94,0.08)", text: "#16A34A" },
  Cancelled: { bg: "rgba(214,69,69,0.08)", text: "#D64545" },
};

const AppointmentsTab = () => {
  const isMobile = useIsMobile();

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
          Appointments
        </h2>
        <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontWeight: 500 }}>
          {appointments.length} upcoming · {pastAppointments.length} past
        </p>
      </div>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "flex-start",
          width: isMobile ? "100%" : "auto",
          gap: "6px",
          padding: "8px 16px",
          borderRadius: "10px",
          border: "none",
          background: "linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)",
          color: "white",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(31,159,163,0.3)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(31,159,163,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(31,159,163,0.3)";
        }}
      >
        <Plus size={14} strokeWidth={2.5} /> Request New
      </button>
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
        { label: "Next Appointment", value: "Feb 24", sub: "Dr. Hambire", icon: Calendar, accent: "#1F9FA3", bg: "rgba(31,159,163,0.06)" },
        { label: "This Month", value: "2", sub: "appointments", icon: Clock, accent: "#6366F1", bg: "rgba(99,102,241,0.06)" },
        { label: "Video Calls", value: "1", sub: "scheduled", icon: Video, accent: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: stat.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <stat.icon size={14} color={stat.accent} strokeWidth={2.2} />
            </div>
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0B3C3D", margin: 0, lineHeight: 1 }}>
            {stat.value}
          </h3>
          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "4px 0 0", fontWeight: 500 }}>
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>

    {/* Upcoming Appointments */}
    <div style={{ marginBottom: "8px" }}>
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 650,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "10px",
        }}
      >
        Upcoming
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {appointments.map((apt, i) => {
          const sc = statusColors[apt.status] || statusColors.Pending;
          return (
            <motion.div
              key={apt.date + apt.doctor}
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
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? "12px" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "14px" }}>
                  {/* Date card */}
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
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
                      {apt.date.split(" ")[0]}
                    </span>
                    <span
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#0B3C3D",
                        lineHeight: 1,
                      }}
                    >
                      {apt.date.split(" ")[1].replace(",", "")}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 650, color: "#0B3C3D", margin: 0 }}>
                        {apt.doctor}
                      </h4>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: sc.bg,
                          color: sc.text,
                        }}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                      {apt.specialization}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
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
                        <Clock size={11} /> {apt.time}
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
                        {apt.mode === "Video Call" ? <Video size={11} /> : <MapPin size={11} />}
                        {apt.location}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
                      <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                        {apt.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignSelf: isMobile ? "flex-end" : undefined }}>
                  {apt.mode === "Video Call" && (
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: "linear-gradient(135deg, #1F9FA3, #17858A)",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(31,159,163,0.25)",
                        transition: "all 0.2s",
                      }}
                    >
                      <Video size={12} /> Join
                    </button>
                  )}
                  <button
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(214,69,69,0.15)",
                      backgroundColor: "white",
                      color: "#D64545",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(214,69,69,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>

    {/* Past Appointments */}
    <div style={{ marginTop: "20px" }}>
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 650,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "10px",
        }}
      >
        Past Appointments
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {pastAppointments.map((apt, i) => (
          <motion.div
            key={apt.date}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "12px",
              backgroundColor: "white",
              border: "1px solid rgba(0,0,0,0.03)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              opacity: 0.75,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Phone size={14} color="#94A3B8" />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#334155", margin: 0 }}>
                  {apt.doctor}
                </p>
                <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0 }}>
                  {apt.date} · {apt.type}
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                backgroundColor: statusColors.Completed.bg,
                color: statusColors.Completed.text,
              }}
            >
              Completed
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
  );
};

export default AppointmentsTab;
