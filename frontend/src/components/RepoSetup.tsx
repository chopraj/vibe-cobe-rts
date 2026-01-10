import { useState } from 'react';
import { useSetConfig } from '../hooks/useGitHub';

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
    setConfig.mutate(
      { repoUrl, pat, unitCount },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Configure Repository</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>GitHub Repository URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Personal Access Token</label>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              style={styles.input}
              required
            />
            <p style={styles.hint}>
              Needs repo scope for private repos, or public_repo for public repos
            </p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Unit Count (parallel agents)</label>
            <input
              type="number"
              value={unitCount}
              onChange={(e) => setUnitCount(parseInt(e.target.value) || 10)}
              min={1}
              max={20}
              style={styles.input}
            />
            <p style={styles.hint}>
              Number of OpenCode agents to spawn per battle (1-20)
            </p>
          </div>

          {setConfig.error && (
            <p style={styles.error}>{setConfig.error.message}</p>
          )}

          <div style={styles.buttons}>
            <button
              type="submit"
              disabled={setConfig.isPending}
              style={styles.submitButton}
            >
              {setConfig.isPending ? 'Connecting...' : 'Start Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #4a4a6e',
    borderRadius: 8,
    padding: 32,
    maxWidth: 500,
    width: '90%',
  },
  title: {
    margin: '0 0 24px 0',
    color: '#fff',
    fontSize: 24,
    fontFamily: 'monospace',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  input: {
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#2a2a4e',
    border: '1px solid #4a4a6e',
    borderRadius: 4,
    color: '#fff',
  },
  hint: {
    margin: 0,
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  error: {
    margin: 0,
    color: '#ff6666',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  buttons: {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    backgroundColor: '#4444ff',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
  },
};
