'use client';

import { useQuery } from '@tanstack/react-query';

export type MemberItem = {
  id: string;
  _id: string;
  userId: string;
  workspaceId: string;
  role: 'admin' | 'member';
  createdAt: Date | string;
  user: {
    id: string;
    _id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

interface UseGetMembersProps {
  workspaceId: string;
}

export const useGetMembers = ({ workspaceId }: UseGetMembersProps) => {
  const { data, isLoading } = useQuery<MemberItem[]>({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/members?workspaceId=${workspaceId}`);
      if (!res.ok) return [];
      const items = await res.json();
      return items.map((m: any) => ({
        ...m,
        _id: m.id,
        user: { ...m.user, _id: m.user?.id },
      }));
    },
    enabled: !!workspaceId,
  });

  return { data, isLoading };
};
