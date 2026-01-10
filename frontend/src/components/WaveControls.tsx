import { useGameStore } from '../stores/gameStore';
import { useIssues } from '../hooks/useGitHub';
import { ISSUES_PER_WAVE } from '../constants';

// =============================================================================
// WAVE CONTROLS
// =============================================================================
// UI component for wave-based issue spawning. Displays current wave and
// provides button to advance to next wave.

export function WaveControls() {
  const { data: issues = [] } = useIssues();
  const currentWave = useGameStore((state) => state.currentWave);
  const nextWave = useGameStore((state) => state.nextWave);

  const totalWaves = Math.ceil(issues.length / ISSUES_PER_WAVE);
  const remainingIssues = Math.max(
    0,
    issues.length - (currentWave + 1) * ISSUES_PER_WAVE
  );
  const isLastWave = currentWave >= totalWaves - 1;

  // Don't render if no issues
  if (issues.length === 0) return null;

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
      {/* Wave indicator */}
      <div className="px-3 py-2 bg-game-bg/90 border border-game-border rounded-md text-center">
        <div className="text-white font-mono text-sm font-bold">
          Wave {currentWave + 1}
        </div>
        <div className="text-game-muted font-mono text-[10px]">
          {remainingIssues > 0
            ? `${remainingIssues} more issue${remainingIssues === 1 ? '' : 's'}`
            : 'Final wave'}
        </div>
      </div>

      {/* Next Wave button */}
      <button
        onClick={nextWave}
        disabled={isLastWave}
        className="px-3 py-2 text-sm font-mono bg-transparent border border-game-muted rounded text-game-muted hover:text-white hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next Wave
      </button>
    </div>
  );
}
