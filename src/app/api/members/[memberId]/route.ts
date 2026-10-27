import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { members, users } from '@/db/schema';

interface Context {
  params: Promise<{ memberId: string }>;
}

export async function GET(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { memberId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [targetMember] = await db
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
      .where(eq(members.id, memberId))
      .limit(1);

    if (!targetMember) {
      return NextResponse.json(null);
    }

    const [viewer] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, targetMember.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!viewer) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(targetMember);
  } catch (error) {
    console.error('[MEMBER_GET_BY_ID_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { memberId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [targetMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!targetMember) {
      return new NextResponse('Member not found', { status: 404 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, targetMember.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!currentMember || currentMember.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    const { role } = await req.json();

    if (role !== 'admin' && role !== 'member') {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const [updatedMember] = await db
      .update(members)
      .set({ role })
      .where(eq(members.id, memberId))
      .returning();

    return NextResponse.json(updatedMember.id);
  } catch (error) {
    console.error('[MEMBER_PATCH_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { memberId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [targetMember] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!targetMember) {
      return new NextResponse('Member not found', { status: 404 });
    }

    const [currentMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, targetMember.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!currentMember) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Only admins can delete others; members can only remove (leave) themselves
    const isSelf = currentMember.id === targetMember.id;
    const isAdmin = currentMember.role === 'admin';

    if (!isSelf && !isAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Cannot remove self if last admin in workspace
    if (isSelf && currentMember.role === 'admin') {
      const workspaceAdmins = await db
        .select()
        .from(members)
        .where(and(eq(members.workspaceId, targetMember.workspaceId), eq(members.role, 'admin')));

      if (workspaceAdmins.length <= 1) {
        return new NextResponse('Cannot leave workspace as the only administrator', { status: 400 });
      }
    }

    await db.delete(members).where(eq(members.id, memberId));

    return NextResponse.json(memberId);
  } catch (error) {
    console.error('[MEMBER_DELETE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
