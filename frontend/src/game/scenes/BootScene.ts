import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder sprites programmatically
    this.createPlaceholderSprites();
  }

  private createPlaceholderSprites(): void {
    // Create unit sprite (blue square with border)
    const unitGraphics = this.make.graphics({ x: 0, y: 0 });
    unitGraphics.fillStyle(0x4444ff, 1);
    unitGraphics.fillRect(0, 0, 24, 24);
    unitGraphics.lineStyle(2, 0x6666ff);
    unitGraphics.strokeRect(0, 0, 24, 24);
    unitGraphics.generateTexture('unit', 24, 24);
    unitGraphics.destroy();

    // Create unit selected sprite (blue square with gold border)
    const unitSelectedGraphics = this.make.graphics({ x: 0, y: 0 });
    unitSelectedGraphics.fillStyle(0x4444ff, 1);
    unitSelectedGraphics.fillRect(0, 0, 24, 24);
    unitSelectedGraphics.lineStyle(3, 0xffdd00);
    unitSelectedGraphics.strokeRect(0, 0, 24, 24);
    unitSelectedGraphics.generateTexture('unit-selected', 24, 24);
    unitSelectedGraphics.destroy();

    // Create issue enemy sprite (red bug-like shape)
    const issueGraphics = this.make.graphics({ x: 0, y: 0 });
    issueGraphics.fillStyle(0xff4444, 1);
    issueGraphics.fillCircle(16, 16, 14);
    issueGraphics.fillStyle(0xaa2222, 1);
    issueGraphics.fillCircle(12, 12, 4);
    issueGraphics.fillCircle(20, 12, 4);
    issueGraphics.generateTexture('issue', 32, 32);
    issueGraphics.destroy();

    // Create battle effect sprite (yellow burst)
    const battleGraphics = this.make.graphics({ x: 0, y: 0 });
    battleGraphics.fillStyle(0xffff00, 0.8);
    battleGraphics.fillCircle(24, 24, 20);
    battleGraphics.fillStyle(0xffaa00, 0.6);
    battleGraphics.fillCircle(24, 24, 12);
    battleGraphics.generateTexture('battle-effect', 48, 48);
    battleGraphics.destroy();

    // Create victory effect (green burst)
    const victoryGraphics = this.make.graphics({ x: 0, y: 0 });
    victoryGraphics.fillStyle(0x00ff00, 1);
    victoryGraphics.fillCircle(24, 24, 20);
    victoryGraphics.fillStyle(0x88ff88, 0.8);
    victoryGraphics.fillCircle(24, 24, 10);
    victoryGraphics.generateTexture('victory-effect', 48, 48);
    victoryGraphics.destroy();

    // Create defeat effect (red X)
    const defeatGraphics = this.make.graphics({ x: 0, y: 0 });
    defeatGraphics.lineStyle(4, 0xff0000);
    defeatGraphics.lineBetween(8, 8, 40, 40);
    defeatGraphics.lineBetween(40, 8, 8, 40);
    defeatGraphics.generateTexture('defeat-effect', 48, 48);
    defeatGraphics.destroy();
  }

  create(): void {
    this.scene.start('ArenaScene');
    this.scene.start('UIScene');
  }
}
