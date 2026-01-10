import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GitHubIssue, GameConfig, ConfigResponse } from '../types';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api';

// =============================================================================
// CONFIG HOOKS
// =============================================================================

export function useConfig() {
  const setConfig = useGameStore((state) => state.setConfig);
  const setShowSetup = useGameStore((state) => state.setShowSetup);

  return useQuery<GameConfig | null>({
    queryKey: ['config'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch config');
      }
      const data = await res.json();
      // Sync config to store (it's set once and used everywhere)
      setConfig(data);
      setShowSetup(false);
      return data;
    },
    retry: false,
  });
}

export function useSetConfig() {
  const queryClient = useQueryClient();
  const setConfig = useGameStore((state) => state.setConfig);
  const setShowSetup = useGameStore((state) => state.setShowSetup);

  return useMutation<ConfigResponse, Error, { repoUrl: string; pat: string; unitCount?: number }>({
    mutationFn: async (input) => {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to set config');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setConfig({
        owner: data.owner,
        repo: data.repo,
        unitCount: data.unitCount,
        configured: true,
      });
      setShowSetup(false);
      queryClient.invalidateQueries({ queryKey: ['config'] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

// =============================================================================
// ISSUES HOOK
// =============================================================================

export function useIssues() {
  const config = useGameStore((state) => state.config);

  return useQuery<GitHubIssue[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/issues`);
      if (!res.ok) throw new Error('Failed to fetch issues');
      return res.json();
    },
    enabled: !!config?.configured,
    refetchInterval: 30000,
  });
}
