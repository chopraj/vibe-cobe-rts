import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { IssueEnemy } from '../entities/IssueEnemy';
import { BattleManager } from '../managers/BattleManager';
import { InputManager } from '../managers/InputManager';
import type { GitHubIssue, Battle, UnitType } from '../../types';
import { UNIT_TYPES } from '../../types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_SIZE,
  UNIT_FORMATION_X,
  UNIT_FORMATION_Y_START,
  UNIT_SPACING,
  UNIT_MOVE_OFFSET,
  ENEMY_START_X,
  ENEMY_START_Y,
  ENEMY_SPACING,
  COLORS,
} from '../../constants';

// =============================================================================
// ARENA SCENE
// =============================================================================
// Main game scene. Coordinates units, enemies, and battles.
// Logic is delegated to managers for clarity:
// - BattleManager: Attack intents, proximity detection, battle effects
// - InputManager: Selection and movement commands

// Callback interface for React communication
export interface GameCallbacks {
  onAttackIssue: (issueNumber: number, unitCount: number) => void;
  onRequestCancelBattle: (battleId: string) => Promise<boolean>;
}

export class ArenaScene extends Phaser.Scene {
  private units: Unit[] = [];
  private enemies: Map<number, IssueEnemy> = new Map();
  private battleManager!: BattleManager;
  private inputManager!: InputManager;

  constructor() {
    super({ key: "ArenaScene" });
  }

  create(): void {
    this.createGrid();
    this.createUnits(10);

    // Initialize managers
    this.battleManager = new BattleManager(this);
    this.inputManager = new InputManager(this, this.units, this.enemies, {
      onMoveUnits: this.handleMoveUnits.bind(this),
      onAttackEnemy: this.handleAttackEnemy.bind(this),
      onCancelEngagedUnits: this.handleCancelEngaged.bind(this),
    });
  }

  // ---------------------------------------------------------------------------
  // Public API (called from React via GameCanvas)
  // ---------------------------------------------------------------------------

  setCallbacks(callbacks: GameCallbacks): void {
    this.battleManager.setCallbacks(callbacks);
  }

  updateIssues(issues: GitHubIssue[]): void {
    // Remove enemies no longer in the list
    const issueNums = new Set(issues.map((i) => i.number));
    for (const [num, enemy] of this.enemies) {
      if (!issueNums.has(num)) {
        enemy.destroy();
        this.enemies.delete(num);
        this.battleManager.removeIntent(num);
      }
    }

    // Add or update enemies in a 3-column grid layout
    const cols = 3;
    const colSpacing = 80; // Horizontal spacing between columns
    issues.forEach((issue, index) => {
      let enemy = this.enemies.get(issue.number);
      if (!enemy) {
        // Grid layout: spread enemies across columns, then rows
        const x = ENEMY_START_X - (index % cols) * colSpacing;
        const y = ENEMY_START_Y + Math.floor(index / cols) * ENEMY_SPACING;
        enemy = new IssueEnemy(this, x, y, issue);
        this.enemies.set(issue.number, enemy);
      }
      enemy.setIssue(issue);
    });

    // Update input manager's reference to enemies
    this.inputManager.updateReferences(this.units, this.enemies);
  }

  updateBattles(battles: Battle[]): void {
    // Sync battle state to manager
    this.battleManager.syncBattles(battles, this.enemies, this.units);

    // Remove defeated enemies
    battles.forEach((b) => {
      if (b.status === 'victory') {
        const enemy = this.enemies.get(b.issueNumber);
        if (enemy) {
          enemy.destroy();
          this.enemies.delete(b.issueNumber);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Input Handlers (called by InputManager)
  // ---------------------------------------------------------------------------

  private handleMoveUnits(units: Unit[], x: number, y: number): void {
    // Cancel any attack intents for these units
    this.battleManager.removeUnitsFromAllIntents(units);
    units.forEach((u) => u.clearTarget());

    // Move in formation
    units.forEach((unit, index) => {
      const ox = (index % 3 - 1) * UNIT_MOVE_OFFSET;
      const oy = Math.floor(index / 3) * UNIT_MOVE_OFFSET;
      unit.moveTo(x + ox, y + oy);
    });
  }

  private handleAttackEnemy(units: Unit[], enemy: IssueEnemy): void {
    this.battleManager.createIntent(enemy.getIssueNumber(), units, enemy);
  }

  private async handleCancelEngaged(units: Unit[]): Promise<boolean> {
    const battleId = this.battleManager.getEngagedBattleForUnits(units);
    if (!battleId) return true;
    return this.battleManager.requestCancelBattle(battleId);
  }

  // ---------------------------------------------------------------------------
  // Setup Helpers
  // ---------------------------------------------------------------------------

  private createGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.grid, 0.3);

    for (let x = 0; x <= GAME_WIDTH; x += GRID_SIZE) {
      g.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += GRID_SIZE) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createUnits(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = UNIT_FORMATION_X + Math.floor(i / 5) * UNIT_SPACING;
      const y = UNIT_FORMATION_Y_START + (i % 5) * UNIT_SPACING;
      // Cycle through unit types for equal distribution
      const unitType: UnitType = UNIT_TYPES[i % UNIT_TYPES.length];
      this.units.push(new Unit(this, x, y, i, unitType));
    }
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  update(): void {
    // Update unit positions
    this.units.forEach((u) => u.update());

    // Check for battle triggers and update visuals
    this.battleManager.checkProximityAndTrigger(this.enemies);
    this.battleManager.updateVisuals(this.enemies);
  }
}
