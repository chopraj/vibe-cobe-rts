import Phaser from 'phaser';
import type { Battle } from '../../types';

export class BattleEffect extends Phaser.GameObjects.Container {
  private battle: Battle;
  private effectSprite: Phaser.GameObjects.Sprite;
  private statusText: Phaser.GameObjects.Text;
  private agentIndicators: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, battle: Battle) {
    super(scene, x, y);
    this.battle = battle;

    // Create battle effect sprite
    this.effectSprite = scene.add.sprite(0, 0, 'battle-effect');
    this.effectSprite.setAlpha(0.7);
    this.add(this.effectSprite);

    // Add rotation animation
    scene.tweens.add({
      targets: this.effectSprite,
      rotation: Math.PI * 2,
      duration: 2000,
      repeat: -1,
    });

    // Add pulse animation
    scene.tweens.add({
      targets: this.effectSprite,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.5, to: 0.9 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Status text
    this.statusText = scene.add.text(0, 40, 'FIGHTING', {
      font: 'bold 12px monospace',
      color: '#ffff00',
    });
    this.statusText.setOrigin(0.5, 0);
    this.add(this.statusText);

    // Agent status indicators
    this.agentIndicators = scene.add.graphics();
    this.add(this.agentIndicators);
    this.updateAgentIndicators();

    scene.add.existing(this);
  }

  private updateAgentIndicators(): void {
    this.agentIndicators.clear();

    const agents = this.battle.agents;
    const indicatorSize = 6;
    const spacing = 10;
    const startX = -((agents.length - 1) * spacing) / 2;

    agents.forEach((agent, index) => {
      let color: number;
      switch (agent.status) {
        case 'working':
          color = 0xffff00; // Yellow
          break;
        case 'success':
          color = 0x00ff00; // Green
          break;
        case 'failed':
          color = 0xff0000; // Red
          break;
        case 'cancelled':
          color = 0x888888; // Gray
          break;
        default:
          color = 0x444444; // Dark gray
      }

      this.agentIndicators.fillStyle(color, 1);
      this.agentIndicators.fillCircle(startX + index * spacing, 55, indicatorSize / 2);
    });
  }

  setBattle(battle: Battle): void {
    this.battle = battle;
    this.updateAgentIndicators();
  }

  update(): void {
    this.updateAgentIndicators();
  }
}
