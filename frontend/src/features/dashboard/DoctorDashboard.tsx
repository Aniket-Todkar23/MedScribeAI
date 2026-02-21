import { useState } from "react";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  DoctorHeader,
  DoctorSidebar,
  PrescriptionTab,
  AnalyticsOverview,
  PatientSearchBar,
  PatientRecords,
  LiveTranscription,
  AIAssistantPanel,
  examplePatient,
} from "./components/doctor";
import type { DoctorTabId } from "./components/doctor";

const DoctorDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFound, setPatientFound] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeTab, setActiveTab] = useState<DoctorTabId>("analytics");

  const handleSearch = () => {
    if (searchQuery.trim() === "+1234567890" || searchQuery.trim() === "1234567890") {
      setPatientFound(true);
    } else {
      setPatientFound(false);
      alert("Patient not found. Try searching: +1234567890");
    }
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTranscript(
        "Doctor: Good afternoon, John. How are you feeling today?\n\n" +
        "Patient: Hi Doctor. I've been having some chest discomfort again, especially when I climb stairs.\n\n" +
        "Doctor: I see. Can you describe the discomfort? Is it sharp, dull, or pressure-like?\n\n" +
        "Patient: It's more like a pressure sensation, right in the center of my chest. It goes away when I rest for a few minutes.\n\n" +
        "Doctor: How long does it typically last?\n\n" +
        "Patient: Maybe 2-3 minutes. Sometimes my left arm feels a bit tingly too.\n\n" +
        "Doctor: Have you been taking your medications regularly?\n\n" +
        "Patient: Yes, I have the metformin twice a day and the atorvastatin at night. I also have the nitroglycerin you prescribed last visit.\n\n" +
        "Doctor: Have you needed to use the nitroglycerin?\n\n" +
        "Patient: Twice this week when the chest pressure was really uncomfortable.\n\n" +
        "Doctor: Let me check your blood pressure and heart rate...\n\n" +
        "[Measuring vitals]\n\n" +
        "Doctor: Your BP is 138 over 88, slightly elevated. Heart rate is 82. I'd like to order a stress test to evaluate your heart function under exertion. We should also review your most recent lab results."
      );
    } else {
      setTranscript("");
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${sidebarCollapsed ? "60px" : "260px"} 1fr ${aiPanelCollapsed ? "60px" : "320px"}`,
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        backgroundColor: "var(--color-surface)",
        transition: "grid-template-columns 0.3s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <DoctorHeader
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        aiPanelCollapsed={aiPanelCollapsed}
        setAiPanelCollapsed={setAiPanelCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        patientFound={patientFound}
      />

      {/* Left sidebar */}
      <DoctorSidebar
        sidebarCollapsed={sidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main content area */}
      <main
        style={{
          padding: "28px 32px",
          overflowY: "auto",
          backgroundColor: "var(--color-surface)",
        }}
      >
        {/* Prescription tab */}
        {activeTab === "prescription" && (
          <PrescriptionTab
            setActiveTab={setActiveTab}
            patientFound={patientFound}
            patient={examplePatient}
          />
        )}

        {/* Analytics overview */}
        {!patientFound && activeTab === "analytics" && <AnalyticsOverview />}

        {/* Patient search bar (for analytics and search tabs) */}
        {(activeTab === "analytics" || activeTab === "search") && (
          <PatientSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
          />
        )}

        {/* Patient records + transcription OR empty state */}
        {(activeTab === "analytics" || activeTab === "search") && (
          <>
            {patientFound ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                <PatientRecords
                  patient={examplePatient}
                  onBack={() => {
                    setPatientFound(false);
                    setSearchQuery("");
                    setTranscript("");
                    setIsRecording(false);
                  }}
                />
                <LiveTranscription
                  isRecording={isRecording}
                  transcript={transcript}
                  onToggleRecording={handleRecording}
                />
              </motion.div>
            ) : (
              activeTab !== "analytics" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 20px",
                    marginTop: "20px",
                    borderRadius: "16px",
                    backgroundColor: "white",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <DotLottieReact
                    src="https://lottie.host/33afb46d-3996-42ae-a226-79b6f21c9942/7yftKeWX5f.lottie"
                    loop
                    autoplay
                    style={{ width: 220, height: 220, marginBottom: 10 }}
                  />
                  <h3 style={{ color: "#0B3C3D", fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
                    Search for a patient
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "13px" }}>
                    Enter a phone number above to view patient records
                  </p>
                </motion.div>
              )
            )}
          </>
        )}
      </main>

      {/* AI assistant panel */}
      <AIAssistantPanel
        aiPanelCollapsed={aiPanelCollapsed}
        setAiPanelCollapsed={setAiPanelCollapsed}
      />
    </div>
  );
};

export default DoctorDashboard;
