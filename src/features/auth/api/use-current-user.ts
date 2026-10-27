import { useQuery } from '@tanstack/react-query';

export const useCurrentUser = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/users/current');
      if (!res.ok) throw new Error('Failed to fetch current user');
      return res.json();
    },
  });

  return { data: data ?? null, isLoading };
};
