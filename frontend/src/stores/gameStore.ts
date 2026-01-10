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
}

export const useGameStore = create<GameState>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),

  showSetup: true,
  setShowSetup: (show) => set({ showSetup: show }),
}));
