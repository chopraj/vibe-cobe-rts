import { create } from 'zustand';
import type { GitHubIssue, Battle, GameConfig } from '../types';

interface GameState {
  // Configuration
  config: GameConfig | null;
  setConfig: (config: GameConfig | null) => void;

  // Issues (enemies)
  issues: GitHubIssue[];
  setIssues: (issues: GitHubIssue[]) => void;

  // Battles
  battles: Battle[];
  setBattles: (battles: Battle[]) => void;

  // Selected units
  selectedUnits: Set<number>;
  selectUnit: (unitIndex: number) => void;
  deselectUnit: (unitIndex: number) => void;
  selectAllUnits: () => void;
  deselectAllUnits: () => void;

  // UI state
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Configuration
  config: null,
  setConfig: (config) => set({ config }),

  // Issues
  issues: [],
  setIssues: (issues) => set({ issues }),

  // Battles
  battles: [],
  setBattles: (battles) => set({ battles }),

  // Selected units (default: all 10 selected)
  selectedUnits: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  selectUnit: (unitIndex) =>
    set((state) => ({
      selectedUnits: new Set([...state.selectedUnits, unitIndex]),
    })),
  deselectUnit: (unitIndex) =>
    set((state) => {
      const newSet = new Set(state.selectedUnits);
      newSet.delete(unitIndex);
      return { selectedUnits: newSet };
    }),
  selectAllUnits: () =>
    set({ selectedUnits: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) }),
  deselectAllUnits: () => set({ selectedUnits: new Set() }),

  // UI state
  showSetup: true,
  setShowSetup: (show) => set({ showSetup: show }),
}));
