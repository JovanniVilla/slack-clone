import { useQuery } from '@tanstack/react-query';

export type ChannelItem = {
  id: string;
  _id: string;
  name: string;
  workspaceId: string;
  createdAt: Date | string;
  _creationTime: number;
};

interface UseGetChannelsProps {
  workspaceId: string;
}

export const useGetChannels = ({ workspaceId }: UseGetChannelsProps) => {
  const { data, isLoading } = useQuery<ChannelItem[]>({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/channels?workspaceId=${workspaceId}`);
      if (!res.ok) return [];
      const items = await res.json();
      return items.map((c: any) => ({
        ...c,
        _id: c.id,
        _creationTime: new Date(c.createdAt).getTime(),
      }));
    },
    enabled: !!workspaceId,
  });

  return { data, isLoading };
};
