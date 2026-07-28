import type {
  AnswerRegion,
  ClientToServerEvents,
  Difference,
  FoundMark,
  GameErrorPayload,
  GameSnapshot,
  GuessResult,
  HintResult,
  MatchFoundPayload,
  NormalizedPoint,
  ReportReason,
  ServerToClientEvents,
  SessionReadyPayload,
} from "@spot-battle/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { shouldAcceptGameSnapshot } from "./game-snapshot.js";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type LobbyPhase = "NICKNAME" | "LOBBY" | "MATCHING" | "IN_GAME";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
const NICKNAME_KEY = "spot-battle.nickname";
const GUEST_TOKEN_KEY = "spot-battle.guest-token";

export function useGameClient() {
  const socketRef = useRef<GameSocket | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<LobbyPhase>(() =>
    localStorage.getItem(NICKNAME_KEY) ? "LOBBY" : "NICKNAME",
  );
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) ?? "");
  const [match, setMatch] = useState<MatchFoundPayload | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [lastGuess, setLastGuess] = useState<GuessResult | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [foundMarks, setFoundMarks] = useState<FoundMark[]>([]);
  const [hintArea, setHintArea] = useState<HintResult["area"] | null>(null);
  const [error, setError] = useState<GameErrorPayload | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, {
      reconnection: true,
      auth: { guestToken: localStorage.getItem(GUEST_TOKEN_KEY) },
    });
    socketRef.current = socket;
    socket.on("session:ready", ({ guestToken }: SessionReadyPayload) => {
      localStorage.setItem(GUEST_TOKEN_KEY, guestToken);
      socket.auth = { guestToken };
    });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("match:found", (payload) => {
      snapshotRef.current = null;
      setMatch(payload);
      setSnapshot(null);
      setPhase("IN_GAME");
      setFoundIds(new Set());
      setFoundMarks([]);
      setLastGuess(null);
      setReportId(null);
    });
    socket.on("game:snapshot", (nextSnapshot) => {
      if (!shouldAcceptGameSnapshot(snapshotRef.current, nextSnapshot)) return;
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      setFoundIds(new Set(nextSnapshot.myFoundIds));
      // 재접속 시에도 이미 맞힌 표시가 복원되도록 서버 스냅샷을 그대로 따른다.
      setFoundMarks(nextSnapshot.foundMarks);
    });
    socket.on("game:guess-result", (result) => {
      setLastGuess(result);
      if (result.correct && result.differenceId && result.region) {
        const differenceId = result.differenceId;
        const region: AnswerRegion = result.region;
        setFoundIds((current) => new Set(current).add(differenceId));
        setFoundMarks((current) =>
          current.some((mark) => mark.differenceId === differenceId)
            ? current
            : [...current, { differenceId, region }],
        );
      }
    });
    socket.on("game:hint-result", (result) => {
      setHintArea(result.area);
      window.setTimeout(() => setHintArea(null), 2_000);
    });
    socket.on("game:error", setError);
    socket.on("game:report-result", ({ reportId: nextReportId }) => setReportId(nextReportId));
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
    snapshotRef.current = null;
    setMatch(null);
    setSnapshot(null);
    setFoundIds(new Set());
    setFoundMarks([]);
    setReportId(null);
    setPhase("LOBBY");
  }, []);

  const actionContext = () => {
    const current = snapshotRef.current;
    return current
      ? { expectedState: current.state, expectedStateVersion: current.stateVersion }
      : null;
  };

  return {
    connected,
    phase,
    nickname,
    match,
    snapshot,
    lastGuess,
    foundIds,
    foundMarks,
    hintArea,
    error,
    reportId,
    clearError: () => setError(null),
    saveNickname,
    startMatching,
    cancelMatching,
    ready: () => match && socketRef.current?.emit("game:ready", { matchId: match.matchId }),
    submit: (differences: Difference[], renderedImage: string, autoFilled = false) => {
      const context = actionContext();
      const socket = socketRef.current;
      if (!match || !context || !socket?.connected) return false;
      socket.emit("game:submit", {
        matchId: match.matchId,
        differences,
        renderedImage,
        autoFilled,
        ...context,
      });
      return true;
    },
    guess: (point: NormalizedPoint) => {
      const context = actionContext();
      if (match && context) socketRef.current?.emit("game:guess", { matchId: match.matchId, point, ...context });
    },
    hint: () => {
      const context = actionContext();
      if (match && context) socketRef.current?.emit("game:hint", { matchId: match.matchId, ...context });
    },
    forfeit: () => {
      const context = actionContext();
      if (match && context) socketRef.current?.emit("game:forfeit", { matchId: match.matchId, ...context });
    },
    report: (reason: ReportReason, details?: string) =>
      match && snapshotRef.current && socketRef.current?.emit("game:report", {
        matchId: match.matchId,
        reason,
        details,
        expectedState: snapshotRef.current.state,
        expectedStateVersion: snapshotRef.current.stateVersion,
      }),
    returnToLobby,
  };
}
