import { useState } from 'react';
import type { Battle } from '../../types';
import { AgentCard } from './AgentCard';
import { useCancelBattle, useDismissBattle } from '../../hooks/useBattles';

interface BattleGroupProps {
  battle: Battle;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'PENDING', color: 'text-game-muted', bgColor: 'bg-game-muted/20' },
  fighting: { label: 'FIGHTING', color: 'text-game-warning', bgColor: 'bg-game-warning/20' },
  victory: { label: 'VICTORY', color: 'text-game-success', bgColor: 'bg-game-success/20' },
  defeat: { label: 'DEFEAT', color: 'text-game-error', bgColor: 'bg-game-error/20' },
};

export function BattleGroup({ battle }: BattleGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const cancelBattle = useCancelBattle();
  const { dismiss } = useDismissBattle();

  const statusConfig = STATUS_CONFIG[battle.status] ?? STATUS_CONFIG.pending;
  const isActive = battle.status === 'pending' || battle.status === 'fighting';
  const isFinished = battle.status === 'victory' || battle.status === 'defeat';

  // Count agents by status
  const workingCount = battle.agents.filter(a => a.status === 'working').length;
  const successCount = battle.agents.filter(a => a.status === 'success').length;
  const failedCount = battle.agents.filter(a => a.status === 'failed').length;

  return (
    <div className="border border-game-border rounded-lg bg-game-panel/50 overflow-hidden">
      {/* Issue header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-game-panel transition-colors"
      >
        {/* Collapse indicator */}
        <span className="text-game-muted text-xs">
          {collapsed ? '▶' : '▼'}
        </span>

        {/* Issue number */}
        <span className="text-game-accent font-bold">
          #{battle.issueNumber}
        </span>

        {/* Issue title */}
        <span className="flex-1 truncate text-sm">
          {battle.issueTitle.length > 30
            ? battle.issueTitle.slice(0, 30) + '...'
            : battle.issueTitle}
        </span>

        {/* Status badge */}
        <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.color} ${statusConfig.bgColor}`}>
          {statusConfig.label}
        </span>
      </button>

      {/* Agent summary when collapsed */}
      {collapsed && (
        <div className="px-4 py-2 border-t border-game-border text-xs text-game-muted flex gap-4">
          <span>{battle.agents.length} agents</span>
          {workingCount > 0 && <span className="text-game-warning">{workingCount} working</span>}
          {successCount > 0 && <span className="text-game-success">{successCount} done</span>}
          {failedCount > 0 && <span className="text-game-error">{failedCount} failed</span>}
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="border-t border-game-border">
          {/* Agent list */}
          <div className="p-4 space-y-4">
            {battle.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isWinner={agent.id === battle.winningAgentId}
                battleStatus={battle.status}
              />
            ))}
          </div>

          {/* Actions footer */}
          <div className="px-4 py-3 border-t border-game-border flex items-center gap-3 text-xs">
            {/* Time info */}
            <span className="text-game-muted flex-1">
              Started {new Date(battle.startedAt).toLocaleTimeString()}
              {battle.completedAt && (
                <> · Ended {new Date(battle.completedAt).toLocaleTimeString()}</>
              )}
            </span>

            {/* Action buttons */}
            {isActive && (
              <button
                onClick={() => cancelBattle.mutate(battle.id)}
                disabled={cancelBattle.isPending}
                className="px-2 py-1 text-game-error border border-game-error rounded hover:bg-game-error/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {battle.prUrl && (
              <a
                href={battle.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-game-success border border-game-success rounded hover:bg-game-success/20 transition-colors"
              >
                View PR
              </a>
            )}

            {isFinished && (
              <button
                onClick={() => dismiss(battle.id)}
                className="px-2 py-1 text-game-muted border border-game-border rounded hover:bg-game-panel transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
