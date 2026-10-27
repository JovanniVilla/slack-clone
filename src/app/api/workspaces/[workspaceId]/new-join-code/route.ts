import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, workspaces } from '@/db/schema';

interface Context {
  params: Promise<{ workspaceId: string }>;
}

const generateCode = () => {
  return Array.from({ length: 6 }, () =>
    '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)],
  ).join('');
};

export async function POST(req: Request, { params }: Context) {
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

    const newCode = generateCode();

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({ joinCode: newCode })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    return NextResponse.json(updatedWorkspace.id);
  } catch (error) {
    console.error('[WORKSPACE_NEW_JOIN_CODE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
