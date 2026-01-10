import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Battle } from '../types';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api';

export function useBattles() {
  const config = useGameStore((state) => state.config);
  const setBattles = useGameStore((state) => state.setBattles);
  const battles = useGameStore((state) => state.battles);

  // Check if there are any active battles
  const hasActiveBattles = battles.some(
    (b) => b.status === 'pending' || b.status === 'fighting'
  );

  return useQuery<Battle[]>({
    queryKey: ['battles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/battles`);
      if (!res.ok) {
        throw new Error('Failed to fetch battles');
      }
      const data: Battle[] = await res.json();

      // Log detailed state for active battles
      data.forEach((battle) => {
        if (battle.status === 'fighting') {
          battle.agents.forEach((agent) => {
            if (agent.detailedState) {
              console.log(
                `[Agent ${agent.id}]`,
                `activity=${agent.detailedState.activity}`,
                agent.detailedState.currentTool ? `tool=${agent.detailedState.currentTool}` : '',
                `tokens=${agent.detailedState.tokens.input + agent.detailedState.tokens.output}`,
                `files=${agent.detailedState.filesModified.length}`,
                `steps=${agent.detailedState.stepsCompleted}`,
                agent.detailedState.pendingPermission ? `⚠️ PERMISSION: ${agent.detailedState.pendingPermission.title}` : ''
              );
            }
          });
        }
      });

      setBattles(data);
      return data;
    },
    enabled: !!config?.configured,
    // Poll every 500ms if there are active battles, otherwise every 10 seconds
    refetchInterval: hasActiveBattles ? 500 : 10000,
  });
}

export interface StartBattleParams {
  issueNumber: number;
  unitCount: number;
}

export function useStartBattle() {
  const queryClient = useQueryClient();

  return useMutation<Battle, Error, StartBattleParams>({
    mutationFn: async ({ issueNumber, unitCount }) => {
      const res = await fetch(`${API_BASE}/battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber, unitCount }),
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
