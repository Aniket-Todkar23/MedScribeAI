import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, User, CheckCircle, XCircle, Video,
  Loader2, RefreshCw, Wifi, WifiOff, ExternalLink, AlertCircle,
} from "lucide-react";
import { appointmentService } from "../../../../services/appointmentService";
import type { Appointment } from "../../../../services/appointmentService";
import { useAuth } from "../../../../hooks/useAuth";

type FilterTab = "pending" | "confirmed" | "completed" | "all";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "#FFF7ED", text: "#C2410C", label: "Pending" },
  confirmed: { bg: "#ECFDF5", text: "#047857", label: "Confirmed" },
  completed: { bg: "#EFF6FF", text: "#1D4ED8", label: "Completed" },
  cancelled: { bg: "#FEF2F2", text: "#B91C1C", label: "Cancelled" },
  in_progress: { bg: "#F5F3FF", text: "#6D28D9", label: "In Progress" },
  scheduled: { bg: "#F0FDFA", text: "#0F766E", label: "Scheduled" },
  no_show:   { bg: "#FEF2F2", text: "#B91C1C", label: "No Show" },
};

const DoctorAppointmentsTab: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return;
    console.log("[DoctorAppointmentsTab] Fetching appointments for doctor:", user.id);
    setLoading(true);
    try {
      const data = await appointmentService.getByDoctor(user.id);
      console.log(`[DoctorAppointmentsTab] Received ${data?.length ?? 0} appointments`);
      setAppointments(data || []);
      setAuthError(false);
    } catch (err: any) {
      console.error("Failed to fetch appointments:", err);
      if (err.response?.status === 401) setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const checkGoogleStatus = useCallback(async () => {
    try {
      const status = await appointmentService.getGoogleTokenStatus();
      setGoogleConnected(status.connected);
    } catch {
      setGoogleConnected(false);
    } finally {
      setCheckingGoogle(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    checkGoogleStatus();
  }, [fetchAppointments, checkGoogleStatus]);

  // Listen for Google OAuth callback messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "google-oauth-success") {
        setGoogleConnected(true);
        checkGoogleStatus();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [checkGoogleStatus]);

  const handleConnectGoogle = async () => {
    setConnectError(null);
    try {
      const authUrl = await appointmentService.getGoogleAuthUrl();
      const popup = window.open(authUrl, "google-oauth", "width=500,height=600,left=300,top=100");
      // Poll popup for closure
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          checkGoogleStatus();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Failed to get Google auth URL:", err);
      if (err.response?.status === 401) {
        setConnectError("Session expired. Please log out and log back in.");
      } else {
        setConnectError("Failed to connect. Please try again.");
      }
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await appointmentService.approve(id);
      await fetchAppointments();
    } catch (err) {
      console.error("Failed to approve:", err);
      alert("Failed to approve appointment. Check console.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await appointmentService.reject(id, rejectReason || undefined);
      setRejectingId(null);
      setRejectReason("");
      await fetchAppointments();
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filterTab === "all") return true;
    if (filterTab === "pending") return a.status === "pending";
    if (filterTab === "confirmed") return a.status === "confirmed" || a.status === "in_progress";
    if (filterTab === "completed") return a.status === "completed";
    return true;
  });

  const counts = {
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed" || a.status === "in_progress").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    all: appointments.length,
  };

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "confirmed", label: "Upcoming", count: counts.confirmed },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "all", label: "All", count: counts.all },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0B3C3D" }}>Appointments</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Google Calendar status */}
          {!checkingGoogle && (
            <button
              onClick={googleConnected ? undefined : handleConnectGoogle}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: "1px solid",
                borderColor: googleConnected ? "#059669" : "#D97706",
                backgroundColor: googleConnected ? "#ECFDF5" : "#FFFBEB",
                color: googleConnected ? "#059669" : "#D97706",
                cursor: googleConnected ? "default" : "pointer",
              }}
            >
              {googleConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {googleConnected ? "Google Connected" : "Connect Google Calendar"}
            </button>
          )}
          <button
            onClick={fetchAppointments}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              backgroundColor: "#F0FDFA", color: "#0F766E", border: "1px solid #99F6E4",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Connect error */}
      {connectError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          padding: "12px 16px", borderRadius: 10,
          backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
          fontSize: 13, color: "#B91C1C",
        }}>
          <AlertCircle size={16} /> {connectError}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterTab(t.key)}
            style={{
              padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.2s",
              backgroundColor: filterTab === t.key ? "#0F766E" : "#F1F5F9",
              color: filterTab === t.key ? "white" : "#475569",
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: 6, padding: "1px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                backgroundColor: filterTab === t.key ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                color: filterTab === t.key ? "white" : "#475569",
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Auth error */}
      {authError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: "center", padding: 40, backgroundColor: "#FEF2F2",
            borderRadius: 16, border: "1px solid #FECACA", marginBottom: 16,
          }}
        >
          <AlertCircle size={40} style={{ color: "#DC2626", marginBottom: 8 }} />
          <h3 style={{ color: "#991B1B", fontSize: 16, marginBottom: 6 }}>Session Expired</h3>
          <p style={{ color: "#B91C1C", fontSize: 13, marginBottom: 16 }}>
            Your login session has expired. Please log out and log back in.
          </p>
          <button
            onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); window.location.href = '/'; }}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              backgroundColor: "#DC2626", color: "white", border: "none", cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {!authError && loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "#0F766E" }} />
        </div>
      ) : !authError && filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: "center", padding: 60, backgroundColor: "white",
            borderRadius: 16, border: "1px solid #E2E8F0",
          }}
        >
          <Calendar size={48} style={{ color: "#94A3B8", marginBottom: 12 }} />
          <h3 style={{ color: "#334155", fontSize: 16, marginBottom: 6 }}>No appointments found</h3>
          <p style={{ color: "#94A3B8", fontSize: 13 }}>
            {filterTab === "pending"
              ? "No pending appointment requests right now."
              : "No appointments in this category."}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((apt) => {
              const sc = statusColors[apt.status] || statusColors.pending;
              const date = new Date(apt.appointment_date);
              const isPending = apt.status === "pending";
              const isConfirmed = apt.status === "confirmed";
              const isRejectOpen = rejectingId === apt.appointment_id;

              return (
                <motion.div
                  key={apt.appointment_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    backgroundColor: "white", borderRadius: 14, padding: "18px 22px",
                    border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    {/* Left: patient + details */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 12,
                        background: "linear-gradient(135deg, #0F766E, #14B8A6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontSize: 18, fontWeight: 700,
                      }}>
                        {(apt.patient?.full_name || "P")[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
                          {apt.patient?.full_name || "Patient"}
                        </p>
                        <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 13, color: "#64748B" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Calendar size={13} />
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={13} />
                            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {apt.appointment_type === "telehealth" ? <Video size={13} /> : <User size={13} />}
                            {apt.appointment_type?.replace("_", " ")}
                          </span>
                        </div>
                        {apt.reason && (
                          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                            Reason: {apt.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: status badge + duration */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        backgroundColor: sc.bg, color: sc.text,
                      }}>
                        {sc.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{apt.duration_minutes} min</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button
                        onClick={() => handleApprove(apt.appointment_id)}
                        disabled={actionLoading === apt.appointment_id}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                          backgroundColor: "#059669", color: "white", border: "none", cursor: "pointer",
                          opacity: actionLoading === apt.appointment_id ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === apt.appointment_id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <CheckCircle size={15} />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(isRejectOpen ? null : apt.appointment_id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                          backgroundColor: "#FEE2E2", color: "#B91C1C", border: "none", cursor: "pointer",
                        }}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  )}

                  {/* Reject reason input */}
                  {isRejectOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      style={{ display: "flex", gap: 8, marginTop: 4 }}
                    >
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        style={{
                          flex: 1, padding: "8px 14px", borderRadius: 8, fontSize: 13,
                          border: "1px solid #E2E8F0", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => handleReject(apt.appointment_id)}
                        disabled={actionLoading === apt.appointment_id}
                        style={{
                          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          backgroundColor: "#B91C1C", color: "white", border: "none", cursor: "pointer",
                        }}
                      >
                        Confirm Reject
                      </button>
                    </motion.div>
                  )}

                  {/* Meeting link for confirmed / in-progress appointments */}
                  {(isConfirmed || apt.status === "in_progress") && apt.meet_link && (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 10, marginTop: 4,
                      padding: "14px 18px", borderRadius: 12,
                      background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)",
                      border: "1px solid #BBF7D0",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: "linear-gradient(135deg, #059669, #10B981)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                        }}>
                          <Video size={20} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#047857" }}>
                            {apt.status === "in_progress" ? "Meeting in progress" : "Ready to start meeting"}
                          </p>
                          <p style={{ fontSize: 12, color: "#6EE7B7" }}>Google Meet + Audio Recording</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <a
                          href={`/meeting/${apt.appointment_id}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1,
                            padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                            background: "linear-gradient(135deg, #059669, #10B981)",
                            color: "white", textDecoration: "none",
                            boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
                            transition: "transform 0.15s, box-shadow 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(5,150,105,0.4)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(5,150,105,0.3)"; }}
                        >
                          <Video size={18} /> Start Meeting & Record
                        </a>
                        <a
                          href={apt.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                            backgroundColor: "white", color: "#047857",
                            border: "1px solid #BBF7D0", textDecoration: "none",
                          }}
                        >
                          <ExternalLink size={14} /> Google Meet
                        </a>
                      </div>
                    </div>
                  )}

                  {/* For confirmed telehealth without meet link */}
                  {isConfirmed && !apt.meet_link && apt.appointment_type === "telehealth" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, marginTop: 4,
                      padding: "10px 16px", borderRadius: 10,
                      backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                    }}>
                      <WifiOff size={16} style={{ color: "#D97706" }} />
                      <span style={{ fontSize: 13, color: "#92400E" }}>
                        No meeting link. {!googleConnected ? "Connect Google Calendar first." : "Approve again to generate link."}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default DoctorAppointmentsTab;
