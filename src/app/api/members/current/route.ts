import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members } from '@/db/schema';

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(null);
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

    return NextResponse.json(currentMember || null);
  } catch (error) {
    console.error('[MEMBERS_CURRENT_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
