import type {
  DesignSystemDetail,
  DesignSystemSummary,
  UpdateDesignSystemRequest,
} from '@dsg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client.js';

export const designSystemKeys = {
  list: ['design-systems'] as const,
  detail: (id: string) => ['design-systems', id] as const,
};

export function useDesignSystems() {
  return useQuery({
    queryKey: designSystemKeys.list,
    queryFn: () => api.get<DesignSystemSummary[]>('/api/design-systems'),
  });
}

export function useDesignSystem(id: string) {
  return useQuery({
    queryKey: designSystemKeys.detail(id),
    queryFn: () => api.get<DesignSystemDetail>(`/api/design-systems/${id}`),
  });
}

export function useCreateDesignSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.post<DesignSystemDetail>('/api/design-systems', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: designSystemKeys.list }),
  });
}

export function useUpdateDesignSystem(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateDesignSystemRequest) =>
      api.patch<DesignSystemDetail>(`/api/design-systems/${id}`, patch),
    onSuccess: (updated) => {
      // Seed the cache from the response rather than refetching — the editor holds the
      // authoritative draft locally and a refetch would fight it.
      queryClient.setQueryData(designSystemKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: designSystemKeys.list });
    },
  });
}

export function useDeleteDesignSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/design-systems/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: designSystemKeys.list }),
  });
}
