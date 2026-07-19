import { GameMatch, GameRuleError, type PersistedMatchState } from "@spot-battle/game-core";
import type { Difference } from "@spot-battle/shared";

const FALLBACK_DIFFERENCES: Difference[] = [
  { id: "auto-a", kind: "ADD", region: { x: 0.18, y: 0.18, radius: 0.04 } },
  { id: "auto-b", kind: "COVER", region: { x: 0.5, y: 0.18, radius: 0.04 } },
  { id: "auto-c", kind: "COLOR", region: { x: 0.82, y: 0.18, radius: 0.04 } },
  { id: "auto-d", kind: "COLOR", region: { x: 0.18, y: 0.5, radius: 0.04 } },
  { id: "auto-e", kind: "ADD", region: { x: 0.5, y: 0.5, radius: 0.04 } },
  { id: "auto-f", kind: "COVER", region: { x: 0.82, y: 0.5, radius: 0.04 } },
  { id: "auto-g", kind: "COVER", region: { x: 0.18, y: 0.82, radius: 0.04 } },
  { id: "auto-h", kind: "COLOR", region: { x: 0.5, y: 0.82, radius: 0.04 } },
  { id: "auto-i", kind: "ADD", region: { x: 0.82, y: 0.82, radius: 0.04 } },
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

  restore(state: PersistedMatchState): GameMatch {
    const match = GameMatch.restore(state, FALLBACK_DIFFERENCES);
    this.matches.set(match.matchId, match);
    for (const player of state.players) this.playerMatches.set(player.playerId, match.matchId);
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
