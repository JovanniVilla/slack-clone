const SOCKET_SERVER_URL = process.env.SOCKET_INTERNAL_URL || 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_SOCKET_SECRET || 'slack-clone-internal-socket-secret';

interface EmitOptions {
  room?: string;
  rooms?: string[];
  event: string;
  data: unknown;
}

export async function emitSocketEvent({ room, rooms, event, data }: EmitOptions) {
  try {
    const res = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_SECRET,
      },
      body: JSON.stringify({ room, rooms, event, data }),
    });

    if (!res.ok) {
      console.warn(`[Socket Emitter] Failed to emit event '${event}': ${res.statusText}`);
    }
  } catch (err) {
    // We log but don't throw, so database mutations succeed even if socket server is restarting
    console.warn(`[Socket Emitter] Could not contact socket server for event '${event}':`, err);
  }
}
