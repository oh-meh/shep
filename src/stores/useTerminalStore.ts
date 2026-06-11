import { create } from "zustand";
import type { TerminalTabData, TabActivity, UnifiedTab, PanelTabKind, PanelTabData } from "../lib/types";
import { panelTabId, panelTabDefaults } from "../lib/types";
import { useUIStore } from "./useUIStore";

interface ProjectTerminalState {
  tabs: UnifiedTab[];
  activeTabId: string | null;
}

interface TerminalStore {
  projectState: Record<string, ProjectTerminalState>;
  activeProjectPath: string | null;
  tabActivity: Record<number, TabActivity>;
  switchProject: (repoPath: string) => void;
  removeProject: (repoPath: string) => void;
  addTab: (tab: UnifiedTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Pick<UnifiedTab, "label">>) => void;
  reorderTab: (tabId: string, toIndex: number) => void;
  addPanelTab: (kind: PanelTabKind) => void;
  removePanelTab: (kind: PanelTabKind) => void;
  togglePanelTab: (kind: PanelTabKind) => void;
  findTabByCommand: (commandName: string) => TerminalTabData | undefined;
  findTabByPtyId: (ptyId: number) => TerminalTabData | undefined;
  initActivity: (ptyId: number) => void;
  setTabActive: (ptyId: number, active: boolean) => void;
  setTabExited: (ptyId: number, exitCode: number) => void;
  setTabBell: (ptyId: number, message?: string) => void;
  clearTabBell: (ptyId: number) => void;
  removeActivity: (ptyId: number) => void;
  getAllProjectTabs: (repoPath: string) => UnifiedTab[];
}

function emptyState(): ProjectTerminalState {
  return { tabs: [], activeTabId: null };
}

