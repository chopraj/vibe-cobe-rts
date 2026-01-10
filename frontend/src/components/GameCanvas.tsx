import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config';
import { useGameStore } from '../stores/gameStore';
import { useStartBattle, useCancelBattle } from '../hooks/useBattles';
import { ConfirmDialog } from './ConfirmDialog';
import type { ArenaScene } from '../game/scenes/ArenaScene';
import type { Battle } from '../types';

interface CancelConfirmation {
  battleId: string;
  callback: (confirmed: boolean) => void;
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameCallbacksRef = useRef<{
    startBattle: (issueNumber: number) => void;
    getBattles: () => Battle[];
  }>({
    startBattle: () => {},
    getBattles: () => [],
  });
  const issues = useGameStore((state) => state.issues);
  const battles = useGameStore((state) => state.battles);
  const startBattle = useStartBattle();
  const cancelBattle = useCancelBattle();

  // State for cancel confirmation dialog
  const [cancelConfirmation, setCancelConfirmation] = useState<CancelConfirmation | null>(null);

  // Handle cancel confirmation
  const handleConfirmCancel = useCallback(() => {
    if (!cancelConfirmation) return;

    // Cancel the battle
    cancelBattle.mutate(cancelConfirmation.battleId, {
      onSuccess: () => {
        cancelConfirmation.callback(true);
        setCancelConfirmation(null);
      },
      onError: () => {
        cancelConfirmation.callback(false);
        setCancelConfirmation(null);
      },
    });
  }, [cancelConfirmation, cancelBattle]);

  const handleDenyCancel = useCallback(() => {
    if (cancelConfirmation) {
      cancelConfirmation.callback(false);
      setCancelConfirmation(null);
    }
  }, [cancelConfirmation]);

  // Keep gameCallbacksRef updated with current values to avoid stale closures
  useEffect(() => {
    gameCallbacksRef.current = {
      startBattle: (issueNumber: number) => startBattle.mutate(issueNumber),
      getBattles: () => battles,
    };
  }, [battles, startBattle]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create game
    const config = createGameConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);

    // Wait for game to be ready, then set up scene events
    gameRef.current.events.on('ready', () => {
      const arenaScene = gameRef.current?.scene.getScene('ArenaScene') as ArenaScene;
      if (!arenaScene) return;

      const setupGameEvents = () => {
        arenaScene.events.emit('setGameEvents', {
          onAttackIssue: (issueNumber: number) => {
            // Use ref to get current battles (avoids stale closure)
            const currentBattles = gameCallbacksRef.current.getBattles();
            const existingBattle = currentBattles.find(
              (b) =>
                b.issueNumber === issueNumber &&
                (b.status === 'pending' || b.status === 'fighting')
            );
            if (existingBattle) {
              console.log(`Already battling issue #${issueNumber}`);
              return;
            }

            // Use ref to call startBattle (avoids stale closure)
            gameCallbacksRef.current.startBattle(issueNumber);
          },
          onRequestCancelBattle: (battleId: string, callback: (confirmed: boolean) => void) => {
            setCancelConfirmation({ battleId, callback });
          },
        });
      };

      // If scene is already active, set up events now
      // Otherwise wait for the scene's create event
      if (arenaScene.scene.isActive()) {
        setupGameEvents();
      } else {
        arenaScene.events.once('create', setupGameEvents);
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
    <>
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
      <ConfirmDialog
        isOpen={cancelConfirmation !== null}
        title="Cancel Battle?"
        message="This will stop all AI agents working on this issue. The battle will be abandoned and you'll need to start over if you want to try again."
        confirmLabel="Cancel Battle"
        cancelLabel="Keep Fighting"
        onConfirm={handleConfirmCancel}
        onCancel={handleDenyCancel}
      />
    </>
  );
}
