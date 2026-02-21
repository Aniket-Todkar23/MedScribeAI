import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, LogOut } from "lucide-react";
import type { NavItem } from "./types";

interface LeftSidebarProps {
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  roleBadge: { label: string; className: string };
}

const LeftSidebar = ({ navItems, activeTab, onTabChange, roleBadge }: LeftSidebarProps) => {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold text-foreground">Diagnostic-IQ</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.className}`}>
          {roleBadge.label}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary-100 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 text-muted-foreground">
          <Link to="/"><LogOut className="h-4 w-4" /> Logout</Link>
        </Button>
      </div>
    </aside>
  );
};

export default LeftSidebar;