let tabCounter = 0;
export function nextTabId(): string {
  return `tab-${++tabCounter}`;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  projectState: {},
  activeProjectPath: null,
  tabActivity: {},

  switchProject: (repoPath: string) => {
    set((state) => {
      if (state.projectState[repoPath]) {
        return { activeProjectPath: repoPath };
      }
      return {
        projectState: { ...state.projectState, [repoPath]: emptyState() },
        activeProjectPath: repoPath,
      };
    });
  },

  removeProject: (repoPath: string) => {
    set((state) => {
      const projectState = { ...state.projectState };
      const project = projectState[repoPath];
      delete projectState[repoPath];

      const tabActivity = { ...state.tabActivity };
      if (project) {
        for (const tab of project.tabs) {
          if (tab.kind === "terminal" || tab.kind === "assistant") {
            delete tabActivity[tab.ptyId];
          }
        }
      }

      return {
        projectState,
        tabActivity,
        ...(state.activeProjectPath === repoPath
          ? { activeProjectPath: null }
          : {}),
      };
    });
  },

  addTab: (tab: UnifiedTab) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState();
      return {
        projectState: {
          ...state.projectState,
          [path]: {
            tabs: [...ps.tabs, tab],
            activeTabId: tab.id,
          },
        },
      };
    });
  },

  removeTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps) return state;
      const closedIndex = ps.tabs.findIndex((t) => t.id === id);
      if (closedIndex === -1) return state;
      const tabs = ps.tabs.filter((t) => t.id !== id);
      let activeTabId = ps.activeTabId;
      if (ps.activeTabId === id) {
        if (tabs.length === 0) {
          activeTabId = null;
        } else {
          activeTabId = tabs[Math.min(closedIndex, tabs.length - 1)].id;
        }
      }
      return {
        projectState: {
          ...state.projectState,
          [path]: { tabs, activeTabId },
        },
      };
    });
  },

  setActiveTab: (id: string) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps || !ps.tabs.some((t) => t.id === id)) return state;
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...ps, activeTabId: id },
        },
      };
    });
  },

  updateTab: (id: string, patch: Partial<Pick<UnifiedTab, "label">>) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps) return state;
      return {
        projectState: {
          ...state.projectState,
          [path]: {
            ...ps,
            tabs: ps.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          },
        },
      };
    });
  },

  reorderTab: (tabId: string, toIndex: number) => {
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path];
      if (!ps) return state;
      const fromIndex = ps.tabs.findIndex((t) => t.id === tabId);
      if (fromIndex === -1) return state;

      const boundedIndex = Math.max(0, Math.min(toIndex, ps.tabs.length));
      const targetIndex = boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
      if (fromIndex === targetIndex) return state;

      const tabs = [...ps.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(targetIndex, 0, moved);
      return {
        projectState: {
          ...state.projectState,
          [path]: { ...ps, tabs },
        },
      };
    });
  },

  addPanelTab: (kind: PanelTabKind) => {
    useUIStore.getState().deactivateAllOverlays();
    set((state) => {
      const path = state.activeProjectPath;
      if (!path) return state;
      const ps = state.projectState[path] ?? emptyState();
      const id = panelTabId(kind);
      const existing = ps.tabs.find((t) => t.id === id);
      if (existing) {
        return {
          projectState: {
            ...state.projectState,
            [path]: { ...ps, activeTabId: id },
          },
        };
      }
      const tab: PanelTabData = { id, kind, label: panelTabDefaults[kind].label };
      return {
        projectState: {
          ...state.projectState,
          [path]: { tabs: [...ps.tabs, tab], activeTabId: id },
        },
      };
    });
  },

  removePanelTab: (kind: PanelTabKind) => {
    get().removeTab(panelTabId(kind));
  },

  togglePanelTab: (kind: PanelTabKind) => {
    const state = get();
    const path = state.activeProjectPath;
    if (!path) return;
    const ps = state.projectState[path];
    const id = panelTabId(kind);
    const existing = ps?.tabs.find((t) => t.id === id);
    if (existing && ps?.activeTabId === id) {
      get().removeTab(id);
    } else if (existing) {
      useUIStore.getState().deactivateAllOverlays();
      set((s) => {
        const p = s.projectState[path];
        if (!p) return s;
        return {
          projectState: { ...s.projectState, [path]: { ...p, activeTabId: id } },
        };
      });
    } else {
      get().addPanelTab(kind);
    }
  },

  findTabByCommand: (commandName: string) => {
    const state = get();
    if (!state.activeProjectPath) return undefined;
    const ps = state.projectState[state.activeProjectPath];
    return ps?.tabs.find(
      (t): t is TerminalTabData => (t.kind === "terminal" || t.kind === "assistant") && t.commandName === commandName,
    );
  },

  findTabByPtyId: (ptyId: number) => {
    const state = get();
    if (!state.activeProjectPath) return undefined;
    const ps = state.projectState[state.activeProjectPath];
    return ps?.tabs.find(
      (t): t is TerminalTabData => (t.kind === "terminal" || t.kind === "assistant") && t.ptyId === ptyId,
    );
  },

  initActivity: (ptyId: number) => {
    set((state) => ({
      tabActivity: {
        ...state.tabActivity,
        [ptyId]: {
          alive: true,
          active: true,
          exitCode: null,
          bell: false,
          lastOutputAt: Date.now(),
          lastAttentionAt: null,
          lastNotificationMessage: null,
        },
      },
    }));
  },

  setTabActive: (ptyId: number, active: boolean) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev || prev.active === active) return state;
      return {
        tabActivity: {
          ...state.tabActivity,
          [ptyId]: {
            ...prev,
            active,
            lastOutputAt: active ? Date.now() : prev.lastOutputAt,
          },
        },
      };
    });
  },

  setTabExited: (ptyId: number, exitCode: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, alive: false, exitCode } } };
    });
  },

  setTabBell: (ptyId: number, message?: string) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return {
        tabActivity: {
          ...state.tabActivity,
          [ptyId]: {
            ...prev,
            bell: true,
            lastAttentionAt: Date.now(),
            lastNotificationMessage: message?.trim() || prev.lastNotificationMessage,
          },
        },
      };
    });
  },

  clearTabBell: (ptyId: number) => {
    set((state) => {
      const prev = state.tabActivity[ptyId];
      if (!prev) return state;
      return { tabActivity: { ...state.tabActivity, [ptyId]: { ...prev, bell: false } } };
    });
  },

  removeActivity: (ptyId: number) => {
    set((state) => {
      const { [ptyId]: _, ...rest } = state.tabActivity;
      return { tabActivity: rest };
    });
  },

  getAllProjectTabs: (repoPath: string) => {
    const ps = get().projectState[repoPath];
    return ps?.tabs ?? [];
  },
}));
