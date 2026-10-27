import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, messages, reactions, users } from '@/db/schema';
import { emitSocketEvent } from '@/lib/socket-emitter';

interface Context {
  params: Promise<{ messageId: string }>;
}

export async function GET(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { messageId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [message] = await db
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
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return NextResponse.json(null);
    }

    const [viewer] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, message.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!viewer) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const msgReactions = await db
      .select()
      .from(reactions)
      .where(eq(reactions.messageId, message.id));

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

    return NextResponse.json({
      _id: message.id,
      _creationTime: message.createdAt.getTime(),
      body: message.body,
      image: message.image,
      memberId: message.memberId,
      workspaceId: message.workspaceId,
      channelId: message.channelId,
      conversationId: message.conversationId,
      parentMessageId: message.parentMessageId,
      updatedAt: message.updatedAt ? message.updatedAt.getTime() : undefined,
      member: message.member,
      user: message.user,
      reactions: groupedReactions,
    });
  } catch (error) {
    console.error('[MESSAGE_GET_BY_ID_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { messageId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, message.memberId))
      .limit(1);

    if (!member || member.userId !== session.user.id) {
      return new NextResponse('Unauthorized. Only author can edit.', { status: 403 });
    }

    const { body } = await req.json();

    if (!body) {
      return new NextResponse('Missing body', { status: 400 });
    }

    const [updatedMessage] = await db
      .update(messages)
      .set({
        body,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    // Emit Realtime event
    const roomsToNotify: string[] = [];
    if (updatedMessage.channelId) roomsToNotify.push(`channel:${updatedMessage.channelId}`);
    if (updatedMessage.conversationId) roomsToNotify.push(`conversation:${updatedMessage.conversationId}`);
    if (updatedMessage.parentMessageId) roomsToNotify.push(`thread:${updatedMessage.parentMessageId}`);

    if (roomsToNotify.length > 0) {
      await emitSocketEvent({
        rooms: roomsToNotify,
        event: 'message:updated',
        data: { messageId: updatedMessage.id },
      });
    }

    return NextResponse.json(updatedMessage.id);
  } catch (error) {
    console.error('[MESSAGE_PATCH_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { messageId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, message.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!currentMember) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const isAuthor = currentMember.id === message.memberId;
    const isAdmin = currentMember.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await db.delete(messages).where(eq(messages.id, messageId));

    // Emit Realtime event
    const roomsToNotify: string[] = [];
    if (message.channelId) roomsToNotify.push(`channel:${message.channelId}`);
    if (message.conversationId) roomsToNotify.push(`conversation:${message.conversationId}`);
    if (message.parentMessageId) roomsToNotify.push(`thread:${message.parentMessageId}`);

    if (roomsToNotify.length > 0) {
      await emitSocketEvent({
        rooms: roomsToNotify,
        event: 'message:deleted',
        data: { messageId },
      });
    }

    return NextResponse.json(messageId);
  } catch (error) {
    console.error('[MESSAGE_DELETE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
