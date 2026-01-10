import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class UIScene extends Phaser.Scene {
  private instructionsText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Add instructions at the bottom
    this.instructionsText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 30,
      'Left-click: Select units | Right-click: Move/Attack | Drag: Box select',
      {
        font: '14px monospace',
        color: '#888888',
      }
    );
    this.instructionsText.setOrigin(0.5, 0.5);

    // Add title
    const title = this.add.text(GAME_WIDTH / 2, 20, 'RTS Issue Battle', {
      font: 'bold 24px monospace',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0);
  }
}
