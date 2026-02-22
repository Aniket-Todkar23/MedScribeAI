import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import {
  Activity, LogOut, ChevronsLeft, ChevronsRight,
  Home, Menu, X, Sparkles
} from "lucide-react";
import type { DoctorTabId } from "./types";

interface DoctorHeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  aiPanelCollapsed: boolean;
  setAiPanelCollapsed: (v: boolean) => void;
  activeTab: DoctorTabId;
  setActiveTab: (tab: DoctorTabId) => void;
  patientFound: boolean;
  isMobile?: boolean;
  mobileSidebarOpen?: boolean;
  setMobileSidebarOpen?: (v: boolean) => void;
  mobileAiPanelOpen?: boolean;
  setMobileAiPanelOpen?: (v: boolean) => void;
}

const DoctorHeader = ({
  sidebarCollapsed, setSidebarCollapsed,
  aiPanelCollapsed, setAiPanelCollapsed,
  activeTab, setActiveTab, patientFound,
  isMobile = false,
  mobileSidebarOpen = false, setMobileSidebarOpen,
  mobileAiPanelOpen = false, setMobileAiPanelOpen,
}: DoctorHeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <header 
      style={{
        gridColumn: '1 / -1',
        backgroundColor: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: isMobile ? '0 12px' : '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        zIndex: 50
      }}
    >
      {/* Left Sidebar Toggle */}
      <button
        onClick={() => {
          if (isMobile && setMobileSidebarOpen) {
            setMobileSidebarOpen(!mobileSidebarOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        style={{
          position: isMobile ? 'relative' : 'absolute',
          left: isMobile ? undefined : '12px',
          top: isMobile ? undefined : '50%',
          transform: isMobile ? undefined : 'translateY(-50%)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'white',
          border: '1.5px solid rgba(31,159,163,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000,
          color: '#1F9FA3',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 4px rgba(31,159,163,0.1)',
          padding: '0',
          outline: 'none',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1F9FA3';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = '#1F9FA3';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.color = '#1F9FA3';
          e.currentTarget.style.borderColor = 'rgba(31,159,163,0.2)';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(31,159,163,0.1)';
        }}
      >
        {isMobile ? (
          mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />
        ) : (
          sidebarCollapsed ? <ChevronsRight size={16} strokeWidth={2.5} /> : <ChevronsLeft size={16} strokeWidth={2.5} />
        )}
      </button>

      {/* Breadcrumb Nav */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? '6px' : '10px', 
        marginLeft: isMobile ? '8px' : '52px',
        flex: 1, 
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={isMobile ? 18 : 20} color="#1F9FA3" strokeWidth={2.2} />
          {!isMobile && (
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0B3C3D', letterSpacing: '-0.3px' }}>
              Diagnostic-IQ
            </span>
          )}
        </div>
        {!isMobile && (
          <>
            <span style={{ color: '#CBD5E1', fontSize: '14px', userSelect: 'none' }}>/</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={13} color="#94A3B8" />
              <span 
                onClick={() => setActiveTab('analytics')}
                style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1F9FA3' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8' }}
              >
                Dashboard
              </span>
            </div>
          </>
        )}
        <span style={{ color: '#CBD5E1', fontSize: '14px', userSelect: 'none' }}>/</span>
        <span style={{ 
          fontSize: '13px', color: '#1F9FA3', fontWeight: 600,
          whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
        }}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </span>
      </div>

      {/* Right side actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', marginRight: isMobile ? 0 : '16px' }}>
        {/* Mobile AI Toggle */}
        {isMobile && (
          <button
            onClick={() => setMobileAiPanelOpen && setMobileAiPanelOpen(!mobileAiPanelOpen)}
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: mobileAiPanelOpen ? '#1F9FA3' : 'white',
              border: '1.5px solid rgba(31,159,163,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              color: mobileAiPanelOpen ? 'white' : '#1F9FA3',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(31,159,163,0.1)',
              padding: '0',
              outline: 'none',
              flexShrink: 0
            }}
          >
            {mobileAiPanelOpen ? <X size={16} /> : <Sparkles size={16} />}
          </button>
        )}

        {!isMobile && (
          <button
            onClick={() => setAiPanelCollapsed(!aiPanelCollapsed)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'white',
              border: '1.5px solid rgba(31,159,163,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              color: '#1F9FA3',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(31,159,163,0.1)',
              padding: '0',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1F9FA3';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#1F9FA3';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(31,159,163,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#1F9FA3';
              e.currentTarget.style.borderColor = 'rgba(31,159,163,0.2)';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(31,159,163,0.1)';
            }}
          >
            {aiPanelCollapsed ? <ChevronsLeft size={16} strokeWidth={2.5} /> : <ChevronsRight size={16} strokeWidth={2.5} />}
          </button>
        )}

        {!isMobile && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            marginRight: '36px' // Avoid overlap
          }}>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(31,159,163,0.06)', color: '#1F9FA3',
              border: '1px solid rgba(31,159,163,0.1)'
            }}>
              Dr. Hambire
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '8px',
                border: '1px solid rgba(239,68,68,0.15)', backgroundColor: 'white',
                color: '#EF4444', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}; // End of component replacement

export default DoctorHeader;
