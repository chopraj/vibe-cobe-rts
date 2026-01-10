import Phaser from 'phaser';
import type { Unit } from '../entities/Unit';
import type { IssueEnemy } from '../entities/IssueEnemy';
import { COLORS } from '../../constants';

// =============================================================================
// INPUT MANAGER
// =============================================================================
// Handles all mouse/keyboard input for unit selection and commands:
// - Left click: Select single unit or start drag selection
// - Shift+click: Add to selection
// - Drag: Box selection
// - Right click: Move or attack command

export interface InputCallbacks {
  onMoveUnits: (units: Unit[], x: number, y: number) => void;
  onAttackEnemy: (units: Unit[], enemy: IssueEnemy) => void;
  onCancelEngagedUnits: (units: Unit[]) => Promise<boolean>;
}

export class InputManager {
  private scene: Phaser.Scene;
  private units: Unit[];
  private enemies: Map<number, IssueEnemy>;
  private callbacks: InputCallbacks;

  private selectionBox: Phaser.GameObjects.Rectangle | null = null;
  private selectionStart: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    units: Unit[],
    enemies: Map<number, IssueEnemy>,
    callbacks: InputCallbacks
  ) {
    this.scene = scene;
    this.units = units;
    this.enemies = enemies;
    this.callbacks = callbacks;
    this.setup();
  }

  private setup(): void {
    // Disable browser context menu
    this.scene.input.mouse?.disableContextMenu();

    // Pointer events
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
      } else if (pointer.leftButtonDown()) {
        this.handleLeftClick(pointer);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.selectionStart && pointer.leftButtonDown()) {
        this.updateSelectionBox(pointer);
      }
    });

    this.scene.input.on('pointerup', () => {
      if (this.selectionStart) {
        this.endSelectionBox();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Left Click - Selection
  // ---------------------------------------------------------------------------

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    // Check if clicking on a unit
    const clicked = this.units.find((u) =>
      u.getUnitBounds().contains(pointer.x, pointer.y)
    );

    if (clicked) {
      const shiftHeld = this.isShiftHeld();
      if (shiftHeld) {
        clicked.toggleSelected();
      } else {
        this.units.forEach((u) => u.setSelected(false));
        clicked.setSelected(true);
      }
      return;
    }

    // Start drag selection
    this.selectionStart = { x: pointer.x, y: pointer.y };
    this.selectionBox = this.scene.add.rectangle(
      pointer.x,
      pointer.y,
      0,
      0,
      COLORS.selection,
      0.2
    );
    this.selectionBox.setStrokeStyle(2, COLORS.selection);
    this.selectionBox.setOrigin(0, 0);
  }

  private updateSelectionBox(pointer: Phaser.Input.Pointer): void {
    if (!this.selectionBox || !this.selectionStart) return;

    const w = pointer.x - this.selectionStart.x;
    const h = pointer.y - this.selectionStart.y;

    this.selectionBox.setSize(Math.abs(w), Math.abs(h));
    this.selectionBox.setPosition(
      w < 0 ? pointer.x : this.selectionStart.x,
      h < 0 ? pointer.y : this.selectionStart.y
    );
  }

  private endSelectionBox(): void {
    if (!this.selectionBox || !this.selectionStart) return;

    const bounds = this.selectionBox.getBounds();

    // Only process if box was actually dragged (not just a click)
    if (bounds.width > 5 || bounds.height > 5) {
      if (!this.isShiftHeld()) {
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

  // ---------------------------------------------------------------------------
  // Right Click - Commands
  // ---------------------------------------------------------------------------

  private async handleRightClick(pointer: Phaser.Input.Pointer): Promise<void> {
    const selected = this.units.filter((u) => u.isSelected());
    if (selected.length === 0) return;

    // Check if any selected units are engaged in battle
    const engaged = selected.filter((u) => u.isEngaged());
    if (engaged.length > 0) {
      const confirmed = await this.callbacks.onCancelEngagedUnits(engaged);
      if (!confirmed) return;
      engaged.forEach((u) => u.disengage());
    }

    // Check if clicking on an enemy
    for (const enemy of this.enemies.values()) {
      if (enemy.getBounds().contains(pointer.x, pointer.y)) {
        this.callbacks.onAttackEnemy(selected, enemy);
        return;
      }
    }

    // Move to position
    this.callbacks.onMoveUnits(selected, pointer.x, pointer.y);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private isShiftHeld(): boolean {
    return !!this.scene.input.keyboard?.checkDown(
      this.scene.input.keyboard.addKey('SHIFT')
    );
  }

  /**
   * Update references when units/enemies change.
   * Call this after updateIssues in ArenaScene.
   */
  updateReferences(units: Unit[], enemies: Map<number, IssueEnemy>): void {
    this.units = units;
    this.enemies = enemies;
  }
}
