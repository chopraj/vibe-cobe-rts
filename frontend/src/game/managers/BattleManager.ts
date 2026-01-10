import Phaser from 'phaser';
import type { Battle } from '../../types';
import type { Unit } from '../entities/Unit';
import type { IssueEnemy } from '../entities/IssueEnemy';
import { BattleEffect } from '../entities/BattleEffect';
import {
  PROXIMITY_RADIUS,
  ENGAGE_RADIUS,
  COLORS,
  ANIMATION,
  UNIT_MOVE_OFFSET,
} from '../../constants';

// =============================================================================
// BATTLE MANAGER
// =============================================================================
// Handles all battle-related logic:
// - Attack intents (visual targeting before battle starts)
// - Proximity detection (triggering battles when units arrive)
// - Battle effects (visual feedback during combat)
// - Battle state synchronization from server

export interface AttackIntent {
  targetIssueNumber: number;
  assignedUnits: Unit[];
  graphics: Phaser.GameObjects.Graphics;
}

export interface BattleCallbacks {
  onAttackIssue: (issueNumber: number, unitCount: number) => void;
  onRequestCancelBattle: (battleId: string) => Promise<boolean>;
}

export class BattleManager {
  private scene: Phaser.Scene;
  private intents: Map<number, AttackIntent> = new Map();
  private effects: Map<string, BattleEffect> = new Map();
  private activeBattleIssues: Set<number> = new Set();
  private callbacks: BattleCallbacks | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setCallbacks(callbacks: BattleCallbacks): void {
    this.callbacks = callbacks;
  }

  // ---------------------------------------------------------------------------
  // Attack Intent Management
  // ---------------------------------------------------------------------------

