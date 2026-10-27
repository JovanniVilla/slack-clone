import { useQuery } from '@tanstack/react-query';

import type { ChannelItem } from './use-get-channels';

interface UseGetChannelProps {
  id: string;
}

export const useGetChannel = ({ id }: UseGetChannelProps) => {
  const { data, isLoading } = useQuery<ChannelItem | null>({
    queryKey: ['channel', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/channels/${id}`);
      if (!res.ok) return null;
      const item = await res.json();
      return item
        ? {
            ...item,
            _id: item.id,
            _creationTime: new Date(item.createdAt).getTime(),
          }
        : null;
    },
    enabled: !!id,
  });

  return { data, isLoading };
};
