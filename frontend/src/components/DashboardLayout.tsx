import { useState } from "react";
import type { ReactNode } from "react";
import {
  LeftSidebar,
  MobileTopBar,
  MobileNavDropdown,
  BreadcrumbBar,
  AIChatSidebar,
} from "@/components/dashboard";
import type { NavItem, BreadcrumbItem } from "@/components/dashboard";

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  roleBadge: { label: string; className: string };
  breadcrumbs: BreadcrumbItem[];
}

const DashboardLayout = ({
  children,
  navItems,
  activeTab,
  onTabChange,
  roleBadge,
  breadcrumbs,
}: DashboardLayoutProps) => {
  const [rightOpen, setRightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <LeftSidebar
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        roleBadge={roleBadge}
      />

      <MobileTopBar
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onToggleChat={() => setRightOpen(!rightOpen)}
      />

      {mobileMenuOpen && (
        <MobileNavDropdown
          navItems={navItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <BreadcrumbBar
          breadcrumbs={breadcrumbs}
          rightOpen={rightOpen}
          onToggleChat={() => setRightOpen(!rightOpen)}
        />
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      <AIChatSidebar open={rightOpen} onClose={() => setRightOpen(false)} />

      {rightOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setRightOpen(false)} />
      )}
    </div>
  );
};

export default DashboardLayout;
