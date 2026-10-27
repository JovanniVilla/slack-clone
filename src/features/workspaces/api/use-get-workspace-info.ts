import { useQuery } from '@tanstack/react-query';

interface UseGetWorkspaceInfoProps {
  id: string;
}

export const useGetWorkspaceInfo = ({ id }: UseGetWorkspaceInfoProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-info', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/workspaces/${id}/info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });

  return { data, isLoading };
};
