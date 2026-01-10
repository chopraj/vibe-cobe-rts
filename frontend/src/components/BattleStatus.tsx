import { useBattles, useCancelBattle, useDismissBattle } from '../hooks/useBattles';
import type { Battle, AgentStatus } from '../types';

// =============================================================================
// BATTLE STATUS
// =============================================================================
// Displays active and completed battles in a fixed sidebar.

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-game-muted',
  fighting: 'text-game-warning',
  victory: 'text-game-success',
  defeat: 'text-game-error',
};

const AGENT_COLORS: Record<AgentStatus, string> = {
  pending: 'bg-gray-700',
  working: 'bg-game-warning',
  success: 'bg-game-success',
  failed: 'bg-game-error',
  cancelled: 'bg-game-muted',
};

export function BattleStatus() {
  const { data: battles = [] } = useBattles();
  const cancelBattle = useCancelBattle();
  const { dismiss, clearFinished } = useDismissBattle();

  if (battles.length === 0) return null;

  const hasFinished = battles.some(
    (b) => b.status === 'victory' || b.status === 'defeat'
  );

  return (
    <div className="fixed top-4 right-4 w-72 max-h-[calc(100vh-2rem)] overflow-auto bg-game-bg/95 border border-game-border rounded-lg p-4 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white text-sm font-mono m-0">Battles</h3>
        {hasFinished && (
          <button
            onClick={clearFinished}
            className="px-2 py-1 text-[10px] font-mono bg-transparent border border-game-muted rounded text-game-muted hover:text-white hover:border-white transition-colors"
          >
            Clear Finished
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {battles.map((battle) => (
          <BattleCard
            key={battle.id}
            battle={battle}
            onCancel={() => cancelBattle.mutate(battle.id)}
            onDismiss={() => dismiss(battle.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface BattleCardProps {
  battle: Battle;
  onCancel: () => void;
  onDismiss: () => void;
}

function BattleCard({ battle, onCancel, onDismiss }: BattleCardProps) {
  const isFinished = battle.status === 'victory' || battle.status === 'defeat';

  return (
    <div className="bg-game-panel border border-game-border rounded-md p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-game-accent text-sm font-mono font-bold">
          #{battle.issueNumber}
        </span>
        <span className={`text-[10px] font-mono font-bold ${STATUS_COLORS[battle.status]}`}>
          {battle.status.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <p className="text-gray-400 text-xs font-mono leading-relaxed mb-3 m-0">
        {battle.issueTitle.length > 50
          ? battle.issueTitle.slice(0, 50) + '...'
          : battle.issueTitle}
      </p>

      {/* Agent status dots */}
      <div className="flex flex-wrap gap-1 mb-3">
        {battle.agents.map((agent) => (
          <div
            key={agent.id}
            className={`w-3 h-3 rounded-full ${AGENT_COLORS[agent.status]}`}
            title={`Agent ${agent.unitIndex}: ${agent.status}`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {battle.status === 'fighting' && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[11px] font-mono bg-transparent border border-game-error rounded text-game-error hover:bg-game-error/10 transition-colors"
          >
            Cancel
          </button>
        )}

        {battle.prUrl && (
          <a
            href={battle.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-3 py-1.5 text-[11px] font-mono bg-green-700 rounded text-white no-underline hover:bg-green-600 transition-colors"
          >
            View PR
          </a>
        )}

        {isFinished && (
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-[11px] font-mono bg-transparent border border-game-muted rounded text-game-muted hover:text-white hover:border-white transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
