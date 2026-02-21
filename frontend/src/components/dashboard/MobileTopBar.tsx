import { Activity, Menu, MessageCircle, X } from "lucide-react";

interface MobileTopBarProps {
  mobileMenuOpen: boolean;
  onToggleMenu: () => void;
  onToggleChat: () => void;
}

const MobileTopBar = ({ mobileMenuOpen, onToggleMenu, onToggleChat }: MobileTopBarProps) => {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <button onClick={onToggleMenu}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-bold text-foreground">Diagnostic-IQ</span>
      </div>
      <button onClick={onToggleChat} className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
};

export default MobileTopBar;
