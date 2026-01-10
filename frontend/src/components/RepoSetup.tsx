import { useState } from 'react';
import { useSetConfig } from '../hooks/useGitHub';

// =============================================================================
// REPO SETUP
// =============================================================================
// Modal for configuring the GitHub repository connection.

interface RepoSetupProps {
  onClose: () => void;
}

export function RepoSetup({ onClose }: RepoSetupProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [unitCount, setUnitCount] = useState(10);
  const setConfig = useSetConfig();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig.mutate({ repoUrl, pat, unitCount }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[1000]">
      <div className="bg-game-bg border-2 border-game-border rounded-lg p-8 max-w-md w-[90%]">
        <h2 className="text-white text-2xl font-mono mb-6 m-0">
          Configure Repository
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="GitHub Repository URL">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              required
              className="w-full px-3 py-2.5 text-sm font-mono bg-game-panel border border-game-border rounded text-white placeholder:text-gray-500 focus:outline-none focus:border-game-accent"
            />
          </Field>

          <Field
            label="Personal Access Token"
            hint="Needs repo scope for private repos, or public_repo for public repos"
          >
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              required
              className="w-full px-3 py-2.5 text-sm font-mono bg-game-panel border border-game-border rounded text-white placeholder:text-gray-500 focus:outline-none focus:border-game-accent"
            />
          </Field>

          <Field
            label="Unit Count (parallel agents)"
            hint="Number of OpenCode agents to spawn per battle (1-20)"
          >
            <input
              type="number"
              value={unitCount}
              onChange={(e) => setUnitCount(parseInt(e.target.value) || 10)}
              min={1}
              max={20}
              className="w-full px-3 py-2.5 text-sm font-mono bg-game-panel border border-game-border rounded text-white focus:outline-none focus:border-game-accent"
            />
          </Field>

          {setConfig.error && (
            <p className="text-red-400 text-sm font-mono m-0">
              {setConfig.error.message}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={setConfig.isPending}
              className="px-6 py-3 text-base font-mono font-bold bg-game-accent border-none rounded text-white cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {setConfig.isPending ? 'Connecting...' : 'Start Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper component for form fields
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-gray-400 text-sm font-mono">{label}</label>
      {children}
      {hint && <p className="text-gray-600 text-xs font-mono m-0">{hint}</p>}
    </div>
  );
}
