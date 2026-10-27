import { eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { channels, members, workspaces } from '@/db/schema';

const generateCode = () => {
  return Array.from({ length: 6 }, () =>
    '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)],
  ).join('');
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json([]);
    }

    const userMemberships = await db
      .select({ workspaceId: members.workspaceId })
      .from(members)
      .where(eq(members.userId, session.user.id));

    if (userMemberships.length === 0) {
      return NextResponse.json([]);
    }

    const workspaceIds = userMemberships.map((m) => m.workspaceId);

    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds));

    return NextResponse.json(userWorkspaces);
  } catch (error) {
    console.error('[WORKSPACES_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name } = await req.json();

    if (!name || name.trim().length < 3 || name.trim().length > 50) {
      return new NextResponse('Workspace name must be between 3 and 50 characters', { status: 400 });
    }

    const joinCode = generateCode();

    const [newWorkspace] = await db
      .insert(workspaces)
      .values({
        name: name.trim(),
        userId: session.user.id,
        joinCode,
      })
      .returning();

    await db.insert(members).values({
      userId: session.user.id,
      workspaceId: newWorkspace.id,
      role: 'admin',
    });

    await db.insert(channels).values({
      name: 'general',
      workspaceId: newWorkspace.id,
    });

    return NextResponse.json(newWorkspace.id);
  } catch (error) {
    console.error('[WORKSPACES_POST_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
