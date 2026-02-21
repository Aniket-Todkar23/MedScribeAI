import React, { useState } from "react";
import { Heart, FileText, Pill, Calendar, MessageCircle } from "lucide-react";
import type { PatientTab, PatientTabId } from "./components/types";
import PatientSidebar from "./components/PatientSidebar";
import HealthStatusTab from "./components/HealthStatusTab";
import ReportsTab from "./components/ReportsTab";
import MedicationsTab from "./components/MedicationsTab";
import AppointmentsTab from "./components/AppointmentsTab";
import AIChatTab from "./components/AIChatTab";

const tabs: PatientTab[] = [
  { id: "health", label: "Health Status", icon: Heart },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "chat", label: "AI Chat", icon: MessageCircle },
];

const PatientDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PatientTabId>("health");

  return (
    <div className="flex" style={{ minHeight: "100vh", backgroundColor: "var(--color-surface)" }}>
      <PatientSidebar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <main style={{ flex: 1, padding: "var(--space-8) var(--content-padding)", overflowY: "auto" }}>
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