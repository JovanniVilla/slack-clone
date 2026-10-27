import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { channels, members } from '@/db/schema';

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

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member) {
      return NextResponse.json([]);
    }

    const workspaceChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId))
      .orderBy(channels.createdAt);

    return NextResponse.json(workspaceChannels);
  } catch (error) {
    console.error('[CHANNELS_GET_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name, workspaceId } = await req.json();

    if (!name || !workspaceId) {
      return new NextResponse('Missing name or workspaceId', { status: 400 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member || member.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    // Normalize channel name (no spaces, lowercase)
    const parsedName = name.replace(/\s+/g, '-').toLowerCase().trim();

    const [newChannel] = await db
      .insert(channels)
      .values({
        name: parsedName,
        workspaceId,
      })
      .returning();

    return NextResponse.json(newChannel.id);
  } catch (error) {
    console.error('[CHANNELS_POST_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
