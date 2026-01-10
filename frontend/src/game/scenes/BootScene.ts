import Phaser from 'phaser';
import { COLORS, SPRITE_SIZES } from '../../constants';

// =============================================================================
// BOOT SCENE
// =============================================================================
// Loads sprite assets and generates procedural textures.

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.loadSprites();
  }

  private loadSprites(): void {
    this.load.spritesheet('agent', 'assets/sprites/agent.png', {
      frameWidth: 704,
      frameHeight: 1536,
    });
    this.load.spritesheet('issue-sprite', 'assets/sprites/issue.png', {
      frameWidth: 704,
      frameHeight: 1536,
    });
  }

  private createLoadingScreen(): void {
    const { width, height } = this.cameras.main;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(COLORS.loadingBg, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.loadingBar, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  private createProceduralTextures(): void {
    const { battleEffect } = SPRITE_SIZES;

    const selectionWidth = 48;
    const selectionHeight = 24;
    const selectionG = this.make.graphics({ x: 0, y: 0 });
    selectionG.fillStyle(COLORS.unitSelectedBorder, 0.4);
    selectionG.fillEllipse(selectionWidth / 2, selectionHeight / 2, selectionWidth, selectionHeight);
    selectionG.generateTexture('selection-circle', selectionWidth, selectionHeight);
    selectionG.destroy();

    // Battle effect sprite (yellow burst)
    const battleG = this.make.graphics({ x: 0, y: 0 });
    battleG.fillStyle(COLORS.battle, 0.8);
    battleG.fillCircle(battleEffect / 2, battleEffect / 2, 20);
    battleG.fillStyle(COLORS.battleInner, 0.6);
    battleG.fillCircle(battleEffect / 2, battleEffect / 2, 12);
    battleG.generateTexture('battle-effect', battleEffect, battleEffect);
    battleG.destroy();

    // Victory effect (green burst)
    const victoryG = this.make.graphics({ x: 0, y: 0 });
    victoryG.fillStyle(COLORS.victory, 1);
    victoryG.fillCircle(battleEffect / 2, battleEffect / 2, 20);
    victoryG.fillStyle(COLORS.victoryInner, 0.8);
    victoryG.fillCircle(battleEffect / 2, battleEffect / 2, 10);
    victoryG.generateTexture('victory-effect', battleEffect, battleEffect);
    victoryG.destroy();

    // Defeat effect (red X)
    const defeatG = this.make.graphics({ x: 0, y: 0 });
    defeatG.lineStyle(4, COLORS.defeat);
    defeatG.lineBetween(8, 8, battleEffect - 8, battleEffect - 8);
    defeatG.lineBetween(battleEffect - 8, 8, 8, battleEffect - 8);
    defeatG.generateTexture('defeat-effect', battleEffect, battleEffect);
    defeatG.destroy();
  }

  create(): void {
    // Generate procedural textures after assets are loaded
    this.createProceduralTextures();

    this.scene.start('ArenaScene');
    this.scene.start('UIScene');
  }
}
