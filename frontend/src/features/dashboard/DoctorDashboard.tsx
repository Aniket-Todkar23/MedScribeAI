import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ChevronLeft, Plus, Loader2 } from "lucide-react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
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
import {
  createConsultation,
  finaliseConsultation,
  type DoctorSummary,
  type PatientSummary,
  type ConsultationEntities,
  type IcdCode,
  type SoapNote,
} from "../../services/consultationService";

const DoctorDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);

  // Mobile states
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileAiPanelOpen, setMobileAiPanelOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [patientFound, setPatientFound] = useState(false);
  const [activeTab, setActiveTab] = useState<DoctorTabId>("analytics");
  const [currentPatient, setCurrentPatient] = useState<Patient | ExamplePatient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Consultation state ──
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [isCreatingConsultation, setIsCreatingConsultation] = useState(false);
  const [isFinalising, setIsFinalising] = useState(false);
  const [isConsultationComplete, setIsConsultationComplete] = useState(false);

  // Results from finalise
  const [doctorSummary, setDoctorSummary] = useState<DoctorSummary | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [entities, setEntities] = useState<ConsultationEntities | null>(null);
  const [icdCodes, setIcdCodes] = useState<IcdCode[] | null>(null);
  const [soapNote, setSoapNote] = useState<SoapNote | null>(null);

  // Audio recorder hook
  const audioRecorder = useAudioRecorder({
    batchIntervalMs: 30000,
    onError: (err) => {
      console.error('Recording error:', err);
      alert('Recording error: ' + err.message);
    },
  });

  // Get doctor ID from localStorage
  const getDoctorId = (): string => {
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      return authUser.user_id || '';
    } catch { return ''; }
  };

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

  // ── Create new consultation ──
  const handleNewConsultation = useCallback(async () => {
    if (!currentPatient) return;
    const doctorId = getDoctorId();
    if (!doctorId) {
      alert('Doctor ID not found. Please log in again.');
      return;
    }
    setIsCreatingConsultation(true);
    // Reset previous results
    resetConsultationState();

    try {
      const resp = await createConsultation(doctorId, currentPatient.patient_id);
      setConsultationId(resp.consultation_id);
    } catch (err: any) {
      console.error('Create consultation error:', err);
      alert('Failed to create consultation: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsCreatingConsultation(false);
    }
  }, [currentPatient]);

  // ── Toggle recording ──
  const handleRecording = useCallback(async () => {
    if (!consultationId) {
      alert('Please create a consultation first.');
      return;
    }
    if (audioRecorder.isRecording) {
      await audioRecorder.stopRecording();
    } else {
      await audioRecorder.startRecording(consultationId);
    }
  }, [consultationId, audioRecorder]);

  // ── Finalise consultation ──
  const handleFinalise = useCallback(async () => {
    if (!consultationId) return;
    setIsFinalising(true);
    try {
      const resp = await finaliseConsultation(consultationId);
      setDoctorSummary(resp.doctor_summary);
      setPatientSummary(resp.patient_summary);
      setEntities(resp.entities);
      setIcdCodes(resp.icd_codes);
      setSoapNote(resp.soap_note);
      setIsConsultationComplete(true);
      // Expand AI panel to show results
      setAiPanelCollapsed(false);
      if (isMobile) setMobileAiPanelOpen(true);
    } catch (err: any) {
      console.error('Finalise error:', err);
      alert('Failed to generate report: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsFinalising(false);
    }
  }, [consultationId, isMobile]);

  // Reset consultation state
  const resetConsultationState = () => {
    setConsultationId(null);
    setIsConsultationComplete(false);
    setDoctorSummary(null);
    setPatientSummary(null);
    setEntities(null);
    setIcdCodes(null);
    setSoapNote(null);
    setIsFinalising(false);
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
                    setCurrentPatient(null);
                    clearPatientData();
                    resetConsultationState();
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* New Consultation button */}
                  {!consultationId && !isConsultationComplete && (
                    <button
                      onClick={handleNewConsultation}
                      disabled={isCreatingConsultation}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '12px 20px', borderRadius: '12px', border: 'none',
                        background: isCreatingConsultation
                          ? 'rgba(31,159,163,0.3)'
                          : 'linear-gradient(135deg, #1F9FA3, #17858A)',
                        color: 'white', fontSize: '14px', fontWeight: 600,
                        cursor: isCreatingConsultation ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(31,159,163,0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCreatingConsultation ? (
                        <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</>
                      ) : (
                        <><Plus size={16} /> New Consultation</>
                      )}
                    </button>
                  )}
                  {/* Consultation created indicator */}
                  {consultationId && !isConsultationComplete && (
                    <div style={{
                      padding: '8px 14px', borderRadius: '10px',
                      backgroundColor: 'rgba(31,159,163,0.06)',
                      border: '1px solid rgba(31,159,163,0.15)',
                      fontSize: '11px', color: '#1F9FA3', fontWeight: 500,
                      textAlign: 'center'
                    }}>
                      Consultation #{consultationId.slice(0, 8)} · Ready
                    </div>
                  )}
                  <LiveTranscription
                    isRecording={audioRecorder.isRecording}
                    transcript={audioRecorder.transcript}
                    onToggleRecording={handleRecording}
                    onFinalise={handleFinalise}
                    isSending={audioRecorder.isSending}
                    batchIndex={audioRecorder.batchIndex}
                    isFinalising={isFinalising}
                    isComplete={isConsultationComplete}
                    hasConsultation={!!consultationId}
                  />
                </div>
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
        consultationId={consultationId}
        doctorSummary={doctorSummary}
        patientSummary={patientSummary}
        entities={entities}
        icdCodes={icdCodes}
        soapNote={soapNote}
        isComplete={isConsultationComplete}
      />
    </div>
  );
};

export default DoctorDashboard;
