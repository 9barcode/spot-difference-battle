import type { MatchSettings } from "@spot-battle/shared";

export interface WaitingPlayer {
  playerId: string;
  socketId: string;
  nickname: string;
  settings: MatchSettings;
}

export class WaitingPlayerQueue {
  private readonly players = new Map<string, WaitingPlayer>();

  private key({ mode, difficulty }: MatchSettings): string {
    return `${mode}:${difficulty}`;
  }

  get(settings: MatchSettings): WaitingPlayer | undefined {
    return this.players.get(this.key(settings));
  }

  set(player: WaitingPlayer): void {
    this.remove(player.playerId);
    this.players.set(this.key(player.settings), player);
  }

  delete(settings: MatchSettings): void {
    this.players.delete(this.key(settings));
  }

  remove(playerId: string): void {
    for (const [key, player] of this.players) {
      if (player.playerId === playerId) this.players.delete(key);
    }
  }

  has(playerId: string): boolean {
    return [...this.players.values()].some((player) => player.playerId === playerId);
  }
}
