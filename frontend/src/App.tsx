import { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { RepoSetup } from './components/RepoSetup';
import { BattlePanel } from './components/BattlePanel';
import { useGameStore } from './stores/gameStore';
import { useConfig, useIssues } from './hooks/useGitHub';

// =============================================================================
// APP
// =============================================================================
// Main application component. Orchestrates game canvas and UI overlays.

function App() {
  const showSetup = useGameStore((state) => state.showSetup);
  const setShowSetup = useGameStore((state) => state.setShowSetup);
  const config = useGameStore((state) => state.config);

  const { isLoading: configLoading } = useConfig();
  const { isLoading: issuesLoading, error: issuesError } = useIssues();

  // Show setup if not configured
  useEffect(() => {
    if (!configLoading && !config) {
      setShowSetup(true);
    }
  }, [configLoading, config, setShowSetup]);

  if (configLoading) {
    return (
      <div className="w-screen h-screen flex justify-center items-center text-white font-mono text-lg">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex">
      {showSetup && <RepoSetup onClose={() => setShowSetup(false)} />}

      {config && (
        <>
          {/* Game area */}
          <div className="flex-1 min-w-0 relative">
            <GameCanvas />

            {/* Config info bar */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 bg-game-bg/90 border border-game-border rounded-md text-game-muted font-mono text-xs z-50">
              <span>{config.owner}/{config.repo}</span>
              <button
                onClick={() => setShowSetup(true)}
                className="px-2 py-1 text-[10px] font-mono bg-transparent border border-game-muted rounded text-game-muted cursor-pointer hover:text-white hover:border-white transition-colors"
              >
                Change
              </button>
            </div>

            {/* Loading/error states */}
            {issuesLoading && (
              <div className="absolute bottom-14 left-4 px-3 py-2 bg-game-bg/90 border border-game-border rounded-md text-game-muted font-mono text-xs z-50">
                Loading issues...
              </div>
            )}
            {issuesError && (
              <div className="absolute bottom-14 left-4 px-3 py-2 bg-game-bg/90 border border-game-border rounded-md text-game-error font-mono text-xs z-50">
                Error: {issuesError.message}
              </div>
            )}
          </div>

          {/* Battle panel */}
          <BattlePanel />
        </>
      )}
    </div>
  );
}

export default App;
