import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Video, MapPin, Plus, Phone, Loader2,
  RefreshCw, X, AlertCircle, User,
} from "lucide-react";
import { useIsMobile } from "../../../hooks/useMediaQuery";
import { appointmentService } from "../../../services/appointmentService";
import type {
  Appointment,
  Doctor,
  CreateAppointmentPayload,
} from "../../../services/appointmentService";
import { useAuth } from "../../../hooks/useAuth";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  confirmed:   { bg: "rgba(31,159,163,0.08)",  text: "#1F9FA3", label: "Confirmed" },
  scheduled:   { bg: "rgba(31,159,163,0.08)",  text: "#1F9FA3", label: "Scheduled" },
  pending:     { bg: "rgba(245,165,36,0.08)",  text: "#F59E0B", label: "Pending" },
  completed:   { bg: "rgba(34,197,94,0.08)",   text: "#16A34A", label: "Completed" },
  cancelled:   { bg: "rgba(214,69,69,0.08)",   text: "#D64545", label: "Cancelled" },
  in_progress: { bg: "rgba(99,102,241,0.08)",  text: "#6366F1", label: "In Progress" },
  no_show:     { bg: "rgba(214,69,69,0.08)",   text: "#D64545", label: "No Show" },
};

const APPOINTMENT_TYPES: { value: Appointment["appointment_type"]; label: string }[] = [
  { value: "in_person", label: "In-Person" },
  { value: "telehealth", label: "Video Call (Telehealth)" },
  { value: "follow_up", label: "Follow-up" },
  { value: "routine_checkup", label: "Routine Check-up" },
  { value: "emergency", label: "Emergency" },
];

