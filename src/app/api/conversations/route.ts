import { and, eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { conversations, members } from '@/db/schema';

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { workspaceId, memberId } = await req.json();

    if (!workspaceId || !memberId) {
      return new NextResponse('Missing workspaceId or memberId', { status: 400 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    const [otherMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.id, memberId)))
      .limit(1);

    if (!currentMember || !otherMember) {
      return new NextResponse('Member not found', { status: 404 });
    }

    // Check for existing conversation in either direction
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.workspaceId, workspaceId),
          or(
            and(
              eq(conversations.memberOneId, currentMember.id),
              eq(conversations.memberTwoId, otherMember.id),
            ),
            and(
              eq(conversations.memberOneId, otherMember.id),
              eq(conversations.memberTwoId, currentMember.id),
            ),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(existing.id);
    }

    const [newConversation] = await db
      .insert(conversations)
      .values({
        workspaceId,
        memberOneId: currentMember.id,
        memberTwoId: otherMember.id,
      })
      .returning();

    return NextResponse.json(newConversation.id);
  } catch (error) {
    console.error('[CONVERSATIONS_POST_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
