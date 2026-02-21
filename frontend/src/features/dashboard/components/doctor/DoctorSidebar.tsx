import {
  Search, FileText, Calendar, TrendingUp, Printer, ScrollText
} from "lucide-react";
import type { DoctorTabId } from "./types";

interface DoctorSidebarProps {
  sidebarCollapsed: boolean;
  activeTab: DoctorTabId;
  setActiveTab: (tab: DoctorTabId) => void;
}

const navItems: { icon: typeof TrendingUp; label: string; id: DoctorTabId }[] = [
  { icon: TrendingUp, label: "Analytics", id: "analytics" },
  { icon: Search, label: "Search", id: "search" },
  { icon: Printer, label: "Prescription", id: "prescription" },
  { icon: Calendar, label: "Appointments", id: "appointments" },
  { icon: FileText, label: "EMR Records", id: "records" },
  { icon: ScrollText, label: "Audit Logs", id: "audit-logs" }
];

const DoctorSidebar = ({ sidebarCollapsed, activeTab, setActiveTab }: DoctorSidebarProps) => {
  return (
    <aside 
      style={{
        backgroundColor: 'var(--color-white)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all var(--transition)'
      }}
    >
      <nav style={{
        padding: sidebarCollapsed ? '12px 6px' : '14px 12px',
        display: 'flex', flexDirection: 'column',
        gap: sidebarCollapsed ? '6px' : '4px',
        flex: 1,
        alignItems: sidebarCollapsed ? 'center' : 'stretch'
      }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '10px',
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
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                size={sidebarCollapsed ? 20 : 17}
                strokeWidth={isActive ? 2.3 : 1.8}
              />
              {!sidebarCollapsed && (
                <span style={{ letterSpacing: '-0.1px' }}>{item.label}</span>
              )}
              {!sidebarCollapsed && isActive && (
                <div style={{
                  position: 'absolute',
                  left: '0', top: '50%', transform: 'translateY(-50%)',
                  width: '3px', height: '60%',
                  borderRadius: '0 3px 3px 0',
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
