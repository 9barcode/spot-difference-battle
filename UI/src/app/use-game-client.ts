import type {
  ClientToServerEvents,
  Difference,
  GameErrorPayload,
  GameSnapshot,
  GuessResult,
  HintResult,
  MatchFoundPayload,
  NormalizedPoint,
  ServerToClientEvents,
} from "@spot-battle/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type LobbyPhase = "NICKNAME" | "LOBBY" | "MATCHING" | "IN_GAME";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
const NICKNAME_KEY = "spot-battle.nickname";

export function useGameClient() {
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<LobbyPhase>(() =>
    localStorage.getItem(NICKNAME_KEY) ? "LOBBY" : "NICKNAME",
  );
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) ?? "");
  const [match, setMatch] = useState<MatchFoundPayload | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [lastGuess, setLastGuess] = useState<GuessResult | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [hintArea, setHintArea] = useState<HintResult["area"] | null>(null);
  const [error, setError] = useState<GameErrorPayload | null>(null);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, { reconnection: true });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("match:found", (payload) => {
      setMatch(payload);
      setPhase("IN_GAME");
      setFoundIds(new Set());
      setLastGuess(null);
    });
    socket.on("game:snapshot", setSnapshot);
    socket.on("game:guess-result", (result) => {
      setLastGuess(result);
      if (result.correct && result.differenceId) {
        setFoundIds((current) => new Set(current).add(result.differenceId!));
      }
    });
    socket.on("game:hint-result", (result) => {
      setHintArea(result.area);
      window.setTimeout(() => setHintArea(null), 2_000);
    });
    socket.on("game:error", setError);
    socket.on("queue:left", () => setPhase("LOBBY"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const saveNickname = useCallback((value: string) => {
    const normalized = value.trim().slice(0, 16);
    if (normalized.length < 2) {
      setError({ code: "INVALID_NICKNAME", message: "닉네임은 2자 이상 입력해주세요." });
      return false;
    }
    localStorage.setItem(NICKNAME_KEY, normalized);
    setNicknameState(normalized);
    setError(null);
    setPhase("LOBBY");
    return true;
  }, []);

  const startMatching = useCallback(() => {
    if (!connected || !nickname) return;
    setError(null);
    setSnapshot(null);
    setMatch(null);
    setPhase("MATCHING");
    socketRef.current?.emit("queue:join", { nickname });
  }, [connected, nickname]);

  const cancelMatching = useCallback(() => {
    socketRef.current?.emit("queue:leave");
  }, []);

  const returnToLobby = useCallback(() => {
    setMatch(null);
    setSnapshot(null);
    setFoundIds(new Set());
    setPhase("LOBBY");
  }, []);

  return {
    connected,
    phase,
    nickname,
    match,
    snapshot,
    lastGuess,
    foundIds,
    hintArea,
    error,
    clearError: () => setError(null),
    saveNickname,
    startMatching,
    cancelMatching,
    ready: () => match && socketRef.current?.emit("game:ready", { matchId: match.matchId }),
    submit: (differences: Difference[]) =>
      match && socketRef.current?.emit("game:submit", { matchId: match.matchId, differences }),
    guess: (point: NormalizedPoint) =>
      match && socketRef.current?.emit("game:guess", { matchId: match.matchId, point }),
    hint: () => match && socketRef.current?.emit("game:hint", { matchId: match.matchId }),
    returnToLobby,
  };
}
