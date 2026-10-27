'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useSocket } from '@/components/socket-provider';

const BATCH_SIZE = 20;

interface UseGetMessagesProps {
  channelId?: string;
  conversationId?: string;
  parentMessageId?: string;
}

export type MessageItem = {
  _id: string;
  _creationTime: number;
  body: string;
  image?: string | null;
  memberId: string;
  workspaceId: string;
  channelId?: string | null;
  conversationId?: string | null;
  parentMessageId?: string | null;
  updatedAt?: number;
  member: {
    id: string;
    userId: string;
    role: 'admin' | 'member';
  };
  user: {
    _id: string;
    id: string;
    name?: string;
    image?: string;
  };
  reactions: Array<{
    _id: string;
    value: string;
    count: number;
    memberIds: string[];
  }>;
  threadCount: number;
  threadImage?: string;
  threadTimestamp?: number;
  threadName?: string;
};

export type GetMessagesReturnType = MessageItem[];

export const useGetMessages = ({
  channelId,
  conversationId,
  parentMessageId,
}: UseGetMessagesProps) => {
  const { joinRoom, leaveRoom } = useSocket();

  // Join WebSocket room for real-time messages
  useEffect(() => {
    let room: string | null = null;
    if (parentMessageId) {
      room = `thread:${parentMessageId}`;
    } else if (channelId) {
      room = `channel:${channelId}`;
    } else if (conversationId) {
      room = `conversation:${conversationId}`;
    }

    if (room) {
      joinRoom(room);
      return () => {
        leaveRoom(room!);
      };
    }
  }, [channelId, conversationId, parentMessageId, joinRoom, leaveRoom]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', { channelId, conversationId, parentMessageId }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (channelId) params.set('channelId', channelId);
      if (conversationId) params.set('conversationId', conversationId);
      if (parentMessageId) params.set('parentMessageId', parentMessageId);
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', String(BATCH_SIZE));

      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json() as Promise<{ page: MessageItem[]; nextCursor: string | null }>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.page) ?? [];
  }, [data]);

  const status = useMemo(() => {
    if (isLoading) return 'LoadingFirstPage' as const;
    if (isFetchingNextPage) return 'LoadingMore' as const;
    if (hasNextPage) return 'CanLoadMore' as const;
    return 'Exhausted' as const;
  }, [isLoading, isFetchingNextPage, hasNextPage]);

  return {
    results,
    status,
    loadMore: () => fetchNextPage(),
  };
};
