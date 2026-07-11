import PartySocket from 'partysocket';
import { encodeNetMessage, parseNetMessage, type NetMessage, type LoadoutWire } from './protocol';

export type CoopSessionHandlers = {
  onMessage: (msg: NetMessage) => void;
  onClose: () => void;
};

export function getPartyHost(): string {
  return import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';
}

export class CoopSession {
  private socket: PartySocket | null = null;
  /** Whether the underlying WebSocket ever opened. Used to tell "server
   *  unreachable" (never opened) apart from "dropped mid-session" (opened). */
  private opened = false;

  connect(roomCode: string, handlers: CoopSessionHandlers): void {
    this.disconnect();
    this.opened = false;
    this.socket = new PartySocket({
      host: getPartyHost(),
      room: roomCode,
    });
    this.socket.addEventListener('open', () => {
      this.opened = true;
    });
    this.socket.addEventListener('message', (ev) => {
      const msg = parseNetMessage(String(ev.data));
      if (msg) handlers.onMessage(msg);
    });
    this.socket.addEventListener('close', () => handlers.onClose());
  }

  send(msg: NetMessage): void {
    this.socket?.send(encodeNetMessage(msg));
  }

  sendHello(role: 'host' | 'guest', loadout: LoadoutWire): void {
    this.send({ type: 'hello', role, loadout });
  }

  /** True once the WebSocket has opened; false if it never connected. */
  isOpen(): boolean {
    return this.opened;
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.opened = false;
  }
}
