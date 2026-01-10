import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config';
import { useStartBattle, useCancelBattle, useBattles } from '../hooks/useBattles';
import { useIssues } from '../hooks/useGitHub';
import { ConfirmDialog } from './ConfirmDialog';
import type { ArenaScene, GameCallbacks } from '../game/scenes/ArenaScene';

// =============================================================================
// GAME CANVAS
// =============================================================================
// Bridge between React and Phaser. Handles:
// - Game lifecycle (create/destroy)
// - Data sync (issues/battles from React Query → Phaser)
// - Callbacks (battle actions from Phaser → React mutations)

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Data from React Query (single source of truth)
  const { data: issues = [] } = useIssues();
  const { data: battles = [] } = useBattles();
  const startBattle = useStartBattle();
  const cancelBattle = useCancelBattle();

  // Cancel confirmation dialog state
  const [pendingCancel, setPendingCancel] = useState<{
    battleId: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  // Handle cancel confirmation
  const handleConfirmCancel = useCallback(() => {
    if (!pendingCancel) return;
    cancelBattle.mutate(pendingCancel.battleId, {
      onSuccess: () => {
        pendingCancel.resolve(true);
        setPendingCancel(null);
      },
      onError: () => {
        pendingCancel.resolve(false);
        setPendingCancel(null);
      },
    });
  }, [pendingCancel, cancelBattle]);

  const handleDenyCancel = useCallback(() => {
    pendingCancel?.resolve(false);
    setPendingCancel(null);
  }, [pendingCancel]);

  // Get scene helper
  const getScene = useCallback((): ArenaScene | null => {
    return gameRef.current?.scene.getScene('ArenaScene') as ArenaScene | null;
  }, []);

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createGameConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Set up callbacks when scene is ready
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const callbacks: GameCallbacks = {
      onAttackIssue: (issueNumber: number, unitCount: number) => {
        // Check for existing active battle
        const existing = battles.find(
          (b) =>
            b.issueNumber === issueNumber &&
            (b.status === 'pending' || b.status === 'fighting')
        );
        if (!existing) {
          startBattle.mutate({ issueNumber, unitCount });
        }
      },
      onRequestCancelBattle: (battleId: string) => {
        return new Promise<boolean>((resolve) => {
          setPendingCancel({ battleId, resolve });
        });
      },
    };

    const setupCallbacks = () => {
      const scene = getScene();
      if (scene?.scene.isActive()) {
        scene.setCallbacks(callbacks);
      }
    };

    // Wait for game to be ready, then wait for scene to be created
    const onGameReady = () => {
      const scene = getScene();
      if (scene) {
        // If scene is already active, set up now
        if (scene.scene.isActive()) {
          setupCallbacks();
        } else {
          // Otherwise wait for scene's create event
          scene.events.once('create', setupCallbacks);
        }
      }
    };

    game.events.once('ready', onGameReady);
    // Also try immediately if game is already running
    if (game.isRunning) onGameReady();

    return () => {
      game.events.off('ready', onGameReady);
    };
  }, [battles, startBattle, getScene]);

  // Sync issues to Phaser
  useEffect(() => {
    const scene = getScene();
    if (scene?.scene.isActive()) {
      scene.updateIssues(issues);
    }
  }, [issues, getScene]);

  // Sync battles to Phaser
  useEffect(() => {
    const scene = getScene();
    if (scene?.scene.isActive()) {
      scene.updateBattles(battles);
    }
  }, [battles, getScene]);

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full flex justify-center items-center"
      />
      <ConfirmDialog
        isOpen={pendingCancel !== null}
        title="Cancel Battle?"
        message="This will stop all AI agents working on this issue."
        confirmLabel="Cancel Battle"
        cancelLabel="Keep Fighting"
        onConfirm={handleConfirmCancel}
        onCancel={handleDenyCancel}
      />
    </>
  );
}
