import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SidebarSectionToggleProps {
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  badge?: number | string | null;
  onToggle: () => void;
}

export default function SidebarSectionToggle({
  label,
  icon,
  collapsed,
  badge,
  onToggle,
}: SidebarSectionToggleProps) {
  return (
    <button
      className="section-toggle sidebar-section-toggle"
      onClick={onToggle}
      title={collapsed ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
      aria-expanded={!collapsed}
    >
      <span className="shrink-0 w-[14px] flex items-center justify-center">
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </span>
      <span className="shrink-0 w-[14px] flex items-center justify-center" style={{ color: "var(--section-icon-color)" }}>
        {icon}
      </span>
      <span className="sidebar-section-toggle__label truncate">{label}</span>
      {badge != null && <span className="badge">{badge}</span>}
    </button>
  );
}
