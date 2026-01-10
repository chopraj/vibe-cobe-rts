import Phaser from 'phaser';

// Scale factor to resize the large sprite sheet frames (704x1536) to game size
const AGENT_SCALE = .1;

export class Unit extends Phaser.GameObjects.Sprite {
  private unitIndex: number;
  private selected: boolean = false;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private speed: number = 150;
  private engagedBattleId: string | null = null;
  private targetIssueNumber: number | null = null; // Issue we're moving toward
  private selectionCircle: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number, index: number) {
    super(scene, x, y, 'agent', 0);
    this.unitIndex = index;
    this.selected = true; // Start selected

    // Scale down the large sprite
    this.setScale(AGENT_SCALE);

    // Create selection circle underneath the unit
    this.selectionCircle = scene.add.sprite(x, y + 25, 'selection-circle');
    this.selectionCircle.setDepth(-1); // Render behind the unit

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setInteractive();
    this.updateSelectionVisual();
  }

  getIndex(): number {
    return this.unitIndex;
  }

  isSelected(): boolean {
    return this.selected;
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.updateSelectionVisual();
  }

  toggleSelected(): void {
    this.setSelected(!this.selected);
  }

  private updateSelectionVisual(): void {
    this.selectionCircle.setVisible(this.selected);
  }

  moveTo(x: number, y: number, targetIssueNumber?: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetIssueNumber = targetIssueNumber ?? null;
  }

  // Engagement state management
  isEngaged(): boolean {
    return this.engagedBattleId !== null;
  }

  getEngagedBattleId(): string | null {
    return this.engagedBattleId;
  }

  engage(battleId: string): void {
    this.engagedBattleId = battleId;
    this.targetIssueNumber = null; // Clear target once engaged
  }

  disengage(): void {
    this.engagedBattleId = null;
  }

  // Attack intent tracking
  getTargetIssueNumber(): number | null {
    return this.targetIssueNumber;
  }

  clearTarget(): void {
    this.targetIssueNumber = null;
  }

  isMoving(): boolean {
    return this.targetX !== null && this.targetY !== null;
  }

  hasArrivedAtTarget(): boolean {
    if (this.targetX === null || this.targetY === null) return false;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 5;
  }

  update(): void {
    if (this.targetX === null || this.targetY === null) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Arrived at destination
      this.targetX = null;
      this.targetY = null;
      return;
    }

    // Move toward target
    const vx = (dx / distance) * this.speed * (1 / 60); // Assuming 60 FPS
    const vy = (dy / distance) * this.speed * (1 / 60);

    this.x += vx;
    this.y += vy;

    // Update selection circle position to follow unit
    this.selectionCircle.setPosition(this.x, this.y + 25);
  }

  getUnitBounds(): Phaser.Geom.Rectangle {
    // Use scaled dimensions (this.width/height are unscaled frame size)
    const scaledWidth = this.width * this.scaleX;
    const scaledHeight = this.height * this.scaleY;
    return new Phaser.Geom.Rectangle(
      this.x - scaledWidth / 2,
      this.y - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
  }

  destroy(fromScene?: boolean): void {
    this.selectionCircle.destroy();
    super.destroy(fromScene);
  }
}
