import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db';
import { channels, members } from '@/db/schema';

interface Context {
  params: Promise<{ channelId: string }>;
}

export async function GET(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { channelId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return NextResponse.json(null);
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, channel.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(channel);
  } catch (error) {
    console.error('[CHANNEL_GET_BY_ID_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { channelId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return new NextResponse('Channel not found', { status: 404 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, channel.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member || member.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    const { name } = await req.json();

    if (!name) {
      return new NextResponse('Missing name', { status: 400 });
    }

    const parsedName = name.replace(/\s+/g, '-').toLowerCase().trim();

    const [updatedChannel] = await db
      .update(channels)
      .set({ name: parsedName })
      .where(eq(channels.id, channelId))
      .returning();

    return NextResponse.json(updatedChannel.id);
  } catch (error) {
    console.error('[CHANNEL_PATCH_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Context) {
  try {
    const session = await auth();
    const { channelId } = await params;

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel) {
      return new NextResponse('Channel not found', { status: 404 });
    }

    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, channel.workspaceId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!member || member.role !== 'admin') {
      return new NextResponse('Unauthorized. Admin role required.', { status: 403 });
    }

    await db.delete(channels).where(eq(channels.id, channelId));

    return NextResponse.json(channelId);
  } catch (error) {
    console.error('[CHANNEL_DELETE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
