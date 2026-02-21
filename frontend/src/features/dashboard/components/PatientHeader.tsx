import { Link } from "react-router-dom";
import {
  Activity, LogOut, ChevronsLeft, ChevronsRight, Home, Menu, X
} from "lucide-react";
import type { PatientTabId } from "./types";

interface PatientHeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  activeTab: PatientTabId;
  setActiveTab: (tab: PatientTabId) => void;
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

const tabLabels: Record<PatientTabId, string> = {
  health: "Health Status",
  reports: "Reports",
  medications: "Medications",
  appointments: "Appointments",
  chat: "AI Health Assistant",
};

const PatientHeader = ({
  sidebarCollapsed, setSidebarCollapsed,
  activeTab, setActiveTab,
  isMobile, sidebarOpen, setSidebarOpen,
}: PatientHeaderProps) => {
  return (
    <header
      style={{
        gridColumn: "1 / -1",
        backgroundColor: "white",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: isMobile ? "0 12px" : "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Sidebar Toggle / Hamburger */}
      <button
        onClick={() => {
          if (isMobile) {
            setSidebarOpen(!sidebarOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        style={{
          position: isMobile ? "relative" : "absolute",
          left: isMobile ? undefined : "12px",
          top: isMobile ? undefined : "50%",
          transform: isMobile ? undefined : "translateY(-50%)",
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: "white",
          border: "1.5px solid rgba(31,159,163,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          color: "#1F9FA3",
          transition: "all 0.2s ease",
          boxShadow: "0 1px 4px rgba(31,159,163,0.1)",
          padding: "0",
          outline: "none",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#1F9FA3";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#1F9FA3";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(31,159,163,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "white";
          e.currentTarget.style.color = "#1F9FA3";
          e.currentTarget.style.borderColor = "rgba(31,159,163,0.2)";
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(31,159,163,0.1)";
        }}
      >
        {isMobile ? (
          sidebarOpen ? <X size={16} strokeWidth={2.5} /> : <Menu size={16} strokeWidth={2.5} />
        ) : sidebarCollapsed ? (
          <ChevronsRight size={16} strokeWidth={2.5} />
        ) : (
          <ChevronsLeft size={16} strokeWidth={2.5} />
        )}
      </button>

      {/* Breadcrumb Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "6px" : "10px",
          marginLeft: isMobile ? "8px" : "52px",
          overflow: "hidden",
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Logo — always show on mobile, hide text */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Activity size={isMobile ? 18 : 20} color="#1F9FA3" strokeWidth={2.2} />
          {!isMobile && (
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0B3C3D",
                letterSpacing: "-0.3px",
              }}
            >
              Diagnostic-IQ
            </span>
          )}
        </div>
        <span style={{ color: "#CBD5E1", fontSize: "14px", userSelect: "none" }}>/</span>
        {!isMobile && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Home size={13} color="#94A3B8" />
              <span
                onClick={() => setActiveTab("health")}
                style={{
                  fontSize: "13px",
                  color: "#94A3B8",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1F9FA3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94A3B8";
                }}
              >
                Dashboard
              </span>
            </div>
            <span style={{ color: "#CBD5E1", fontSize: "14px", userSelect: "none" }}>/</span>
          </>
        )}
        <span
          style={{
            fontSize: "13px",
            color: "#1F9FA3",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tabLabels[activeTab]}
        </span>
      </div>

      {/* Right side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px", flexShrink: 0 }}>
        {!isMobile && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(31,159,163,0.06)",
              color: "#1F9FA3",
              border: "1px solid rgba(31,159,163,0.1)",
            }}
          >
            Patient
          </span>
        )}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: isMobile ? "6px 8px" : "6px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.15)",
            backgroundColor: "white",
            color: "#EF4444",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
          }}
        >
          <LogOut size={14} />
          {!isMobile && " Logout"}
        </Link>
      </div>
    </header>
  );
};

export default PatientHeader;