  createIntent(issueNumber: number, units: Unit[], enemy: IssueEnemy): void {
    // Don't create intent if already in battle
    if (this.activeBattleIssues.has(issueNumber)) return;

    // Clean up existing intent for this issue
    this.removeIntent(issueNumber);

    // Remove these units from any other intents
    this.removeUnitsFromAllIntents(units);

    // Create visual graphics
    const graphics = this.scene.add.graphics();
    this.drawTargetHighlight(graphics, enemy.x, enemy.y);

    // Add pulse animation
    this.scene.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0.3 },
      duration: ANIMATION.targetHighlightPulse,
      yoyo: true,
      repeat: -1,
    });

    this.intents.set(issueNumber, {
      targetIssueNumber: issueNumber,
      assignedUnits: [...units],
      graphics,
    });

    // Move units toward enemy in formation
    units.forEach((unit, index) => {
      const offset = this.getFormationOffset(index);
      unit.moveTo(enemy.x + offset.x, enemy.y + offset.y - 30, issueNumber);
    });
  }

  removeIntent(issueNumber: number): void {
    const intent = this.intents.get(issueNumber);
    if (intent) {
      intent.graphics.destroy();
      this.intents.delete(issueNumber);
    }
  }

  removeUnitsFromAllIntents(units: Unit[]): void {
    for (const [issueNumber, intent] of this.intents) {
      intent.assignedUnits = intent.assignedUnits.filter((u) => !units.includes(u));
      if (intent.assignedUnits.length === 0) {
        this.removeIntent(issueNumber);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Proximity Detection & Battle Triggering
  // ---------------------------------------------------------------------------

  checkProximityAndTrigger(enemies: Map<number, IssueEnemy>): void {
    for (const [issueNumber, intent] of this.intents) {
      const enemy = enemies.get(issueNumber);
      if (!enemy) continue;

      // Check if any assigned unit is close enough
      const arrived = intent.assignedUnits.some((unit) => {
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);
        return dist < PROXIMITY_RADIUS;
      });

      if (arrived) {
        this.triggerBattle(issueNumber, intent);
      }
    }
  }

  private triggerBattle(issueNumber: number, intent: AttackIntent): void {
    const unitCount = intent.assignedUnits.length;

    // Clean up intent visuals
    this.removeIntent(issueNumber);

    // Mark as active battle
    this.activeBattleIssues.add(issueNumber);

    // Stop unit movement
    intent.assignedUnits.forEach((u) => u.clearTarget());

    // Notify React to start the battle
    this.callbacks?.onAttackIssue(issueNumber, unitCount);
  }

  // ---------------------------------------------------------------------------
  // Battle State Sync (from server via React)
  // ---------------------------------------------------------------------------

  syncBattles(battles: Battle[], enemies: Map<number, IssueEnemy>, units: Unit[]): void {
    // Update which issues have active battles
    this.activeBattleIssues.clear();
    battles.forEach((b) => {
      if (b.status === 'pending' || b.status === 'fighting') {
        this.activeBattleIssues.add(b.issueNumber);
      }
    });

    // Clean up finished battle effects
    for (const [battleId, effect] of this.effects) {
      const battle = battles.find((b) => b.id === battleId);
      if (!battle || battle.status === 'victory' || battle.status === 'defeat') {
        effect.destroy();
        this.effects.delete(battleId);

        // Disengage units from this battle
        units.forEach((u) => {
          if (u.getEngagedBattleId() === battleId) {
            u.disengage();
          }
        });
      }
    }

    // Create/update battle effects
    battles.forEach((battle) => {
      if (battle.status === 'fighting') {
        const enemy = enemies.get(battle.issueNumber);
        if (enemy && !this.effects.has(battle.id)) {
          // Create battle effect
          const effect = new BattleEffect(this.scene, enemy.x, enemy.y, battle);
          this.effects.set(battle.id, effect);

          // Engage nearby units
          units.forEach((unit) => {
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);
            if (dist < ENGAGE_RADIUS) {
              unit.engage(battle.id);
            }
          });
        } else if (this.effects.has(battle.id)) {
          // Update existing effect with new battle data
          this.effects.get(battle.id)!.setBattle(battle);
        }
      }

      // Show result effect for finished battles
      if (battle.status === 'victory' || battle.status === 'defeat') {
        const enemy = enemies.get(battle.issueNumber);
        if (enemy) {
          this.showResultEffect(enemy.x, enemy.y, battle.status === 'victory');
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Visual Updates (called every frame)
  // ---------------------------------------------------------------------------

  updateVisuals(enemies: Map<number, IssueEnemy>): void {
    // Redraw approach lines for each intent
    for (const [issueNumber, intent] of this.intents) {
      const enemy = enemies.get(issueNumber);
      if (!enemy) continue;

      intent.graphics.clear();
      this.drawTargetHighlight(intent.graphics, enemy.x, enemy.y);
      this.drawApproachLines(intent.graphics, intent.assignedUnits, enemy);
    }

    // Update battle effects
    this.effects.forEach((effect) => effect.update());
  }

  private drawTargetHighlight(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(3, COLORS.targetHighlight, 1);
    g.strokeCircle(x, y, 45);
  }

  private drawApproachLines(g: Phaser.GameObjects.Graphics, units: Unit[], enemy: IssueEnemy): void {
    g.lineStyle(2, COLORS.approachLine, 0.5);
    units.forEach((unit) => {
      g.lineBetween(unit.x, unit.y, enemy.x, enemy.y);
    });
  }

  private showResultEffect(x: number, y: number, isVictory: boolean): void {
    const texture = isVictory ? 'victory-effect' : 'defeat-effect';
    const effect = this.scene.add.sprite(x, y, texture);
    effect.setScale(0.5);

    this.scene.tweens.add({
      targets: effect,
      scale: 2,
      alpha: 0,
      duration: ANIMATION.resultEffect,
      ease: 'Power2',
      onComplete: () => effect.destroy(),
    });
  }

  private getFormationOffset(index: number): { x: number; y: number } {
    return {
      x: (index % 3 - 1) * UNIT_MOVE_OFFSET,
      y: Math.floor(index / 3) * UNIT_MOVE_OFFSET,
    };
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  isInBattle(issueNumber: number): boolean {
    return this.activeBattleIssues.has(issueNumber);
  }

  getEngagedBattleForUnits(units: Unit[]): string | null {
    for (const unit of units) {
      const battleId = unit.getEngagedBattleId();
      if (battleId) return battleId;
    }
    return null;
  }

  async requestCancelBattle(battleId: string): Promise<boolean> {
    return this.callbacks?.onRequestCancelBattle(battleId) ?? false;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    this.intents.forEach((intent) => intent.graphics.destroy());
    this.effects.forEach((effect) => effect.destroy());
    this.intents.clear();
    this.effects.clear();
  }
}
