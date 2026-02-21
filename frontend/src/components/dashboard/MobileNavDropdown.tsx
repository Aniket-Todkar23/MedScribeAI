import type { NavItem } from "./types";

interface MobileNavDropdownProps {
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose: () => void;
}

const MobileNavDropdown = ({ navItems, activeTab, onTabChange, onClose }: MobileNavDropdownProps) => {
  return (
    <div className="fixed inset-x-0 top-[52px] z-20 border-b border-border bg-card p-3 lg:hidden">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => { onTabChange(id); onClose(); }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
            activeTab === id ? "bg-primary-100 text-primary" : "text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
};

export default MobileNavDropdown;
