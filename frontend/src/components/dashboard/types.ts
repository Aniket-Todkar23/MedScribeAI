export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
