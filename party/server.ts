import type * as Party from 'partykit/server';

import { encodeNetMessage, parseNetMessage } from '../src/net/protocol';
import type { LoadoutWire, NetMessage } from '../src/net/protocol';

const MAX_CONNECTIONS = 2;

interface ConnState {
  role: 'host' | 'guest' | null;
  loadout: LoadoutWire | null;
}

const RELAYED_TYPES: ReadonlySet<NetMessage['type']> = new Set([
  'start',
  'input',
  'snapshot',
  'gameover',
]);

export default class CoopRoom implements Party.Server {
  /** True once a `start` message has been relayed; blocks further joins mid-run. */
  private started = false;

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection, _ctx: Party.ConnectionContext): void {
    if (this.started) {
      connection.send(encodeNetMessage({ type: 'error', message: 'game_started' }));
      connection.close();
      return;
    }
    const connectionCount = [...this.room.getConnections()].length;
    if (connectionCount > MAX_CONNECTIONS) {
      connection.send(encodeNetMessage({ type: 'error', message: 'room_full' }));
      connection.close();
      return;
    }
    (connection as Party.Connection<ConnState>).setState({ role: null, loadout: null });
    this.broadcastLobby();
  }

  onClose(_connection: Party.Connection): void {
    if ([...this.room.getConnections()].length === 0) {
      this.started = false;
    }
    this.broadcastLobby();
  }

  onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection): void {
    if (typeof message !== 'string') return;
    const data = parseNetMessage(message);
    if (!data) return;

    if (data.type === 'hello') {
      this.handleHello(data, sender as Party.Connection<ConnState>);
      return;
    }

    if (RELAYED_TYPES.has(data.type)) {
      if (data.type === 'start') {
        this.started = true;
      }
      this.room.broadcast(message, [sender.id]);
    }
  }

  private handleHello(
    data: Extract<NetMessage, { type: 'hello' }>,
    sender: Party.Connection<ConnState>
  ): void {
    for (const connection of this.room.getConnections<ConnState>()) {
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

    for (const connection of this.room.getConnections<ConnState>()) {
      const { state } = connection;
      if (state?.role === 'host') {
        hostPresent = true;
        hostLoadout = state.loadout ?? undefined;
      } else if (state?.role === 'guest') {
        guestPresent = true;
        guestLoadout = state.loadout ?? undefined;
      }
    }

    this.room.broadcast(
      encodeNetMessage({
        type: 'lobby',
        hostPresent,
        guestPresent,
        canStart: hostPresent && guestPresent,
        hostLoadout,
        guestLoadout,
      })
    );
  }
}

CoopRoom satisfies Party.Worker;
