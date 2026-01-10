import { useGameStore } from '../stores/gameStore';
import { useCancelBattle } from '../hooks/useBattles';
import type { Battle, AgentStatus } from '../types';

export function BattleStatus() {
  const battles = useGameStore((state) => state.battles);
  const cancelBattle = useCancelBattle();

  if (battles.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Active Battles</h3>
      <div style={styles.battleList}>
        {battles.map((battle) => (
          <BattleCard
            key={battle.id}
            battle={battle}
            onCancel={() => cancelBattle.mutate(battle.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface BattleCardProps {
  battle: Battle;
  onCancel: () => void;
}

function BattleCard({ battle, onCancel }: BattleCardProps) {
  const statusColors: Record<string, string> = {
    pending: '#888',
    fighting: '#ffff00',
    victory: '#00ff00',
    defeat: '#ff4444',
  };

  const agentStatusColors: Record<AgentStatus, string> = {
    pending: '#444',
    working: '#ffff00',
    success: '#00ff00',
    failed: '#ff4444',
    cancelled: '#888',
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.issueNumber}>#{battle.issueNumber}</span>
        <span style={{ ...styles.status, color: statusColors[battle.status] }}>
          {battle.status.toUpperCase()}
        </span>
      </div>

      <p style={styles.issueTitle}>
        {battle.issueTitle.length > 50
          ? battle.issueTitle.slice(0, 50) + '...'
          : battle.issueTitle}
      </p>

      <div style={styles.agentGrid}>
        {battle.agents.map((agent) => (
          <div
            key={agent.id}
            style={{
              ...styles.agentDot,
              backgroundColor: agentStatusColors[agent.status],
            }}
            title={`Agent ${agent.unitIndex}: ${agent.status}`}
          />
        ))}
      </div>

      {battle.status === 'fighting' && (
        <button onClick={onCancel} style={styles.cancelButton}>
          Cancel
        </button>
      )}

      {battle.prUrl && (
        <a
          href={battle.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.prLink}
        >
          View PR
        </a>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    width: 280,
    maxHeight: 'calc(100vh - 32px)',
    overflow: 'auto',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    border: '1px solid #4a4a6e',
    borderRadius: 8,
    padding: 16,
    zIndex: 100,
  },
  title: {
    margin: '0 0 12px 0',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  battleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    backgroundColor: '#2a2a4e',
    border: '1px solid #4a4a6e',
    borderRadius: 6,
    padding: 12,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueNumber: {
    color: '#6666ff',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  status: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  issueTitle: {
    margin: '0 0 12px 0',
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 1.4,
  },
  agentGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  agentDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  cancelButton: {
    padding: '6px 12px',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: 'transparent',
    border: '1px solid #ff4444',
    borderRadius: 4,
    color: '#ff4444',
    cursor: 'pointer',
  },
  prLink: {
    display: 'inline-block',
    padding: '6px 12px',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: '#00aa00',
    borderRadius: 4,
    color: '#fff',
    textDecoration: 'none',
  },
};
