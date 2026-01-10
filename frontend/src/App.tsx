import { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { RepoSetup } from './components/RepoSetup';
import { BattleStatus } from './components/BattleStatus';
import { useGameStore } from './stores/gameStore';
import { useConfig, useIssues } from './hooks/useGitHub';
import { useBattles } from './hooks/useBattles';

function App() {
  const showSetup = useGameStore((state) => state.showSetup);
  const setShowSetup = useGameStore((state) => state.setShowSetup);
  const config = useGameStore((state) => state.config);

  // Fetch initial config
  const { isLoading: configLoading } = useConfig();

  // Fetch issues when configured
  const { isLoading: issuesLoading, error: issuesError } = useIssues();

  // Poll battles
  useBattles();

  // Show setup if not configured after loading
  useEffect(() => {
    if (!configLoading && !config) {
      setShowSetup(true);
    }
  }, [configLoading, config, setShowSetup]);

  if (configLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {showSetup && <RepoSetup onClose={() => setShowSetup(false)} />}

      {config && (
        <>
          <GameCanvas />
          <BattleStatus />

          {/* Config info */}
          <div style={styles.configInfo}>
            <span>
              {config.owner}/{config.repo}
            </span>
            <button
              onClick={() => setShowSetup(true)}
              style={styles.configButton}
            >
              Change
            </button>
          </div>

          {/* Loading/error states */}
          {issuesLoading && (
            <div style={styles.statusBar}>Loading issues...</div>
          )}
          {issuesError && (
            <div style={{ ...styles.statusBar, color: '#ff4444' }}>
              Error loading issues: {issuesError.message}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
  },
  loading: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 18,
  },
  configInfo: {
    position: 'fixed',
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    border: '1px solid #4a4a6e',
    borderRadius: 6,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    zIndex: 100,
  },
  configButton: {
    padding: '4px 8px',
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: 'transparent',
    border: '1px solid #666',
    borderRadius: 4,
    color: '#888',
    cursor: 'pointer',
  },
  statusBar: {
    position: 'fixed',
    bottom: 60,
    left: 16,
    padding: '8px 12px',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    border: '1px solid #4a4a6e',
    borderRadius: 6,
    color: '#888',
    fontFamily: 'monospace',
    fontSize: 12,
    zIndex: 100,
  },
};

export default App;
