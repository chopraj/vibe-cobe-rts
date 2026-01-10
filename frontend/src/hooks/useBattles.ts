import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Battle } from '../types';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api';

// =============================================================================
// BATTLES HOOK
// =============================================================================

export function useBattles() {
  const config = useGameStore((state) => state.config);

  return useQuery<Battle[]>({
    queryKey: ['battles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/battles`);
      if (!res.ok) throw new Error('Failed to fetch battles');
      return res.json();
    },
    enabled: !!config?.configured,
    // Dynamic polling: 2s when active battles exist, 10s otherwise
    refetchInterval: (query) => {
      const battles = query.state.data;
      const hasActive = battles?.some(
        (b) => b.status === 'pending' || b.status === 'fighting'
      );
      return hasActive ? 2000 : 10000;
    },
  });
}

// =============================================================================
// BATTLE MUTATIONS
// =============================================================================

export function useStartBattle() {
  const queryClient = useQueryClient();

  return useMutation<Battle, Error, number>({
    mutationFn: async (issueNumber) => {
      const res = await fetch(`${API_BASE}/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start battle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}

export function useCancelBattle() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (battleId) => {
      const res = await fetch(`${API_BASE}/battles/${battleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel battle');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] });
    },
  });
}

// =============================================================================
// LOCAL BATTLE MANAGEMENT
// =============================================================================

/**
 * Hook for local battle dismissal (removes from React Query cache without API call).
 * Use for hiding finished battles from the UI.
 */
export function useDismissBattle() {
  const queryClient = useQueryClient();

  return {
    dismiss: (battleId: string) => {
      queryClient.setQueryData<Battle[]>(['battles'], (old) =>
        old?.filter((b) => b.id !== battleId) ?? []
      );
    },
    clearFinished: () => {
      queryClient.setQueryData<Battle[]>(['battles'], (old) =>
        old?.filter((b) => b.status !== 'victory' && b.status !== 'defeat') ?? []
      );
    },
  };
}
