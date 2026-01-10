import Phaser from "phaser";
import { Unit } from "../entities/Unit";
import { IssueEnemy } from "../entities/IssueEnemy";
import { BattleEffect } from "../entities/BattleEffect";
import type { GitHubIssue, Battle } from "../../types";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

// Event types for communication with React
export interface GameEvents {
  onAttackIssue: (issueNumber: number, unitCount: number) => void;
  onRequestCancelBattle: (
    battleId: string,
    callback: (confirmed: boolean) => void
  ) => void;
}

// Track pending attack intents
interface AttackIntent {
  targetIssueNumber: number;
  assignedUnits: Unit[];
  approachLines: Phaser.GameObjects.Graphics;
  targetHighlight: Phaser.GameObjects.Graphics;
}

export class ArenaScene extends Phaser.Scene {
  private units: Unit[] = [];
  private issueEnemies: Map<number, IssueEnemy> = new Map();
  private battleEffects: Map<string, BattleEffect> = new Map();
  private attackIntents: Map<number, AttackIntent> = new Map();
  private activeBattleIssues: Set<number> = new Set(); // Issues currently in battle
  private selectionBox: Phaser.GameObjects.Rectangle | null = null;
  private selectionStart: { x: number; y: number } | null = null;
  private gameEvents: GameEvents | null = null;

  // Formation positions for units
  private readonly UNIT_FORMATION_X = 150;
  private readonly UNIT_FORMATION_Y_START = 200;
  private readonly UNIT_SPACING = 50;
  private readonly PROXIMITY_RADIUS = 50; // Distance to trigger battle

  constructor() {
    super({ key: "ArenaScene" });
  }

  create(): void {
    // Create grid background
    this.createGrid();

    // Create initial units
    this.createUnits(10);

    // Setup input handlers
    this.setupInput();

    // Listen for data updates from React
    this.events.on("updateIssues", this.updateIssues, this);
    this.events.on("updateBattles", this.updateBattles, this);
    this.events.on("setGameEvents", (events: GameEvents) => {
      this.gameEvents = events;
    });
  }

