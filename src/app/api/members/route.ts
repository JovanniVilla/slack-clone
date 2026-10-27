import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, users } from '@/db/schema';

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return new NextResponse('Missing workspaceId', { status: 400 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!currentMember) {
      return NextResponse.json([]);
    }

    const data = await db
      .select({
        id: members.id,
        userId: members.userId,
        workspaceId: members.workspaceId,
        role: members.role,
        createdAt: members.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.workspaceId, workspaceId))
      .orderBy(members.createdAt);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[MEMBERS_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
