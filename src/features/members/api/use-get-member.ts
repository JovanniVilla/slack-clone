'use client';

import { useQuery } from '@tanstack/react-query';

import type { MemberItem } from './use-get-members';

interface UseGetMemberProps {
  id: string;
}

export const useGetMember = ({ id }: UseGetMemberProps) => {
  const { data, isLoading } = useQuery<MemberItem | null>({
    queryKey: ['member', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) return null;
      const item = await res.json();
      return item
        ? {
            ...item,
            _id: item.id,
            user: { ...item.user, _id: item.user?.id },
          }
        : null;
    },
    enabled: !!id,
  });

  return { data, isLoading };
};
