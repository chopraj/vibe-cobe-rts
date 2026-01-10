import Phaser from 'phaser';
import { COLORS, SPRITE_SIZES } from '../../constants';

// =============================================================================
// BOOT SCENE
// =============================================================================
// Generates all game sprites programmatically and shows a loading screen.

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.createSprites();
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

  private createSprites(): void {
    const { unit, enemy, battleEffect } = SPRITE_SIZES;

    // Unit sprite (blue square)
    const unitG = this.make.graphics({ x: 0, y: 0 });
    unitG.fillStyle(COLORS.unit, 1);
    unitG.fillRect(0, 0, unit, unit);
    unitG.lineStyle(2, COLORS.unitBorder);
    unitG.strokeRect(0, 0, unit, unit);
    unitG.generateTexture('unit', unit, unit);
    unitG.destroy();

    // Unit selected sprite (blue with gold border)
    const unitSelG = this.make.graphics({ x: 0, y: 0 });
    unitSelG.fillStyle(COLORS.unit, 1);
    unitSelG.fillRect(0, 0, unit, unit);
    unitSelG.lineStyle(3, COLORS.unitSelectedBorder);
    unitSelG.strokeRect(0, 0, unit, unit);
    unitSelG.generateTexture('unit-selected', unit, unit);
    unitSelG.destroy();

    // Issue enemy sprite (red circle with eyes)
    const issueG = this.make.graphics({ x: 0, y: 0 });
    issueG.fillStyle(COLORS.enemy, 1);
    issueG.fillCircle(enemy / 2, enemy / 2, enemy / 2 - 2);
    issueG.fillStyle(COLORS.enemyDark, 1);
    issueG.fillCircle(enemy / 2 - 4, enemy / 2 - 4, 4);
    issueG.fillCircle(enemy / 2 + 4, enemy / 2 - 4, 4);
    issueG.generateTexture('issue', enemy, enemy);
    issueG.destroy();

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
    this.scene.start('ArenaScene');
    this.scene.start('UIScene');
  }
}
