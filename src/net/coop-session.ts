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

  connect(roomCode: string, handlers: CoopSessionHandlers): void {
    this.disconnect();
    this.socket = new PartySocket({
      host: getPartyHost(),
      room: roomCode,
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

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
  }
}
