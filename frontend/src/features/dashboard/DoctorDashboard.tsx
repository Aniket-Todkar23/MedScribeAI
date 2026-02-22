import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ChevronLeft } from "lucide-react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import {
  DoctorHeader,
  DoctorSidebar,
  PrescriptionTab,
  AnalyticsOverview,
  PatientSearchBar,
  PatientRecords,
  LiveTranscription,
  AIAssistantPanel,
  ReportsTab,
  DoctorAppointmentsTab,
  examplePatient,
} from "./components/doctor";
import type { DoctorTabId, ExamplePatient } from "./components/doctor";
import { searchPatientByPhone, storePatientData, getStoredPatientData, clearPatientData, type Patient } from "../../services/patientService";

const DoctorDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  
  // Mobile states
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileAiPanelOpen, setMobileAiPanelOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [patientFound, setPatientFound] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeTab, setActiveTab] = useState<DoctorTabId>("analytics");
  const [currentPatient, setCurrentPatient] = useState<Patient | ExamplePatient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Load patient from localStorage on mount
  useEffect(() => {
    const storedPatient = getStoredPatientData();
    if (storedPatient) {
      setCurrentPatient(storedPatient);
      if (isMobile) setMobileSidebarOpen(false);
      setPatientFound(true);
      setSearchQuery(storedPatient.phone);
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a phone number');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      const result = await searchPatientByPhone(searchQuery.trim());
      
      if (result.success && result.patient) {
        setCurrentPatient(result.patient);
        setPatientFound(true);
        storePatientData(result.patient);
        setSearchError(null);
      } else {
        setPatientFound(false);
        setCurrentPatient(null);
        setSearchError(result.message || 'Patient not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setPatientFound(false);
      setCurrentPatient(null);
      setSearchError('Failed to search patient. Please try again.');
    } finally {
      setIsSearching(false);
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
        gridTemplateColumns: isMobile
          ? "1fr"
          : `${sidebarCollapsed ? "60px" : "260px"} 1fr ${aiPanelCollapsed ? "60px" : "320px"}`,
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        backgroundColor: "#F8FAFB",
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
        isMobile={isMobile}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        mobileAiPanelOpen={mobileAiPanelOpen}
        setMobileAiPanelOpen={setMobileAiPanelOpen}
      />

      {/* Left sidebar - Mobile Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)'
          }}
        />
      )}
      <DoctorSidebar
        sidebarCollapsed={isMobile ? false : sidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
      />

      {/* Main content area */}
      <main
        style={{
          padding: isMobile ? "16px 12px" : "28px 32px",
          overflowY: "auto",
          backgroundColor: "var(--color-surface)",
          position: "relative",
          zIndex: 1
        }}
      >
        {/* Appointments tab */}
        {activeTab === "appointments" && <DoctorAppointmentsTab />}

        {/* Prescription tab */}
        {activeTab === "prescription" && (
          <PrescriptionTab
            setActiveTab={setActiveTab}
            patientFound={patientFound}
            patient={{
              ...examplePatient,
              ...(currentPatient && {
                patient_id: currentPatient.patient_id,
                full_name: currentPatient.full_name,
                email: currentPatient.email,
                phone: currentPatient.phone,
                date_of_birth: currentPatient.date_of_birth,
                gender: currentPatient.gender,
                blood_group: currentPatient.blood_group,
                address: currentPatient.address,
                emergency_contact: currentPatient.emergency_contact,
              })
            }}
          />
        )}

        {/* Reports tab */}
        {activeTab === "reports" && patientFound && currentPatient && (
          <ReportsTab
            patientId={currentPatient.patient_id}
            patientName={currentPatient.full_name}
          />
        )}

        {/* Analytics overview */}
        {!patientFound && activeTab === "analytics" && <AnalyticsOverview />}

        {/* Patient search bar (for analytics, search, and reports tabs) */}
        {(activeTab === "analytics" || activeTab === "search" || activeTab === "reports") && (
          <PatientSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            isSearching={isSearching}
            searchError={searchError}
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
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                <PatientRecords
                  patient={{
                    ...examplePatient,
                    ...(currentPatient && {
                      patient_id: currentPatient.patient_id,
                      full_name: currentPatient.full_name,
                      email: currentPatient.email,
                      phone: currentPatient.phone,
                      date_of_birth: currentPatient.date_of_birth,
                      gender: currentPatient.gender,
                      blood_group: currentPatient.blood_group,
                      address: currentPatient.address,
                      emergency_contact: currentPatient.emergency_contact,
                    })
                  }}
                  onBack={() => {
                    setPatientFound(false);
                    setSearchQuery("");
                    setTranscript("");
                    setIsRecording(false);
                    setCurrentPatient(null);
                    clearPatientData();
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
                  <h3 style={{ color: "#0B3C3D", fontSize: "18px", fontWeight: 700, marginBottom: "6px", textAlign: "center" }}>
                    Search for a patient
                  </h3>
                  <p style={{ color: "#64748B", fontSize: "13px", textAlign: "center", marginBottom: "20px" }}>
                    Enter a phone number above to view patient records
                  </p>
                  
                  <button
                    onClick={() => setActiveTab("analytics")}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px", borderRadius: "10px",
                      border: "1px solid rgba(31,159,163,0.15)",
                      backgroundColor: "rgba(31,159,163,0.06)",
                      color: "#1F9FA3", fontSize: "13px", fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(31,159,163,0.06)";
                    }}
                  >
                    <ChevronLeft size={16} /> Back to Dashboard
                  </button>
                </motion.div>
              )
            )}
          </>
        )}

        {/* Empty state for reports tab when no patient selected */}
        {activeTab === "reports" && !patientFound && (
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
              Search for a patient to upload reports
            </h3>
            <p style={{ color: "#64748B", fontSize: "13px" }}>
              Enter a phone number above to access patient reports
            </p>
          </motion.div>
        )}
      </main>

      {/* AI assistant panel - Mobile Overlay */}
      {isMobile && mobileAiPanelOpen && (
        <div 
          onClick={() => setMobileAiPanelOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)'
          }}
        />
      )}
      <AIAssistantPanel
        aiPanelCollapsed={isMobile ? false : aiPanelCollapsed}
        setAiPanelCollapsed={setAiPanelCollapsed}
        isMobile={isMobile}
        isOpen={mobileAiPanelOpen}
      />
    </div>
  );
};

export default DoctorDashboard;
