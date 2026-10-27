'use client';

import { useQuery } from '@tanstack/react-query';

import type { MemberItem } from './use-get-members';

interface UseCurrentMemberProps {
  workspaceId: string;
}

export const useCurrentMember = ({ workspaceId }: UseCurrentMemberProps) => {
  const { data, isLoading } = useQuery<MemberItem | null>({
    queryKey: ['current-member', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const res = await fetch(`/api/members/current?workspaceId=${workspaceId}`);
      if (!res.ok) return null;
      const item = await res.json();
      return item ? { ...item, _id: item.id } : null;
    },
    enabled: !!workspaceId,
  });

  return { data, isLoading };
};
