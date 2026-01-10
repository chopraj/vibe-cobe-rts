import Phaser from 'phaser';
import type { GitHubIssue } from '../../types';

// Scale factor to resize the large sprite sheet frames (704x1536) to game size
const ISSUE_SCALE = 0.1;

export class IssueEnemy extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private label: Phaser.GameObjects.Text;
  private issue: GitHubIssue;

  constructor(scene: Phaser.Scene, x: number, y: number, issue: GitHubIssue) {
    super(scene, x, y);
    this.issue = issue;

    this.sprite = scene.add.sprite(0, 0, 'issue-sprite', 0);
    this.sprite.setScale(ISSUE_SCALE);
    this.add(this.sprite);

    this.label = scene.add.text(0, -45, `#${issue.number}`, {
      font: 'bold 12px monospace',
      color: '#ff6666',
      backgroundColor: '#1a1a2e',
      padding: { x: 4, y: 2 },
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    // Add title tooltip on hover
    this.sprite.setInteractive();
    this.sprite.on('pointerover', () => {
      this.showTooltip();
    });
    this.sprite.on('pointerout', () => {
      this.hideTooltip();
    });

    scene.add.existing(this);

    // Add physics body for proximity detection
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(40); // Proximity radius
    body.setOffset(-40, -40); // Center the circle
    body.setImmovable(true);

    // Idle animation - slight bob
    scene.tweens.add({
      targets: this.sprite,
      y: -3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private tooltip: Phaser.GameObjects.Text | null = null;

  private showTooltip(): void {
    if (this.tooltip) return;

    const truncatedTitle =
      this.issue.title.length > 40
        ? this.issue.title.slice(0, 40) + '...'
        : this.issue.title;

    this.tooltip = this.scene.add.text(this.x, this.y + 50, truncatedTitle, {
      font: '11px monospace',
      color: '#ffffff',
      backgroundColor: '#333366',
      padding: { x: 6, y: 4 },
    });
    this.tooltip.setOrigin(0.5, 0);
    this.tooltip.setDepth(100);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  setIssue(issue: GitHubIssue): void {
    this.issue = issue;
    this.label.setText(`#${issue.number}`);
  }

  getIssue(): GitHubIssue {
    return this.issue;
  }

  getIssueNumber(): number {
    return this.issue.number;
  }

  getBounds(): Phaser.Geom.Rectangle {
    // Scaled sprite is approximately 35x77 pixels
    const width = 35;
    const height = 77;
    return new Phaser.Geom.Rectangle(
      this.x - width / 2,
      this.y - height / 2,
      width,
      height
    );
  }

  destroy(fromScene?: boolean): void {
    this.hideTooltip();
    super.destroy(fromScene);
  }
}
