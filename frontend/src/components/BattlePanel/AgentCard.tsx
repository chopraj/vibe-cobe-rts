import { useState } from 'react';
import type { AgentInstance, AgentActivity, BattleStatus } from '../../types';

interface AgentCardProps {
  agent: AgentInstance;
  isWinner: boolean;
  battleStatus: BattleStatus;
}

// Activity to display info mapping
const ACTIVITY_CONFIG: Record<AgentActivity, { icon: string; label: string; color: string }> = {
  initializing: { icon: '○', label: 'Initializing', color: 'text-game-muted' },
  thinking: { icon: '◐', label: 'Thinking', color: 'text-game-warning' },
  tool_running: { icon: '⚙', label: 'Running tool', color: 'text-game-accent' },
  responding: { icon: '◐', label: 'Responding', color: 'text-game-warning' },
  waiting_permission: { icon: '⚠', label: 'Needs input', color: 'text-orange-400' },
  retrying: { icon: '↻', label: 'Retrying', color: 'text-game-warning' },
  idle: { icon: '○', label: 'Idle', color: 'text-game-muted' },
  completed: { icon: '✓', label: 'Completed', color: 'text-game-success' },
};

// Agent status to icon mapping
const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  pending: { icon: '○', color: 'text-game-muted', label: 'pending' },
  working: { icon: '◐', color: 'text-game-warning', label: 'working' },
  success: { icon: '✓', color: 'text-game-success', label: 'success' },
  failed: { icon: '✗', color: 'text-game-error', label: 'failed' },
  cancelled: { icon: '⊘', color: 'text-game-muted', label: 'cancelled' },
  lost: { icon: '−', color: 'text-game-muted', label: 'lost' },
};

export function AgentCard({ agent, isWinner, battleStatus }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const state = agent.detailedState;

  // Determine display based on detailed state or fallback to status
  const activity = state?.activity ?? 'idle';
  const activityConfig = ACTIVITY_CONFIG[activity] ?? ACTIVITY_CONFIG.idle;

  // Determine effective status: if battle won and this agent isn't winner, show "lost"
  const isTerminal = agent.status === 'success' || agent.status === 'failed' || agent.status === 'cancelled';
  const effectiveStatus = (battleStatus === 'victory' && !isWinner && isTerminal)
    ? 'lost'
    : agent.status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.pending;

  // Use activity config for working agents, status config for terminal states
  const displayIcon = isTerminal ? statusConfig.icon : activityConfig.icon;
  const displayColor = isTerminal ? statusConfig.color : activityConfig.color;
  const displayLabel = isTerminal ? statusConfig.label : activityConfig.label;

  // Calculate total tokens
  const totalTokens = state ? state.tokens.input + state.tokens.output : 0;

  return (
    <div className="border border-game-border rounded bg-game-bg/50">
      {/* Summary row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-game-panel/50 transition-colors"
      >
        {/* Expand indicator */}
        <span className="text-game-muted text-xs">
          {expanded ? '▼' : '▶'}
        </span>

        {/* Status icon */}
        <span className={`${displayColor} text-sm`}>
          {displayIcon}
        </span>

        {/* Agent label */}
        <span className="text-sm flex-1">
          Unit {agent.unitIndex + 1}
          {isWinner && <span className="ml-1" title="Winner">🏆</span>}
        </span>

        {/* Activity label */}
        <span className={`text-xs ${displayColor}`}>
          {displayLabel}
        </span>

        {/* Token count */}
        {totalTokens > 0 && (
          <span className="text-xs text-game-muted">
            {totalTokens.toLocaleString()}t
          </span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && state && (
        <div className="px-4 py-3 border-t border-game-border text-xs space-y-3">
          {/* Current tool */}
          {state.currentTool && (
            <div className="flex justify-between">
              <span className="text-game-muted">Tool:</span>
              <span className="text-game-accent">{state.currentToolTitle || state.currentTool}</span>
            </div>
          )}

          {/* Token breakdown */}
          <div className="flex justify-between">
            <span className="text-game-muted">Tokens:</span>
            <span>
              <span className="text-game-success">{state.tokens.input.toLocaleString()}</span>
              {' / '}
              <span className="text-game-warning">{state.tokens.output.toLocaleString()}</span>
              {state.tokens.reasoning > 0 && (
                <>
                  {' / '}
                  <span className="text-game-accent">{state.tokens.reasoning.toLocaleString()}</span>
                </>
              )}
            </span>
          </div>

          {/* Steps completed */}
          <div className="flex justify-between">
            <span className="text-game-muted">Steps:</span>
            <span>{state.stepsCompleted}</span>
          </div>

          {/* Files modified */}
          {state.filesModified.length > 0 && (
            <div>
              <div className="flex justify-between">
                <span className="text-game-muted">Files:</span>
                <span>
                  {state.filesModified.length} modified
                  {(state.linesAdded > 0 || state.linesDeleted > 0) && (
                    <span className="ml-1">
                      (<span className="text-game-success">+{state.linesAdded}</span>
                      {' / '}
                      <span className="text-game-error">-{state.linesDeleted}</span>)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 text-game-muted truncate">
                {state.filesModified.slice(0, 3).map((f) => f.split('/').pop()).join(', ')}
                {state.filesModified.length > 3 && ` +${state.filesModified.length - 3} more`}
              </div>
            </div>
          )}

          {/* Todos progress */}
          {state.todos.length > 0 && (
            <div>
              <div className="flex justify-between">
                <span className="text-game-muted">Todos:</span>
                <span>
                  {state.todos.filter(t => t.status === 'completed').length} / {state.todos.length}
                </span>
              </div>
              <div className="mt-1 h-1 bg-game-border rounded overflow-hidden">
                <div
                  className="h-full bg-game-success transition-all"
                  style={{
                    width: `${(state.todos.filter(t => t.status === 'completed').length / state.todos.length) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {state.errorCount > 0 && (
            <div className="flex justify-between text-game-error">
              <span>Errors:</span>
              <span>{state.errorCount} ({state.retryCount} retries)</span>
            </div>
          )}

          {state.lastError && (
            <div className="text-game-error bg-game-error/10 p-2 rounded text-xs">
              {typeof state.lastError === 'string'
                ? state.lastError
                : (state.lastError as Error)?.message || JSON.stringify(state.lastError)}
            </div>
          )}

          {/* Permission alert */}
          {state.pendingPermission && (
            <div className="bg-orange-500/20 border border-orange-500/50 p-2 rounded">
              <div className="flex items-center gap-1 text-orange-400">
                <span>⚠</span>
                <span className="font-bold">Needs Permission</span>
              </div>
              <div className="mt-1 text-orange-300">
                {state.pendingPermission.title}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded but no detailed state */}
      {expanded && !state && (
        <div className="px-4 py-3 border-t border-game-border text-xs text-game-muted">
          No detailed state available
        </div>
      )}

      {/* Error display for failed agents - only show when expanded */}
      {expanded && agent.error && (
        <div className="px-4 py-3 border-t border-game-border text-xs text-game-error">
          {typeof agent.error === 'string' && agent.error !== '[object Object]'
            ? agent.error
            : (agent.error as Error)?.message || 'An error occurred'}
        </div>
      )}
    </div>
  );
}
