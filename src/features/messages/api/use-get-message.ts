'use client';

import { useQuery } from '@tanstack/react-query';

interface UseGetMessageProps {
  id: string;
}

export const useGetMessage = ({ id }: UseGetMessageProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['message', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/messages/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });

  return { data, isLoading };
};
