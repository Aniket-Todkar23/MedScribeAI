import { Link } from "react-router-dom";
import { ChevronRight, Home, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { BreadcrumbItem } from "./types";

interface BreadcrumbBarProps {
  breadcrumbs: BreadcrumbItem[];
  rightOpen: boolean;
  onToggleChat: () => void;
}

const BreadcrumbBar = ({ breadcrumbs, rightOpen, onToggleChat }: BreadcrumbBarProps) => {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            {crumb.href ? (
              <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <button
        onClick={onToggleChat}
        className="hidden lg:flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        AI Assistant
      </button>
    </div>
  );
};

export default BreadcrumbBar;
