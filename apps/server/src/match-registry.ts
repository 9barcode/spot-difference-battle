import {
  GameMatch,
  GameRuleError,
  type PersistedMatchState,
} from "@spot-battle/game-core";
import { GAME_SCENE_IDS, type GameSceneId } from "@spot-battle/shared";

// 서버측 자동 보충 후보는 두지 않는다.
// 서버가 차이점을 주입해도 그에 맞는 문제 이미지를 렌더할 수 없기 때문이다.
// 자동 보충은 제작자 클라이언트가 마감 직전에 수행한다.
export class MatchRegistry {
  private readonly matches = new Map<string, GameMatch>();
  private readonly playerMatches = new Map<string, string>();

  constructor(
    private readonly sceneIds: readonly GameSceneId[] = GAME_SCENE_IDS,
  ) {
    if (sceneIds.length === 0) {
      throw new Error("하나 이상의 경기 장면이 필요합니다.");
    }
  }

  private selectSceneId(): GameSceneId {
    return this.sceneIds[Math.floor(Math.random() * this.sceneIds.length)]!;
  }

  create(
    matchId: string,
    players: [
      { playerId: string; nickname: string },
      { playerId: string; nickname: string },
    ],
  ): GameMatch {
    const match = new GameMatch(matchId, this.selectSceneId(), players);
    this.matches.set(matchId, match);
    for (const player of players) this.playerMatches.set(player.playerId, matchId);
    return match;
  }

  restore(state: PersistedMatchState): GameMatch {
    const match = GameMatch.restore(state);
    this.matches.set(match.matchId, match);
    for (const player of state.players) {
      this.playerMatches.set(player.playerId, match.matchId);
    }
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
