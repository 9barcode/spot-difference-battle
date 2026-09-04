import type { GameSnapshot } from "@spot-battle/shared";

type VersionedGameSnapshot = Pick<GameSnapshot, "matchId" | "stateVersion">;

export function shouldAcceptGameSnapshot(
  current: VersionedGameSnapshot | null,
  incoming: VersionedGameSnapshot,
): boolean {
  return (
    current === null ||
    current.matchId !== incoming.matchId ||
    incoming.stateVersion > current.stateVersion
  );
}
