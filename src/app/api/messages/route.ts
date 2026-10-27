import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { channels, conversations, members, messages, reactions, users } from '@/db/schema';
import { emitSocketEvent } from '@/lib/socket-emitter';

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId') || undefined;
    let conversationId = searchParams.get('conversationId') || undefined;
    const parentMessageId = searchParams.get('parentMessageId') || undefined;
    const cursor = searchParams.get('cursor'); // timestamp ISO string or null
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // If replying in a thread in a 1-1 conversation
    if (!conversationId && !channelId && parentMessageId) {
      const [parentMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, parentMessageId))
        .limit(1);

      if (parentMessage?.conversationId) {
        conversationId = parentMessage.conversationId;
      }
    }

    // Build conditions
    const conditions = [];

    if (channelId) {
      conditions.push(eq(messages.channelId, channelId));
    } else {
      conditions.push(isNull(messages.channelId));
    }

    if (conversationId) {
      conditions.push(eq(messages.conversationId, conversationId));
    } else {
      conditions.push(isNull(messages.conversationId));
    }

    if (parentMessageId) {
      conditions.push(eq(messages.parentMessageId, parentMessageId));
    } else {
      conditions.push(isNull(messages.parentMessageId));
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      conditions.push(lt(messages.createdAt, cursorDate));
    }

    const fetchedMessages = await db
      .select({
        id: messages.id,
        body: messages.body,
        image: messages.image,
        memberId: messages.memberId,
        workspaceId: messages.workspaceId,
        channelId: messages.channelId,
        conversationId: messages.conversationId,
        parentMessageId: messages.parentMessageId,
        updatedAt: messages.updatedAt,
        createdAt: messages.createdAt,
        member: {
          id: members.id,
          userId: members.userId,
          role: members.role,
        },
        user: {
          id: users.id,
          name: users.name,
          image: users.image,
        },
      })
      .from(messages)
      .innerJoin(members, eq(messages.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = fetchedMessages.length > limit;
    const pageMessages = hasMore ? fetchedMessages.slice(0, limit) : fetchedMessages;

    const messageIds = pageMessages.map((m) => m.id);

    // Fetch reactions for all page messages in one query
    const allReactions =
      messageIds.length > 0
        ? await db
            .select()
            .from(reactions)
            .where(inArray(reactions.messageId, messageIds))
        : [];

    // Fetch thread summaries if needed
    const threadDetails = new Map<
      string,
      { count: number; image?: string | null; timestamp?: number; name?: string | null }
    >();

    if (!parentMessageId && messageIds.length > 0) {
      for (const msgId of messageIds) {
        const replies = await db
          .select({
            id: messages.id,
            createdAt: messages.createdAt,
            userImage: users.image,
            userName: users.name,
          })
          .from(messages)
          .innerJoin(members, eq(messages.memberId, members.id))
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(messages.parentMessageId, msgId))
          .orderBy(desc(messages.createdAt));

        if (replies.length > 0) {
          const lastReply = replies[0];
          threadDetails.set(msgId, {
            count: replies.length,
            image: lastReply.userImage,
            timestamp: lastReply.createdAt.getTime(),
            name: lastReply.userName,
          });
        }
      }
    }

    // Format output matching the UI component requirements
    const populated = pageMessages.map((m) => {
      const msgReactions = allReactions.filter((r) => r.messageId === m.id);

      // Deduplicate and group reactions
      const groupedReactions = msgReactions.reduce(
        (acc, r) => {
          const existing = acc.find((item) => item.value === r.value);
          if (existing) {
            existing.count += 1;
            if (!existing.memberIds.includes(r.memberId)) {
              existing.memberIds.push(r.memberId);
            }
          } else {
            acc.push({
              _id: r.id,
              value: r.value,
              count: 1,
              memberIds: [r.memberId],
            });
          }
          return acc;
        },
        [] as Array<{ _id: string; value: string; count: number; memberIds: string[] }>,
      );

      const thread = threadDetails.get(m.id) || {
        count: 0,
        image: undefined,
        timestamp: 0,
        name: '',
      };

      return {
        _id: m.id,
        _creationTime: m.createdAt.getTime(),
        body: m.body,
        image: m.image,
        memberId: m.memberId,
        workspaceId: m.workspaceId,
        channelId: m.channelId,
        conversationId: m.conversationId,
        parentMessageId: m.parentMessageId,
        updatedAt: m.updatedAt ? m.updatedAt.getTime() : undefined,
        member: m.member,
        user: {
          _id: m.user.id,
          id: m.user.id,
          name: m.user.name ?? undefined,
          image: m.user.image ?? undefined,
        },
        reactions: groupedReactions,
        threadCount: thread.count,
        threadImage: thread.image || undefined,
        threadTimestamp: thread.timestamp,
        threadName: thread.name || undefined,
      };
    });

    const nextCursor = hasMore
      ? pageMessages[pageMessages.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      page: populated,
      nextCursor,
      status: 'success',
    });
  } catch (error) {
    console.error('[MESSAGES_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { body, image, workspaceId, channelId, conversationId, parentMessageId } =
      await req.json();

    if (!body || !workspaceId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let _conversationId = conversationId;

    if (!channelId && !conversationId && parentMessageId) {
      const [parentMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, parentMessageId))
        .limit(1);

      if (parentMessage?.conversationId) {
        _conversationId = parentMessage.conversationId;
      }
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        body,
        image,
        memberId: member.id,
        workspaceId,
        channelId,
        conversationId: _conversationId,
        parentMessageId,
      })
      .returning();

    // Emit Realtime event via dedicated socket microservice
    const roomsToNotify: string[] = [];
    if (channelId) roomsToNotify.push(`channel:${channelId}`);
    if (_conversationId) roomsToNotify.push(`conversation:${_conversationId}`);
    if (parentMessageId) roomsToNotify.push(`thread:${parentMessageId}`);

    if (roomsToNotify.length > 0) {
      await emitSocketEvent({
        rooms: roomsToNotify,
        event: 'message:created',
        data: { messageId: newMessage.id },
      });
    }

    return NextResponse.json(newMessage.id);
  } catch (error) {
    console.error('[MESSAGES_POST_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
