import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config';
import { useGameStore } from '../stores/gameStore';
import { useStartBattle } from '../hooks/useBattles';
import type { ArenaScene } from '../game/scenes/ArenaScene';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const issues = useGameStore((state) => state.issues);
  const battles = useGameStore((state) => state.battles);
  const startBattle = useStartBattle();

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create game
    const config = createGameConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);

    // Set up game events after scene is ready
    gameRef.current.events.on('ready', () => {
      const arenaScene = gameRef.current?.scene.getScene('ArenaScene') as ArenaScene;
      if (arenaScene) {
        arenaScene.events.emit('setGameEvents', {
          onAttackIssue: (issueNumber: number) => {
            // Check if already battling this issue
            const existingBattle = battles.find(
              (b) =>
                b.issueNumber === issueNumber &&
                (b.status === 'pending' || b.status === 'fighting')
            );
            if (existingBattle) {
              console.log(`Already battling issue #${issueNumber}`);
              return;
            }

            // Start new battle
            startBattle.mutate(issueNumber);
          },
        });
      }
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Update issues in game
  useEffect(() => {
    const arenaScene = gameRef.current?.scene.getScene('ArenaScene') as ArenaScene;
    if (arenaScene && arenaScene.scene.isActive()) {
      arenaScene.events.emit('updateIssues', issues);
    }
  }, [issues]);

  // Update battles in game
  useEffect(() => {
    const arenaScene = gameRef.current?.scene.getScene('ArenaScene') as ArenaScene;
    if (arenaScene && arenaScene.scene.isActive()) {
      arenaScene.events.emit('updateBattles', battles);
    }
  }, [battles]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  );
}
