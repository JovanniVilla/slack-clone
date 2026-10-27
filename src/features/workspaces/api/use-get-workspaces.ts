import { useQuery } from '@tanstack/react-query';

export type WorkspaceItem = {
  id: string;
  _id: string;
  name: string;
  userId: string;
  joinCode: string;
  createdAt: Date | string;
};

export const useGetWorkspaces = () => {
  const { data, isLoading } = useQuery<WorkspaceItem[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const items = await res.json();
      return items.map((w: WorkspaceItem) => ({ ...w, _id: w.id }));
    },
  });

  return { data, isLoading };
};
