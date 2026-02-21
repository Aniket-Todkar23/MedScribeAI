import { useState } from "react";
import type { PatientTabId } from "./components/types";
import PatientHeader from "./components/PatientHeader";
import PatientSidebar from "./components/PatientSidebar";
import HealthStatusTab from "./components/HealthStatusTab";
import ReportsTab from "./components/ReportsTab";
import MedicationsTab from "./components/MedicationsTab";
import AppointmentsTab from "./components/AppointmentsTab";
import AIChatTab from "./components/AIChatTab";
import { useIsMobile } from "../../hooks/useMediaQuery";

const PatientDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
  const [activeTab, setActiveTab] = useState<PatientTabId>("health");
  const isMobile = useIsMobile();

  const handleSetActiveTab = (tab: PatientTabId) => {
    setActiveTab(tab);
    if (isMobile) setSidebarOpen(false); // auto-close sidebar on mobile
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : `${sidebarCollapsed ? "60px" : "260px"} 1fr`,
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        backgroundColor: "var(--color-surface)",
        transition: "grid-template-columns 0.3s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <PatientHeader
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Left sidebar — overlay on mobile */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            zIndex: 40,
            backdropFilter: "blur(2px)",
            transition: "opacity 0.25s ease",
          }}
        />
      )}
      <PatientSidebar
        sidebarCollapsed={isMobile ? false : sidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
      />

      {/* Main content area */}
      <main
        style={{
          padding: activeTab === "chat" ? 0 : isMobile ? "16px 12px" : "28px 32px",
          overflowY: activeTab === "chat" ? "hidden" : "auto",
          backgroundColor: "var(--color-surface)",
          display: activeTab === "chat" ? "flex" : "block",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {activeTab === "health" && <HealthStatusTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "medications" && <MedicationsTab />}
        {activeTab === "appointments" && <AppointmentsTab />}
        {activeTab === "chat" && <AIChatTab />}
      </main>
    </div>
  );
};

export default PatientDashboard;