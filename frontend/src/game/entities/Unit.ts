import Phaser from 'phaser';

export class Unit extends Phaser.GameObjects.Sprite {
  private unitIndex: number;
  private selected: boolean = false;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private speed: number = 150;

  constructor(scene: Phaser.Scene, x: number, y: number, index: number) {
    super(scene, x, y, 'unit');
    this.unitIndex = index;
    this.selected = true; // Start selected

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setInteractive();
    this.updateTexture();
  }

  getIndex(): number {
    return this.unitIndex;
  }

  isSelected(): boolean {
    return this.selected;
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.updateTexture();
  }

  toggleSelected(): void {
    this.setSelected(!this.selected);
  }

  private updateTexture(): void {
    this.setTexture(this.selected ? 'unit-selected' : 'unit');
  }

  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
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
  }

  getUnitBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );
  }
}
