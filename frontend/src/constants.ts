// =============================================================================
// GAME CONSTANTS
// =============================================================================

// -----------------------------------------------------------------------------
// Game Dimensions
// -----------------------------------------------------------------------------
export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;

// -----------------------------------------------------------------------------
// Unit Configuration
// -----------------------------------------------------------------------------
export const UNIT_FORMATION_X = 150;
export const UNIT_FORMATION_Y_START = 200;
export const UNIT_SPACING = 50;
export const UNIT_MOVE_OFFSET = 30;
export const UNIT_SIZE = 24;
export const UNIT_SPEED = 150;

// -----------------------------------------------------------------------------
// Battle Mechanics
// -----------------------------------------------------------------------------
export const PROXIMITY_RADIUS = 50;
export const ENGAGE_RADIUS = 100; // PROXIMITY_RADIUS + buffer

// -----------------------------------------------------------------------------
// Enemy Configuration
// -----------------------------------------------------------------------------
export const ENEMY_START_X = GAME_WIDTH - 200;
export const ENEMY_START_Y = 100;
export const ENEMY_SPACING = 120; // Increased for taller goblin sprites
export const MAX_VISIBLE_ENEMIES = 10;
export const ENEMY_SIZE = 32;

// -----------------------------------------------------------------------------
// Grid
// -----------------------------------------------------------------------------
export const GRID_SIZE = 50;

// -----------------------------------------------------------------------------
// Phaser Colors (hex numbers for Phaser graphics)
// -----------------------------------------------------------------------------
export const COLORS = {
  // UI
  background: 0x1a1a2e,
  grid: 0x333355,
  selection: 0x00ff00,

  // Units
  unit: 0x4444ff,
  unitBorder: 0x6666ff,
  unitSelectedBorder: 0xffdd00,

  // Enemies
  enemy: 0xff4444,
  enemyDark: 0xaa2222,

  // Battle effects
  battle: 0xffff00,
  battleInner: 0xffaa00,
  victory: 0x00ff00,
  victoryInner: 0x88ff88,
  defeat: 0xff0000,

  // Attack intent
  approachLine: 0x00ff00,
  targetHighlight: 0xffff00,

  // Agent status
  agentPending: 0x444444,
  agentWorking: 0xffff00,
  agentSuccess: 0x00ff00,
  agentFailed: 0xff0000,
  agentCancelled: 0x888888,

  // Loading
  loadingBg: 0x222222,
  loadingBar: 0x00ff00,
} as const;

// -----------------------------------------------------------------------------
// Animation Durations (milliseconds)
// -----------------------------------------------------------------------------
export const ANIMATION = {
  pulse: 500,
  battleRotation: 2000,
  resultEffect: 1500,
  idleBob: 1000,
  targetHighlightPulse: 500,
} as const;

// -----------------------------------------------------------------------------
// Sprite Sizes (approximate display sizes after scaling)
// -----------------------------------------------------------------------------
export const SPRITE_SIZES = {
  unit: 24,
  enemy: 32,
  battleEffect: 48,
} as const;

// -----------------------------------------------------------------------------
// Agent Status Colors (for React components - CSS hex strings)
// -----------------------------------------------------------------------------
export const AGENT_STATUS_COLORS = {
  pending: '#444444',
  working: '#ffff00',
  success: '#00ff00',
  failed: '#ff0000',
  cancelled: '#888888',
} as const;

// -----------------------------------------------------------------------------
// Battle Status Colors (for React components - CSS hex strings)
// -----------------------------------------------------------------------------
export const BATTLE_STATUS_COLORS = {
  pending: '#888888',
  fighting: '#ffff00',
  victory: '#00ff00',
  defeat: '#ff4444',
} as const;
