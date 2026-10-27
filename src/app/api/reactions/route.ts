import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, messages, reactions } from '@/db/schema';
import { emitSocketEvent } from '@/lib/socket-emitter';

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messageId, value } = await req.json();

    if (!messageId || !value) {
      return new NextResponse('Missing messageId or value', { status: 400 });
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
      .where(and(eq(members.workspaceId, message.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const [existingReaction] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.memberId, member.id),
          eq(reactions.value, value),
        ),
      )
      .limit(1);

    let reactionId: string | null = null;

    if (existingReaction) {
      await db.delete(reactions).where(eq(reactions.id, existingReaction.id));
      reactionId = existingReaction.id;
    } else {
      const [newReaction] = await db
        .insert(reactions)
        .values({
          workspaceId: message.workspaceId,
          messageId,
          memberId: member.id,
          value,
        })
        .returning();
      reactionId = newReaction.id;
    }

    // Emit Realtime event to rooms
    const roomsToNotify: string[] = [];
    if (message.channelId) roomsToNotify.push(`channel:${message.channelId}`);
    if (message.conversationId) roomsToNotify.push(`conversation:${message.conversationId}`);
    if (message.parentMessageId) roomsToNotify.push(`thread:${message.parentMessageId}`);

    if (roomsToNotify.length > 0) {
      await emitSocketEvent({
        rooms: roomsToNotify,
        event: 'reaction:toggled',
        data: { messageId, value, memberId: member.id },
      });
    }

    return NextResponse.json(reactionId);
  } catch (error) {
    console.error('[REACTIONS_POST_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