  private createGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333355, 0.3);

    // Vertical lines
    for (let x = 0; x <= GAME_WIDTH; x += 50) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    // Horizontal lines
    for (let y = 0; y <= GAME_HEIGHT; y += 50) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createUnits(count: number): void {
    for (let i = 0; i < count; i++) {
      const y = this.UNIT_FORMATION_Y_START + (i % 5) * this.UNIT_SPACING;
      const x = this.UNIT_FORMATION_X + Math.floor(i / 5) * this.UNIT_SPACING;
      const unit = new Unit(this, x, y, i);
      this.units.push(unit);
    }
  }

  private setupInput(): void {
    // Right-click to move selected units
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
      } else if (pointer.leftButtonDown()) {
        this.startSelectionBox(pointer);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.selectionStart && pointer.leftButtonDown()) {
        this.updateSelectionBox(pointer);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.selectionStart) {
        this.endSelectionBox(pointer);
      }
    });

    // Enable right-click
    this.input.mouse?.disableContextMenu();
  }

  private startSelectionBox(pointer: Phaser.Input.Pointer): void {
    // Check if clicking on a unit
    const clickedUnit = this.units.find((u) =>
      u.getUnitBounds().contains(pointer.x, pointer.y)
    );
    if (clickedUnit) {
      // Toggle selection on single unit
      if (this.input.keyboard?.checkDown(this.input.keyboard.addKey("SHIFT"))) {
        clickedUnit.toggleSelected();
      } else {
        // Deselect all and select this one
        this.units.forEach((u) => u.setSelected(false));
        clickedUnit.setSelected(true);
      }
      return;
    }

    // Start drag selection
    this.selectionStart = { x: pointer.x, y: pointer.y };
    this.selectionBox = this.add.rectangle(
      pointer.x,
      pointer.y,
      0,
      0,
      0x00ff00,
      0.2
    );
    this.selectionBox.setStrokeStyle(2, 0x00ff00);
    this.selectionBox.setOrigin(0, 0);
  }

  private updateSelectionBox(pointer: Phaser.Input.Pointer): void {
    if (!this.selectionBox || !this.selectionStart) return;

    const width = pointer.x - this.selectionStart.x;
    const height = pointer.y - this.selectionStart.y;

    this.selectionBox.setSize(Math.abs(width), Math.abs(height));
    this.selectionBox.setPosition(
      width < 0 ? pointer.x : this.selectionStart.x,
      height < 0 ? pointer.y : this.selectionStart.y
    );
  }

  private endSelectionBox(_pointer: Phaser.Input.Pointer): void {
    if (!this.selectionBox || !this.selectionStart) return;

    const bounds = this.selectionBox.getBounds();

    // Select units within the box
    if (bounds.width > 5 || bounds.height > 5) {
      if (
        !this.input.keyboard?.checkDown(this.input.keyboard.addKey("SHIFT"))
      ) {
        this.units.forEach((u) => u.setSelected(false));
      }

      this.units.forEach((unit) => {
        if (bounds.contains(unit.x, unit.y)) {
          unit.setSelected(true);
        }
      });
    }

    this.selectionBox.destroy();
    this.selectionBox = null;
    this.selectionStart = null;
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    const selectedUnits = this.units.filter((u) => u.isSelected());
    if (selectedUnits.length === 0) return;

    // Check if any selected units are engaged in battle
    const engagedUnits = selectedUnits.filter((u) => u.isEngaged());
    if (engagedUnits.length > 0) {
      // Request confirmation to cancel battle
      const battleId = engagedUnits[0].getEngagedBattleId();
      if (battleId && this.gameEvents?.onRequestCancelBattle) {
        this.gameEvents.onRequestCancelBattle(battleId, (confirmed) => {
          if (confirmed) {
            // Disengage all units from this battle
            this.units.forEach((u) => {
              if (u.getEngagedBattleId() === battleId) {
                u.disengage();
              }
            });
            // Now process the move command
            this.processMove(selectedUnits, pointer);
          }
        });
        return;
      }
    }

    this.processMove(selectedUnits, pointer);
  }

  private processMove(
    selectedUnits: Unit[],
    pointer: Phaser.Input.Pointer
  ): void {
    // Check if clicking on an issue enemy
    for (const [issueNumber, enemy] of this.issueEnemies) {
      if (enemy.getBounds().contains(pointer.x, pointer.y)) {
        // Create attack intent (don't trigger battle immediately)
        this.createAttackIntent(issueNumber, selectedUnits);
        return;
      }
    }

    // Otherwise, move units to position in formation (cancel any intents)
    selectedUnits.forEach((unit) => {
      unit.clearTarget();
    });

    // Clean up intents for these units
    this.cleanupIntentsForUnits(selectedUnits);

    const baseX = pointer.x;
    const baseY = pointer.y;

    selectedUnits.forEach((unit, index) => {
      const offsetX = ((index % 3) - 1) * 30;
      const offsetY = Math.floor(index / 3) * 30;
      unit.moveTo(baseX + offsetX, baseY + offsetY);
    });
  }

  private createAttackIntent(issueNumber: number, units: Unit[]): void {
    // Check if already in battle with this issue
    if (this.activeBattleIssues.has(issueNumber)) {
      console.log(`Already battling issue #${issueNumber}`);
      return;
    }

    const enemy = this.issueEnemies.get(issueNumber);
    if (!enemy) return;

    // Clean up any existing intent for this issue
    this.removeAttackIntent(issueNumber);

    // Clean up intents these units were part of
    this.cleanupIntentsForUnits(units);

    // Create visual indicators
    const approachLines = this.add.graphics();
    const targetHighlight = this.add.graphics();

    // Draw pulsing highlight around target
    targetHighlight.lineStyle(3, 0xffff00, 1);
    targetHighlight.strokeCircle(enemy.x, enemy.y, 45);

    // Add pulse animation to highlight
    this.tweens.add({
      targets: targetHighlight,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    const intent: AttackIntent = {
      targetIssueNumber: issueNumber,
      assignedUnits: [...units],
      approachLines,
      targetHighlight,
    };

    this.attackIntents.set(issueNumber, intent);

    // Move units toward the enemy
    units.forEach((unit, index) => {
      const offsetX = ((index % 3) - 1) * 30;
      const offsetY = Math.floor(index / 3) * 30 - 30;
      unit.moveTo(enemy.x + offsetX, enemy.y + offsetY, issueNumber);
    });
  }

  private removeAttackIntent(issueNumber: number): void {
    const intent = this.attackIntents.get(issueNumber);
    if (intent) {
      intent.approachLines.destroy();
      intent.targetHighlight.destroy();
      this.attackIntents.delete(issueNumber);
    }
  }

  private cleanupIntentsForUnits(units: Unit[]): void {
    for (const [issueNumber, intent] of this.attackIntents) {
      const remainingUnits = intent.assignedUnits.filter(
        (u) => !units.includes(u)
      );
      if (remainingUnits.length === 0) {
        this.removeAttackIntent(issueNumber);
      } else {
        intent.assignedUnits = remainingUnits;
      }
    }
  }

  private updateApproachLines(): void {
    for (const [issueNumber, intent] of this.attackIntents) {
      const enemy = this.issueEnemies.get(issueNumber);
      if (!enemy) continue;

      // Redraw approach lines
      intent.approachLines.clear();
      intent.approachLines.lineStyle(2, 0x00ff00, 0.5);

      intent.assignedUnits.forEach((unit) => {
        intent.approachLines.lineBetween(unit.x, unit.y, enemy.x, enemy.y);
      });
    }
  }

  private checkProximityTriggers(): void {
    for (const [issueNumber, intent] of this.attackIntents) {
      const enemy = this.issueEnemies.get(issueNumber);
      if (!enemy) continue;

      // Check if any assigned unit is close enough to trigger battle
      const arrivedUnit = intent.assignedUnits.find((unit) => {
        const dx = unit.x - enemy.x;
        const dy = unit.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.PROXIMITY_RADIUS;
      });

      if (arrivedUnit) {
        // Trigger the battle!
        this.triggerBattle(issueNumber, intent);
      }
    }
  }

  private triggerBattle(issueNumber: number, intent: AttackIntent): void {
    const unitCount = intent.assignedUnits.length;
    console.log(
      `Battle triggered for issue #${issueNumber} with ${unitCount} units`
    );

    // Remove the attack intent visuals
    this.removeAttackIntent(issueNumber);

    // Mark this issue as having an active battle
    this.activeBattleIssues.add(issueNumber);

    // Clear unit targets
    intent.assignedUnits.forEach((unit) => {
      unit.clearTarget();
    });

    // Trigger the attack callback to start the battle with the actual unit count
    if (this.gameEvents?.onAttackIssue) {
      this.gameEvents.onAttackIssue(issueNumber, unitCount);
    } else {
      console.log("no game events");
    }
  }

  updateIssues(issues: GitHubIssue[]): void {
    // Remove old enemies that are no longer in the list
    const issueNumbers = new Set(issues.map((i) => i.number));
    for (const [num, enemy] of this.issueEnemies) {
      if (!issueNumbers.has(num)) {
        enemy.destroy();
        this.issueEnemies.delete(num);
        this.removeAttackIntent(num);
      }
    }

    // Add or update enemies
    issues.forEach((issue, index) => {
      let enemy = this.issueEnemies.get(issue.number);

      if (!enemy) {
        // Position enemies on the right side
        const x = GAME_WIDTH - 200;
        const y = 100 + (index % 10) * 60;
        enemy = new IssueEnemy(this, x, y, issue);
        this.issueEnemies.set(issue.number, enemy);
      }

      enemy.setIssue(issue);
    });
  }

  updateBattles(battles: Battle[]): void {
    // Track which issues have active battles
    this.activeBattleIssues.clear();
    battles.forEach((b) => {
      if (b.status === "pending" || b.status === "fighting") {
        this.activeBattleIssues.add(b.issueNumber);
      }
    });

    // Clear old effects
    for (const [battleId, effect] of this.battleEffects) {
      const battle = battles.find((b) => b.id === battleId);
      if (
        !battle ||
        battle.status === "victory" ||
        battle.status === "defeat"
      ) {
        effect.destroy();
        this.battleEffects.delete(battleId);

        // Disengage units from this battle
        this.units.forEach((unit) => {
          if (unit.getEngagedBattleId() === battleId) {
            unit.disengage();
          }
        });
      }
    }

    // Create/update battle effects
    battles.forEach((battle) => {
      if (battle.status === "fighting") {
        const enemy = this.issueEnemies.get(battle.issueNumber);
        if (enemy && !this.battleEffects.has(battle.id)) {
          const effect = new BattleEffect(this, enemy.x, enemy.y, battle);
          this.battleEffects.set(battle.id, effect);

          // Engage nearby units in this battle
          this.units.forEach((unit) => {
            const dx = unit.x - enemy.x;
            const dy = unit.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.PROXIMITY_RADIUS + 50) {
              unit.engage(battle.id);
            }
          });
        }
      }

      // Show victory/defeat effect
      if (battle.status === "victory" || battle.status === "defeat") {
        const enemy = this.issueEnemies.get(battle.issueNumber);
        if (enemy) {
          this.showBattleResult(enemy.x, enemy.y, battle.status === "victory");
          // Remove the enemy if victory
          if (battle.status === "victory") {
            enemy.destroy();
            this.issueEnemies.delete(battle.issueNumber);
          }
        }
      }
    });
  }

  private showBattleResult(x: number, y: number, isVictory: boolean): void {
    const texture = isVictory ? "victory-effect" : "defeat-effect";
    const effect = this.add.sprite(x, y, texture);
    effect.setScale(0.5);

    // Animate and destroy
    this.tweens.add({
      targets: effect,
      scale: 2,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => effect.destroy(),
    });
  }

  update(_time: number, _delta: number): void {
    // Update all units
    this.units.forEach((unit) => unit.update());

    // Update all battle effects
    this.battleEffects.forEach((effect) => effect.update());

    // Update approach lines (redraw each frame as units move)
    this.updateApproachLines();

    // Check if any units have reached their target enemy
    this.checkProximityTriggers();
  }
}
