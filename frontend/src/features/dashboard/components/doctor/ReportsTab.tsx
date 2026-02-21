import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Image, Loader, CheckCircle, AlertCircle, Clock, User, Calendar } from "lucide-react";
import type { PatientReport, PatientHistory } from "./types";

interface ReportsTabProps {
  patientId: string;
  patientName: string;
}

const ReportsTab = ({ patientId, patientName }: ReportsTabProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState("General");
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('report', selectedFile);
      formData.append('patientId', patientId);
      formData.append('reportType', reportType);
      
      // Get doctor ID from local storage or auth context
      const doctorId = localStorage.getItem('userId') || 'DOC001'; // Fallback for demo
      formData.append('doctorId', doctorId);

      const response = await fetch('http://localhost:3000/api/reports/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Refresh patient history
        await fetchPatientHistory();
        
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      } else {
        setUploadError(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload report. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchPatientHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`http://localhost:3000/api/reports/history/${patientId}`);
      const data = await response.json();

      if (data.success) {
        setPatientHistory(data.history);
        setReports(data.history.reports);
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0B3C3D", marginBottom: "8px" }}>
            Patient Reports
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B" }}>
            Upload and manage medical reports for {patientName}
          </p>
        </div>

        {/* Upload Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "30px",
            marginBottom: "30px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0B3C3D", marginBottom: "20px" }}>
            Upload New Report
          </h3>

          {/* Report Type Selector */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#334155", marginBottom: "8px" }}>
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                fontSize: "14px",
                color: "#334155",
                backgroundColor: "white",
              }}
            >
              <option value="General">General</option>
              <option value="Lab Results">Lab Results</option>
              <option value="X-Ray">X-Ray</option>
              <option value="MRI">MRI</option>
              <option value="CT Scan">CT Scan</option>
              <option value="Blood Test">Blood Test</option>
              <option value="ECG">ECG</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? "2px dashed #1F9FA3" : "2px dashed #E2E8F0",
              borderRadius: "12px",
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragging ? "#F0F9FA" : "#FAFAFA",
              transition: "all 0.2s ease",
              marginBottom: "20px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            
            {selectedFile ? (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                  {selectedFile.type === 'application/pdf' ? (
                    <FileText size={48} color="#1F9FA3" />
                  ) : (
                    <Image size={48} color="#1F9FA3" />
                  )}
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#0B3C3D", marginBottom: "4px" }}>
                  {selectedFile.name}
                </p>
                <p style={{ fontSize: "14px", color: "#64748B" }}>
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div>
                <Upload size={48} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Drag & drop or click to upload
                </p>
                <p style={{ fontSize: "14px", color: "#64748B" }}>
                  Supports PDF, JPEG, PNG (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              width: "100%",
              padding: "12px 24px",
              backgroundColor: !selectedFile || isUploading ? "#94A3B8" : "#1F9FA3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background-color 0.2s",
            }}
          >
            {isUploading ? (
              <>
                <Loader size={20} className="spin" />
                Uploading & Analyzing...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload Report
              </>
            )}
          </button>

          {/* Status Messages */}
          {uploadSuccess && (
            <div style={{
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: "#D1FAE5",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <CheckCircle size={20} color="#059669" />
              <span style={{ fontSize: "14px", color: "#059669", fontWeight: 500 }}>
                Report uploaded and analyzed successfully!
              </span>
            </div>
          )}

          {uploadError && (
            <div style={{
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: "#FEE2E2",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <AlertCircle size={20} color="#DC2626" />
              <span style={{ fontSize: "14px", color: "#DC2626", fontWeight: 500 }}>
                {uploadError}
              </span>
            </div>
          )}
        </div>

        {/* Patient History Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "30px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0B3C3D" }}>
              Patient History & Reports
            </h3>
            <button
              onClick={fetchPatientHistory}
              disabled={isLoadingHistory}
              style={{
                padding: "8px 16px",
                backgroundColor: "#1F9FA3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: isLoadingHistory ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isLoadingHistory ? <Loader size={16} className="spin" /> : "Load History"}
            </button>
          </div>

          {patientHistory && (
            <div>
              {/* Summary Stats */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}>
                <div style={{
                  padding: "16px",
                  backgroundColor: "#F0F9FA",
                  borderRadius: "8px",
                  borderLeft: "4px solid #1F9FA3",
                }}>
                  <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Total Reports</p>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#0B3C3D" }}>
                    {patientHistory.reportSummary.totalReports}
                  </p>
                </div>
                <div style={{
                  padding: "16px",
                  backgroundColor: "#FEF3C7",
                  borderRadius: "8px",
                  borderLeft: "4px solid #F59E0B",
                }}>
                  <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>Key Findings</p>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#0B3C3D" }}>
                    {patientHistory.reportSummary.allKeyFindings.length}
                  </p>
                </div>
              </div>

              {/* Reports List */}
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: 600, color: "#0B3C3D", marginBottom: "16px" }}>
                  All Reports ({reports.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {reports.length === 0 ? (
                    <p style={{ fontSize: "14px", color: "#64748B", textAlign: "center", padding: "20px" }}>
                      No reports uploaded yet
                    </p>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.report_id}
                        style={{
                          padding: "16px",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          backgroundColor: "#FAFAFA",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {report.file_extension === '.pdf' ? (
                              <FileText size={32} color="#1F9FA3" />
                            ) : (
                              <Image size={32} color="#1F9FA3" />
                            )}
                            <div>
                              <h5 style={{ fontSize: "15px", fontWeight: 600, color: "#0B3C3D", marginBottom: "4px" }}>
                                {report.report_name}
                              </h5>
                              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748B" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Calendar size={12} />
                                  {formatDate(report.uploaded_at)}
                                </span>
                                {report.doctor_name && (
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <User size={12} />
                                    {report.doctor_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            padding: "4px 12px",
                            backgroundColor: "#E0F2F1",
                            color: "#00695C",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 500,
                            height: "fit-content",
                          }}>
                            {report.report_type}
                          </span>
                        </div>
                        
                        {report.ai_summary && (
                          <div style={{
                            padding: "12px",
                            backgroundColor: "white",
                            borderRadius: "6px",
                            marginBottom: "8px",
                          }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0B3C3D", marginBottom: "6px" }}>
                              AI Summary
                            </p>
                            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                              {report.ai_summary}
                            </p>
                          </div>
                        )}

                        {report.key_findings && report.key_findings.length > 0 && (
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0B3C3D", marginBottom: "6px" }}>
                              Key Findings
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {report.key_findings.map((finding, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    padding: "4px 10px",
                                    backgroundColor: "#F1F5F9",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    color: "#334155",
                                  }}
                                >
                                  {finding}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: "12px" }}>
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "13px",
                              color: "#1F9FA3",
                              fontWeight: 500,
                              textDecoration: "none",
                            }}
                          >
                            View Report →
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default ReportsTab;
