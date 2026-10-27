import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, workspaces } from '@/db/schema';

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function POST(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { workspaceId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { joinCode } = await req.json();

    if (!joinCode) {
      return new NextResponse('Missing join code', { status: 400 });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return new NextResponse('Workspace not found', { status: 404 });
    }

    if (workspace.joinCode.toLowerCase() !== joinCode.toLowerCase()) {
      return new NextResponse('Invalid join code', { status: 400 });
    }

    const [existingMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (existingMember) {
      return new NextResponse('Already a member of this workspace', { status: 400 });
    }

    await db.insert(members).values({
      userId: session.user.id,
      workspaceId,
      role: 'member',
    });

    return NextResponse.json(workspace.id);
  } catch (error) {
    console.error('[WORKSPACE_JOIN_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
