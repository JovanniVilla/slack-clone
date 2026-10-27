import { useQuery } from '@tanstack/react-query';

import type { WorkspaceItem } from './use-get-workspaces';

interface UseGetWorkspaceProps {
  id: string;
}

export const useGetWorkspace = ({ id }: UseGetWorkspaceProps) => {
  const { data, isLoading } = useQuery<WorkspaceItem | null>({
    queryKey: ['workspace', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/workspaces/${id}`);
      if (!res.ok) return null;
      const item = await res.json();
      return item ? { ...item, _id: item.id } : null;
    },
    enabled: !!id,
  });

  return { data, isLoading };
};
