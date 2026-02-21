import {
  Search, FileText, Calendar, TrendingUp, Printer, ScrollText
} from "lucide-react";

export type DoctorTabId =
  | "analytics"
  | "search"
  | "prescription"
  | "appointments"
  | "records"
  | "audit-logs";

interface DoctorSidebarProps {
  sidebarCollapsed: boolean;
  activeTab: DoctorTabId;
  setActiveTab: (tab: DoctorTabId) => void;
  isMobile?: boolean;
  isOpen?: boolean;
}

const navItems = [
  { icon: TrendingUp, label: "Analytics", id: "analytics" as DoctorTabId },
  { icon: Search, label: "Search", id: "search" as DoctorTabId },
  { icon: Printer, label: "Prescription", id: "prescription" as DoctorTabId },
  { icon: Calendar, label: "Appointments", id: "appointments" as DoctorTabId },
  { icon: FileText, label: "EMR Records", id: "records" as DoctorTabId },
  { icon: ScrollText, label: "Audit Logs", id: "audit-logs" as DoctorTabId }
];

const DoctorSidebar = ({ 
  sidebarCollapsed, 
  activeTab, 
  setActiveTab,
  isMobile = false,
  isOpen = false
}: DoctorSidebarProps) => {

  const sidebarWidth = sidebarCollapsed ? '64px' : '240px';
  const mobileStyles = isMobile ? {
    position: 'fixed' as const,
    left: isOpen ? 0 : '-100%',
    top: '56px', // Below header
    bottom: 0,
    width: '260px',
    zIndex: 50,
    boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } : {};

  return (
    <aside 
      style={{
        backgroundColor: 'white',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '260px' : sidebarWidth,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...mobileStyles
      }}
    >
      <nav style={{
        padding: sidebarCollapsed ? '12px 6px' : '14px 12px',
        display: 'flex', 
        flexDirection: 'column',
        gap: sidebarCollapsed ? '6px' : '4px',
        flex: 1
      }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: sidebarCollapsed ? '0' : '10px 12px',
                width: sidebarCollapsed ? '42px' : '100%',
                height: sidebarCollapsed ? '42px' : 'auto',
                borderRadius: sidebarCollapsed ? '12px' : '10px',
                border: 'none',
                backgroundColor: isActive
                  ? (sidebarCollapsed ? '#1F9FA3' : 'rgba(31,159,163,0.08)')
                  : 'transparent',
                color: isActive
                  ? (sidebarCollapsed ? 'white' : '#1F9FA3')
                  : '#64748B',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                position: 'relative',
                boxShadow: isActive && sidebarCollapsed
                  ? '0 2px 8px rgba(31,159,163,0.3)'
                  : 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = sidebarCollapsed
                    ? 'rgba(31,159,163,0.08)'
                    : 'rgba(31,159,163,0.04)';
                  e.currentTarget.style.color = '#1F9FA3';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              <item.icon
                size={sidebarCollapsed ? 20 : 18}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              {!sidebarCollapsed && (
                <span style={{ letterSpacing: '-0.1px' }}>{item.label}</span>
              )}
              {!sidebarCollapsed && isActive && (
                <div style={{
                  position: 'absolute',
                  right: '0', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  width: '3px', 
                  height: '60%',
                  borderRadius: '3px 0 0 3px',
                  backgroundColor: '#1F9FA3'
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default DoctorSidebar;
