import { GameMatch, GameRuleError } from "@spot-battle/game-core";
import type { Difference } from "@spot-battle/shared";

const FALLBACK_DIFFERENCES: Difference[] = [
  { id: "fallback-a", kind: "ADD", region: { x: 0.2, y: 0.2, radius: 0.05 } },
  { id: "fallback-b", kind: "COVER", region: { x: 0.5, y: 0.5, radius: 0.05 } },
  { id: "fallback-c", kind: "COLOR", region: { x: 0.8, y: 0.8, radius: 0.05 } },
];

export class MatchRegistry {
  private readonly matches = new Map<string, GameMatch>();
  private readonly playerMatches = new Map<string, string>();

  create(
    matchId: string,
    players: [
      { playerId: string; nickname: string },
      { playerId: string; nickname: string },
    ],
  ): GameMatch {
    const match = new GameMatch(matchId, "prototype-room", players, FALLBACK_DIFFERENCES);
    this.matches.set(matchId, match);
    for (const player of players) this.playerMatches.set(player.playerId, matchId);
    return match;
  }

  getForPlayer(matchId: string, playerId: string): GameMatch {
    const match = this.matches.get(matchId);
    if (!match || this.playerMatches.get(playerId) !== matchId) {
      throw new GameRuleError("MATCH_NOT_FOUND", "참가 중인 경기를 찾을 수 없습니다.");
    }
    return match;
  }

  getCurrentForPlayer(playerId: string): GameMatch | null {
    const matchId = this.playerMatches.get(playerId);
    return matchId ? this.matches.get(matchId) ?? null : null;
  }

  expire(nowMs: number): GameMatch[] {
    const changed: GameMatch[] = [];
    for (const match of this.matches.values()) {
      if (match.expire(nowMs)) changed.push(match);
    }
    return changed;
  }
}
