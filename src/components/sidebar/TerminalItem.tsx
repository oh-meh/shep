import { useState, useCallback } from "react";
import type { TerminalTabData, TabActivity } from "../../lib/types";
import { X } from "lucide-react";
import tabKindMeta from "../../lib/tabKindMeta";
import { useTerminalStore } from "../../stores/useTerminalStore";
import { handleActionKey } from "../../lib/a11y";
import ContextMenu from "../shared/ContextMenu";
import type { ContextMenuItem } from "../shared/ContextMenu";
import ActivityIndicator, { getTabActivityStatus } from "./ActivityIndicator";

interface TerminalItemProps {
  tab: TerminalTabData;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default function TerminalItem({
  tab,
  isActive,
  onClick,
  onClose,
}: TerminalItemProps) {
  const activity: TabActivity | undefined = useTerminalStore((s) => s.tabActivity[tab.ptyId]);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const menuItems: ContextMenuItem[] = [
    {
      label: "Close",
      icon: <X size={14} />,
      danger: true,
      onClick: onClose,
    },
  ];

  return (
    <>
      <div
        className={`list-item ${isActive ? "active" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(event) => handleActionKey(event, onClick)}
        role="button"
        tabIndex={0}
        aria-pressed={isActive}
        aria-label={`Open terminal tab ${tab.label}`}
      >
        <span className="shrink-0">{tabKindMeta.terminal.icon(14)}</span>
        <span className="min-w-0 truncate text-left">{tab.label}</span>
        <ActivityIndicator status={getTabActivityStatus(activity)} activity={activity} />
      </div>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