const AppointmentsTab = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  /* -------- data state -------- */
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* -------- action state -------- */
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* -------- modal state -------- */
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState<{
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    duration_minutes: number;
    appointment_type: Appointment["appointment_type"];
    reason: string;
  }>({
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: 30,
    appointment_type: "in_person",
    reason: "",
  });

  /* -------- derived data -------- */
  const now = new Date();
  const upcoming = appointments.filter(
    (a) => !["completed", "cancelled", "no_show"].includes(a.status)
  );
  const past = appointments.filter((a) =>
    ["completed", "cancelled", "no_show"].includes(a.status)
  );
  const videoCount = upcoming.filter((a) => a.appointment_type === "telehealth").length;
  const nextApt = upcoming.length
    ? upcoming.reduce((a, b) =>
        new Date(a.appointment_date) < new Date(b.appointment_date) ? a : b
      )
    : null;

  /* -------- fetch -------- */
  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getByPatient(user.id);
      setAppointments(data || []);
    } catch (err: any) {
      console.error("Failed to fetch appointments:", err);
      setError("Could not load appointments. Pull to refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchDoctors = useCallback(async () => {
    try {
      const data = await appointmentService.getAllDoctors();
      setDoctors(data || []);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [fetchAppointments, fetchDoctors]);

  /* -------- actions -------- */
  const handleCancel = async (id: string) => {
    if (!cancelReason.trim()) return alert("Please provide a cancellation reason.");
    setActionLoading(id);
    try {
      await appointmentService.cancel(id, cancelReason);
      setCancellingId(null);
      setCancelReason("");
      await fetchAppointments();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert("Failed to cancel appointment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !requestForm.doctor_id || !requestForm.appointment_date || !requestForm.appointment_time) {
      return alert("Please fill all required fields.");
    }
    setRequestLoading(true);
    try {
      const payload: CreateAppointmentPayload = {
        doctor_id: requestForm.doctor_id,
        patient_id: user.id,
        appointment_date: new Date(
          `${requestForm.appointment_date}T${requestForm.appointment_time}`
        ).toISOString(),
        duration_minutes: requestForm.duration_minutes,
        appointment_type: requestForm.appointment_type,
        reason: requestForm.reason || undefined,
      };
      await appointmentService.create(payload);
      setShowRequestModal(false);
      setRequestForm({
        doctor_id: "",
        appointment_date: "",
        appointment_time: "",
        duration_minutes: 30,
        appointment_type: "in_person",
        reason: "",
      });
      await fetchAppointments();
    } catch (err: any) {
      console.error("Request failed:", err);
      alert(err?.response?.data?.message || "Failed to request appointment.");
    } finally {
      setRequestLoading(false);
    }
  };

  /* -------- helpers -------- */
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const fmtMonth = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short" });
  };
  const fmtDay = (iso: string) => {
    return new Date(iso).getDate().toString();
  };

  /* -------- stat cards -------- */
  const nextAptLabel = nextApt
    ? `${fmtMonth(nextApt.appointment_date)} ${fmtDay(nextApt.appointment_date)}`
    : "—";
  const nextAptSub = nextApt?.doctor?.full_name ?? "";
  const thisMonthCount = upcoming.filter((a) => {
    const d = new Date(a.appointment_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>
      <div style={{ display: "flex", gap: "8px", width: isMobile ? "100%" : "auto" }}>
        <button
          onClick={fetchAppointments}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
            backgroundColor: "white",
            color: "#64748B",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
        <button
          onClick={() => setShowRequestModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: isMobile ? 1 : undefined,
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
    </div>

    {/* Error banner */}
    {error && (
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
          padding: "10px 14px", borderRadius: 10,
          backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
          fontSize: 12, color: "#B91C1C",
        }}
      >
        <AlertCircle size={14} /> {error}
      </div>
    )}

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
        { label: "Next Appointment", value: nextAptLabel, sub: nextAptSub, icon: Calendar, accent: "#1F9FA3", bg: "rgba(31,159,163,0.06)" },
        { label: "This Month", value: String(thisMonthCount), sub: "appointments", icon: Clock, accent: "#6366F1", bg: "rgba(99,102,241,0.06)" },
        { label: "Video Calls", value: String(videoCount), sub: "scheduled", icon: Video, accent: "#F59E0B", bg: "rgba(245,158,11,0.06)" },
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

    {/* Loading / Empty */}
    {loading ? (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#1F9FA3" }} />
      </div>
    ) : (
      <>
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
            Upcoming ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                textAlign: "center", padding: 40, backgroundColor: "white",
                borderRadius: 14, border: "1px solid #E2E8F0",
              }}
            >
              <Calendar size={36} style={{ color: "#94A3B8", marginBottom: 8 }} />
              <p style={{ color: "#94A3B8", fontSize: 13 }}>No upcoming appointments.</p>
              <button
                onClick={() => setShowRequestModal(true)}
                style={{
                  marginTop: 10, padding: "8px 20px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #1F9FA3, #17858A)",
                  color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Plus size={13} style={{ verticalAlign: "middle", marginRight: 4 }} /> Book an Appointment
              </button>
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <AnimatePresence>
                {upcoming.map((apt, i) => {
                  const sc = statusColors[apt.status] || statusColors.pending;
                  const isCancelOpen = cancellingId === apt.appointment_id;
                  return (
                    <motion.div
                      key={apt.appointment_id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.35, delay: 0.1 + i * 0.04 }}
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
                              {fmtMonth(apt.appointment_date)}
                            </span>
                            <span
                              style={{
                                fontSize: "20px",
                                fontWeight: 800,
                                color: "#0B3C3D",
                                lineHeight: 1,
                              }}
                            >
                              {fmtDay(apt.appointment_date)}
                            </span>
                          </div>

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                              <h4 style={{ fontSize: "14px", fontWeight: 650, color: "#0B3C3D", margin: 0 }}>
                                {apt.doctor?.full_name ?? "Doctor"}
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
                                {sc.label}
                              </span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                              {apt.doctor?.specialization ?? ""}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
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
                                <Clock size={11} /> {fmtTime(apt.appointment_date)}
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
                                {apt.appointment_type === "telehealth" ? <Video size={11} /> : <MapPin size={11} />}
                                {apt.appointment_type?.replace("_", " ")}
                              </span>
                              {apt.reason && (
                                <>
                                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
                                  <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                                    {apt.reason}
                                  </span>
                                </>
                              )}
                              <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
                              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>
                                {apt.duration_minutes} min
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignSelf: isMobile ? "flex-end" : undefined }}>
                          {apt.appointment_type === "telehealth" && apt.meet_link && (
                            <a
                              href={apt.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
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
                                textDecoration: "none",
                              }}
                            >
                              <Video size={12} /> Join
                            </a>
                          )}
                          {!["cancelled", "completed"].includes(apt.status) && (
                            <button
                              onClick={() =>
                                setCancellingId(isCancelOpen ? null : apt.appointment_id)
                              }
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid rgba(214,69,69,0.15)",
                                backgroundColor: isCancelOpen ? "rgba(214,69,69,0.04)" : "white",
                                color: "#D64545",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cancel reason input */}
                      {isCancelOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          style={{ display: "flex", gap: 8, marginTop: 10 }}
                        >
                          <input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason for cancellation"
                            style={{
                              flex: 1, padding: "8px 14px", borderRadius: 8, fontSize: 12,
                              border: "1px solid #E2E8F0", outline: "none",
                            }}
                          />
                          <button
                            onClick={() => handleCancel(apt.appointment_id)}
                            disabled={actionLoading === apt.appointment_id}
                            style={{
                              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                              backgroundColor: "#D64545", color: "white", border: "none", cursor: "pointer",
                              opacity: actionLoading === apt.appointment_id ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === apt.appointment_id ? "..." : "Confirm Cancel"}
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Past Appointments */}
        {past.length > 0 && (
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
              Past Appointments ({past.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {past.map((apt, i) => {
                const sc = statusColors[apt.status] || statusColors.completed;
                return (
                  <motion.div
                    key={apt.appointment_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
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
                      {apt.appointment_type === "telehealth" ? (
                        <Video size={14} color="#94A3B8" />
                      ) : (
                        <User size={14} color="#94A3B8" />
                      )}
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#334155", margin: 0 }}>
                          {apt.doctor?.full_name ?? "Doctor"}
                        </p>
                        <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0 }}>
                          {fmtDate(apt.appointment_date)} · {apt.appointment_type?.replace("_", " ")}
                          {apt.reason ? ` · ${apt.reason}` : ""}
                        </p>
                      </div>
                    </div>
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
                      {sc.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </>
    )}

    {/* ========== Request Appointment Modal ========== */}
    <AnimatePresence>
      {showRequestModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowRequestModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? "94vw" : 480,
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: 18,
              padding: "28px 24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0B3C3D", margin: 0 }}>
                Request Appointment
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  backgroundColor: "#F1F5F9", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={16} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Doctor */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                  Doctor *
                </label>
                <select
                  required
                  value={requestForm.doctor_id}
                  onChange={(e) => setRequestForm((f) => ({ ...f, doctor_id: e.target.value }))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                    border: "1px solid #E2E8F0", outline: "none", backgroundColor: "white",
                  }}
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((d) => (
                    <option key={d.doctor_id} value={d.doctor_id}>
                      {d.full_name}{d.specialization ? ` — ${d.specialization}` : ""}
                      {d.hospital_name ? ` (${d.hospital_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={requestForm.appointment_date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setRequestForm((f) => ({ ...f, appointment_date: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      border: "1px solid #E2E8F0", outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={requestForm.appointment_time}
                    onChange={(e) => setRequestForm((f) => ({ ...f, appointment_time: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      border: "1px solid #E2E8F0", outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Type & Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                    Type
                  </label>
                  <select
                    value={requestForm.appointment_type}
                    onChange={(e) =>
                      setRequestForm((f) => ({
                        ...f,
                        appointment_type: e.target.value as Appointment["appointment_type"],
                      }))
                    }
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      border: "1px solid #E2E8F0", outline: "none", backgroundColor: "white",
                    }}
                  >
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                    Duration (min)
                  </label>
                  <select
                    value={requestForm.duration_minutes}
                    onChange={(e) =>
                      setRequestForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
                    }
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                      border: "1px solid #E2E8F0", outline: "none", backgroundColor: "white",
                    }}
                  >
                    {[15, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4, display: "block" }}>
                  Reason / Notes
                </label>
                <textarea
                  rows={3}
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Brief description of your concern…"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
                    border: "1px solid #E2E8F0", outline: "none", resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={requestLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #1F9FA3 0%, #17858A 100%)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: requestLoading ? "not-allowed" : "pointer",
                  opacity: requestLoading ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(31,159,163,0.3)",
                  marginTop: 4,
                }}
              >
                {requestLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Calendar size={16} />
                )}
                {requestLoading ? "Requesting…" : "Request Appointment"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
  );
};

export default AppointmentsTab;
