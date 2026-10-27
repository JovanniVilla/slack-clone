import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, workspaces } from '@/db/schema';

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { workspaceId } = await params;

    const [workspace] = await db
      .select({
        name: workspaces.name,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return NextResponse.json(null);
    }

    let isMember = false;

    if (session?.user?.id) {
      const [member] = await db
        .select()
        .from(members)
        .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
        .limit(1);

      isMember = !!member;
    }

    return NextResponse.json({
      name: workspace.name,
      isMember,
    });
  } catch (error) {
    console.error('[WORKSPACE_INFO_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
