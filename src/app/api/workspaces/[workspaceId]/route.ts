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

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    return NextResponse.json(workspace || null);
  } catch (error) {
    console.error('[WORKSPACE_GET_BY_ID_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { workspaceId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member || member.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    const { name } = await req.json();

    if (!name || name.trim().length < 3 || name.trim().length > 50) {
      return new NextResponse('Workspace name must be between 3 and 50 characters', { status: 400 });
    }

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({ name: name.trim() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    return NextResponse.json(updatedWorkspace.id);
  } catch (error) {
    console.error('[WORKSPACE_PATCH_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { workspaceId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member || member.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

    return NextResponse.json(workspaceId);
  } catch (error) {
    console.error('[WORKSPACE_DELETE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
