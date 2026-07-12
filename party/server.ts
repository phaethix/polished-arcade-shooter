import type { Connection, ConnectionContext } from 'partyserver';
import { routePartykitRequest, Server } from 'partyserver';

import { encodeNetMessage, parseNetMessage } from '../src/net/protocol';
import type { LoadoutWire, NetMessage } from '../src/net/protocol';
import { COOP_MAX_CONNECTIONS, shouldRejectRoomJoin } from '../src/net/room-capacity';
import { shouldRelayFromRole } from '../src/net/room-relay';

interface ConnState {
  role: 'host' | 'guest' | null;
  loadout: LoadoutWire | null;
}

interface Env {
  /** Co-op room server (this Durable Object). */
  CoopRoom: DurableObjectNamespace<CoopRoom>;
  /** Client origin allowed to open WebSockets (e.g. the GitHub Pages URL). */
  PARTYKIT_HOST?: string;
}

const RELAYED_TYPES: ReadonlySet<NetMessage['type']> = new Set([
  'start',
  'input',
  'snapshot',
  'gameover',
]);

export class CoopRoom extends Server<Env> {
  /** True once a `start` message has been relayed; blocks further joins mid-run. */
  private started = false;

  onConnect(connection: Connection<ConnState>, _ctx: ConnectionContext): void {
    if (this.started) {
      connection.send(encodeNetMessage({ type: 'error', message: 'game_started' }));
      connection.close();
      return;
    }
    const connectionIds = [...this.getConnections()].map((c) => c.id);
    if (shouldRejectRoomJoin(connectionIds, connection.id, COOP_MAX_CONNECTIONS)) {
      connection.send(encodeNetMessage({ type: 'error', message: 'room_full' }));
      connection.close();
      return;
    }
    connection.setState({ role: null, loadout: null });
    this.broadcastLobby();
  }

  onClose(_connection: Connection): void {
    // Host leave mid-run never sends `gameover`, so unlock the room for rematch/rejoin.
    // Guest leave is usually paired with a host `gameover` that already clears this.
    this.started = false;
    this.broadcastLobby();
  }

  onMessage(
    connection: Connection<ConnState>,
    message: string | ArrayBuffer | ArrayBufferView,
  ): void {
    if (typeof message !== 'string') return;
    const data = parseNetMessage(message);
    if (!data) return;

    if (data.type === 'hello') {
      this.handleHello(data, connection);
      return;
    }

    if (RELAYED_TYPES.has(data.type)) {
      const role = connection.state?.role ?? null;
      if (!shouldRelayFromRole(data.type, role)) return;

      if (data.type === 'start') {
        this.started = true;
      }
      if (data.type === 'gameover') {
        // Allow rematch in the same room without forcing both clients to reconnect.
        this.started = false;
      }
      this.broadcast(message, [connection.id]);
    }
  }

  private handleHello(
    data: Extract<NetMessage, { type: 'hello' }>,
    sender: Connection<ConnState>,
  ): void {
    for (const connection of this.getConnections<ConnState>()) {
      if (connection.id === sender.id) continue;
      if (connection.state?.role === data.role) {
        sender.send(encodeNetMessage({ type: 'error', message: 'role_taken' }));
        return;
      }
    }
    sender.setState({ role: data.role, loadout: data.loadout });
    this.broadcastLobby();
  }

  private broadcastLobby(): void {
    let hostPresent = false;
    let guestPresent = false;
    let hostLoadout: LoadoutWire | undefined;
    let guestLoadout: LoadoutWire | undefined;

    for (const connection of this.getConnections<ConnState>()) {
      const { state } = connection;
      if (state?.role === 'host') {
        hostPresent = true;
        hostLoadout = state.loadout ?? undefined;
      } else if (state?.role === 'guest') {
        guestPresent = true;
        guestLoadout = state.loadout ?? undefined;
      }
    }

    this.broadcast(
      encodeNetMessage({
        type: 'lobby',
        hostPresent,
        guestPresent,
        canStart: hostPresent && guestPresent,
        hostLoadout,
        guestLoadout,
      }),
    );
  }
}

interface RoutePartykitOptions<Env> {
  cors?: boolean | Record<string, string>;
  env?: Env;
}

const corsOptions = (env: Env): RoutePartykitOptions<Env> => ({
  cors: env.PARTYKIT_HOST
    ? {
        'Access-Control-Allow-Origin': env.PARTYKIT_HOST,
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    : true,
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env, corsOptions(env))) ||
      new Response('Not Found', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
