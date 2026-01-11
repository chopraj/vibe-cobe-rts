import { useBattles, useDismissBattle } from '../../hooks/useBattles';
import { BattleGroup } from './BattleGroup';

export function BattlePanel() {
  const { data: battles = [], isLoading } = useBattles();
  const { clearFinished } = useDismissBattle();

  // Sort battles: active first, then by start time (newest first)
  const sortedBattles = [...battles].sort((a, b) => {
    const aActive = a.status === 'pending' || a.status === 'fighting';
    const bActive = b.status === 'pending' || b.status === 'fighting';
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  const activeBattles = sortedBattles.filter(
    b => b.status === 'pending' || b.status === 'fighting'
  );
  const finishedBattles = sortedBattles.filter(
    b => b.status === 'victory' || b.status === 'defeat'
  );

  return (
    <div className="w-80 min-w-80 flex-shrink-0 h-full bg-game-bg border-l border-game-border flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-game-border flex items-center justify-between">
        <h2 className="text-lg font-bold">Battles</h2>
        {finishedBattles.length > 0 && (
          <button
            onClick={clearFinished}
            className="text-xs text-game-muted hover:text-white transition-colors"
          >
            Clear finished
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isLoading && (
          <div className="text-center text-game-muted py-8">
            Loading...
          </div>
        )}

        {!isLoading && battles.length === 0 && (
          <div className="text-center text-game-muted py-8">
            <div className="text-2xl mb-2">⚔</div>
            <div>No active battles</div>
            <div className="text-xs mt-1">
              Select units and right-click an issue to attack
            </div>
          </div>
        )}

        {/* Active battles section */}
        {activeBattles.length > 0 && (
          <div className="space-y-4">
            <div className="text-xs text-game-muted uppercase tracking-wide">
              Active ({activeBattles.length})
            </div>
            {activeBattles.map((battle) => (
              <BattleGroup key={battle.id} battle={battle} />
            ))}
          </div>
        )}

        {/* Finished battles section */}
        {finishedBattles.length > 0 && (
          <div className="space-y-4">
            <div className="text-xs text-game-muted uppercase tracking-wide">
              Finished ({finishedBattles.length})
            </div>
            {finishedBattles.map((battle) => (
              <BattleGroup key={battle.id} battle={battle} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {battles.length > 0 && (
        <div className="px-5 py-3 border-t border-game-border text-xs text-game-muted flex justify-between">
          <span>
            {battles.reduce((sum, b) => sum + b.agents.length, 0)} total agents
          </span>
          <span>
            {battles.filter(b => b.status === 'victory').length}W / {battles.filter(b => b.status === 'defeat').length}L
          </span>
        </div>
      )}
    </div>
  );
}

// Re-export sub-components
export { AgentCard } from './AgentCard';
export { BattleGroup } from './BattleGroup';
