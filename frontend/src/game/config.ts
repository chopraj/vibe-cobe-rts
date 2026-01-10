import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ArenaScene } from './scenes/ArenaScene';
import { UIScene } from './scenes/UIScene';

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, ArenaScene, UIScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
