import { create } from 'zustand';
import type { GameConfig } from '../types';

// =============================================================================
// GAME STORE
// =============================================================================
// Simplified store that only manages UI state.
// Server data (issues, battles) is managed by React Query as the single source of truth.
// Game state (unit selection) is managed by Phaser.

interface GameState {
  // Configuration (set once on startup)
  config: GameConfig | null;
  setConfig: (config: GameConfig | null) => void;

  // UI state
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;

  // Wave state
  currentWave: number;
  nextWave: () => void;
  resetWaves: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),

  showSetup: true,
  setShowSetup: (show) => set({ showSetup: show }),

  currentWave: 0,
  nextWave: () => set((state) => ({ currentWave: state.currentWave + 1 })),
  resetWaves: () => set({ currentWave: 0 }),
}));
