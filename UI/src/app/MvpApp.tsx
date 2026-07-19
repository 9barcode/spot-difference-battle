import { GAME_CONFIG, type Difference, type NormalizedPoint, type ReportReason } from "@spot-battle/shared";
import { Clock, Eye, Flag, LoaderCircle, LogOut, RotateCcw, Search, Send, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import gameSceneImg from "@/imports/image.png";
import { DifferenceEffects, FreeformEditor, renderProblemImage } from "./FreeformEditor";
import { useGameClient } from "./use-game-client";

function useRemainingSeconds(
  deadlineMs: number | null | undefined,
  wrongAnswerCount: number,
): number | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadlineMs) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadlineMs]);
  const penaltyMs = wrongAnswerCount * GAME_CONFIG.wrongAnswerPenaltySeconds * 1_000;
  return deadlineMs ? Math.max(0, Math.ceil((deadlineMs - now - penaltyMs) / 1_000)) : null;
}

function pointFromEvent(event: MouseEvent<HTMLDivElement>): NormalizedPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function DifferenceOverlay({ difference, found = false }: { difference: Difference; found?: boolean }) {
  const style = {
    left: `${difference.region.x * 100}%`,
    top: `${difference.region.y * 100}%`,
    width: `${difference.region.radius * 150}%`,
    aspectRatio: "1",
  };
  const content = difference.kind === "ADD" ? "⭐" : difference.kind === "COVER" ? "?" : "";
  return (
    <span
      style={style}
      className={`pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xl font-black shadow-md ${
        found
          ? "border-4 border-emerald-400 bg-emerald-200/70 text-emerald-900"
          : difference.kind === "COLOR"
            ? "bg-fuchsia-500/75 ring-2 ring-white"
            : difference.kind === "COVER"
              ? "bg-slate-800 text-white"
              : "bg-white/80"
      }`}
    >
      {found ? "✓" : content}
    </span>
  );
}

function ImageBoard({
  differences = [],
  foundIds = new Set(),
  hintArea,
  onSelect,
}: {
  differences?: Difference[];
  foundIds?: Set<string>;
  hintArea?: NormalizedPoint & { radius: number } | null;
  onSelect?: (point: NormalizedPoint) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl ${onSelect ? "cursor-crosshair" : ""}`}
      onClick={onSelect ? (event) => onSelect(pointFromEvent(event)) : undefined}
    >
      <img src={gameSceneImg} alt="게임 원본 그림" className="block h-auto w-full select-none" draggable={false} />
      <DifferenceEffects differences={differences.filter((difference) => !foundIds.has(difference.id))} />
      {differences
        .filter((difference) => foundIds.has(difference.id) || (!difference.fill && !difference.strokes))
        .map((difference) => (
          <DifferenceOverlay key={difference.id} difference={difference} found={foundIds.has(difference.id)} />
        ))}
      {hintArea && <span style={{ left: `${hintArea.x * 100}%`, top: `${hintArea.y * 100}%`, width: `${hintArea.radius * 200}%`, aspectRatio: "1" }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-dashed border-amber-400 bg-amber-200/25"/>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-amber-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

export default function MvpApp() {
  const game = useGameClient();
  const [nicknameInput, setNicknameInput] = useState(game.nickname);
  const [draft, setDraft] = useState<Difference[]>([]);
  const [reportReason, setReportReason] = useState<ReportReason>("UNFAIR");
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittingRef = useRef(false);
  const me = game.snapshot?.players.find((player) => player.playerId === game.match?.playerId);
  const opponent = game.snapshot?.players.find((player) => player.playerId !== game.match?.playerId);
  const remaining = useRemainingSeconds(game.snapshot?.deadlineMs, me?.wrongAnswerCount ?? 0);

  useEffect(() => {
    if (game.snapshot?.state === "EDITING" && !me?.submitted) {
      setDraft([]);
      autoSubmittingRef.current = false;
    }
  }, [game.snapshot?.matchId, game.snapshot?.state, me?.submitted]);

  useEffect(() => {
    if (
      game.snapshot?.state !== "EDITING" || remaining === null || remaining > 2 ||
      draft.length < 1 || draft.length >= GAME_CONFIG.differenceCount || me?.submitted ||
      autoSubmittingRef.current
    ) return;
    autoSubmittingRef.current = true;
    setSubmitting(true);
    void renderProblemImage(draft)
      .then((image) => game.submit(draft, image))
      .finally(() => setSubmitting(false));
  }, [draft, game, me?.submitted, remaining]);

  const header = useMemo(
    () => (
      <header className="mb-8 flex items-center justify-between rounded-2xl bg-white/90 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3"><span className="text-3xl">🔍</span><div><h1 className="font-black text-violet-700">틀린그림찾기 배틀</h1><p className="text-xs text-slate-500">실시간 1대1 MVP</p></div></div>
        {game.nickname && <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">{game.nickname}</span>}
      </header>
    ),
    [game.nickname],
  );

  if (game.phase === "NICKNAME") {
    return <Shell>{header}<section className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><div className="mb-4 text-5xl">👋</div><h2 className="text-2xl font-black">닉네임을 정해주세요</h2><p className="mt-2 text-sm text-slate-500">계정 없이 바로 시작할 수 있습니다.</p><input autoFocus value={nicknameInput} onChange={(event) => setNicknameInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && game.saveNickname(nicknameInput)} maxLength={16} placeholder="2~16자 닉네임" className="mt-6 w-full rounded-2xl border-2 border-violet-200 px-4 py-3 text-center font-bold outline-none focus:border-violet-500"/><button onClick={() => game.saveNickname(nicknameInput)} className="mt-3 w-full rounded-2xl bg-violet-600 py-3 font-black text-white hover:bg-violet-700">시작하기</button></section></Shell>;
  }

  if (game.phase === "LOBBY") {
    return <Shell>{header}<section className="mx-auto max-w-2xl rounded-3xl bg-violet-700 p-10 text-center text-white shadow-xl"><div className="text-6xl">⚔️</div><h2 className="mt-4 text-3xl font-black">빠른 대전</h2><p className="mt-2 text-violet-200">차이점 3개를 만들고 상대보다 먼저 찾아보세요.</p><div className="mt-6 grid grid-cols-3 gap-3 text-sm"><span className="rounded-xl bg-white/10 p-3">제작 30초</span><span className="rounded-xl bg-white/10 p-3">풀이 60초</span><span className="rounded-xl bg-white/10 p-3">힌트 1회</span></div><button disabled={!game.connected} onClick={game.startMatching} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-8 py-4 font-black text-slate-900 disabled:opacity-40"><Search size={20}/>{game.connected ? "상대 찾기" : "서버 연결 중"}</button></section></Shell>;
  }

  if (game.phase === "MATCHING") {
    return <Shell>{header}<section className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-xl"><LoaderCircle className="mx-auto animate-spin text-violet-600" size={56}/><h2 className="mt-5 text-2xl font-black">상대를 찾는 중...</h2><p className="mt-2 text-sm text-slate-500">잠시만 기다려주세요.</p><button onClick={game.cancelMatching} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 font-bold"><X size={18}/>매칭 취소</button></section></Shell>;
  }

  if (!game.snapshot || !game.match) {
    return <Shell>{header}<div className="text-center"><LoaderCircle className="mx-auto animate-spin"/>경기 정보를 불러오는 중입니다.</div></Shell>;
  }

  return (
    <Shell>
      {header}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm"><div><span className="font-black">나 {me?.foundCount ?? 0}/3 · 오답 {me?.wrongAnswerCount ?? 0}</span><span className="mx-3 text-slate-300">vs</span><span className="font-black">{opponent?.nickname} {opponent?.foundCount ?? 0}/3</span></div><div className="flex items-center gap-2">{remaining !== null && <span className={`flex items-center gap-2 rounded-full px-4 py-2 font-black ${remaining <= 10 ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-700"}`}><Clock size={18}/>{remaining}초</span>}{game.snapshot.state !== "FINISHED" && <button onClick={() => window.confirm("경기를 나가면 기권패로 처리됩니다. 나갈까요?") && game.forfeit()} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-red-100 hover:text-red-600" title="경기 나가기"><LogOut size={18}/></button>}</div></div>

      {opponent?.connectionStatus === "RECONNECTING" && <div className="mb-5 rounded-2xl bg-amber-100 px-5 py-4 text-center font-bold text-amber-800">상대의 연결이 끊겼습니다. 10초 동안 복귀를 기다립니다.</div>}

      {game.snapshot.state === "READY" && <section className="rounded-3xl bg-white p-10 text-center shadow-xl"><div className="text-6xl">🤝</div><h2 className="mt-4 text-2xl font-black">상대: {game.match.opponentNickname}</h2><p className="mt-2 text-slate-500">두 플레이어가 준비하면 제작을 시작합니다.</p><button disabled={me?.ready} onClick={game.ready} className="mt-6 rounded-2xl bg-violet-600 px-8 py-4 font-black text-white disabled:bg-emerald-500">{me?.ready ? "준비 완료 · 상대 대기 중" : "준비 완료"}</button></section>}

      {game.snapshot.state === "EDITING" && <section><div className="mb-4 text-center"><h2 className="text-2xl font-black">그림에 차이점 3개를 직접 만드세요</h2><p className="text-sm text-slate-500">그림의 영역을 선택하고 나무 팔레트의 색으로 변경하세요.</p></div><div className="mx-auto max-w-5xl"><FreeformEditor value={draft} onChange={setDraft} disabled={Boolean(me?.submitted) || submitting} /></div><div className="mt-5 flex justify-center"><button disabled={draft.length !== GAME_CONFIG.differenceCount || Boolean(me?.submitted) || submitting} onClick={async () => { setSubmitting(true); try { game.submit(draft, await renderProblemImage(draft)); } finally { setSubmitting(false); } }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-black text-white disabled:opacity-40"><Send size={18}/>{me?.submitted ? "제출 완료 · 상대 대기 중" : submitting ? "문제 이미지 생성 중" : `제출 ${draft.length}/${GAME_CONFIG.differenceCount}`}</button></div></section>}

      {game.snapshot.state === "FINDING" && <section><div className="mb-4 text-center"><h2 className="text-2xl font-black">상대가 만든 차이를 찾으세요</h2><p className="text-sm text-slate-500">오른쪽 수정 그림을 클릭하세요. 오답은 3초가 차감됩니다.</p>{Boolean(opponent?.autoFilledCount) && <p className="mt-2 font-bold text-amber-600">제작 시간 초과로 {opponent?.autoFilledCount}개가 자동 보충되었습니다.</p>}</div><div className="grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-center text-sm font-black">원본</p><ImageBoard/></div><div><p className="mb-2 text-center text-sm font-black">상대의 수정 그림</p><div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl cursor-crosshair" onClick={(event) => game.guess(pointFromEvent(event))}><img src={game.snapshot.problemImageDataUrl ?? gameSceneImg} alt="상대가 수정한 문제 그림" className="block h-auto w-full select-none" draggable={false}/>{game.snapshot.autoFillOverlayDataUrl && <img src={game.snapshot.autoFillOverlayDataUrl} alt="자동 보충된 차이점" className="pointer-events-none absolute inset-0 h-full w-full"/>}{game.hintArea && <span style={{ left: `${game.hintArea.x * 100}%`, top: `${game.hintArea.y * 100}%`, width: `${game.hintArea.radius * 200}%`, aspectRatio: "1" }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-dashed border-amber-400 bg-amber-200/25"/>}</div></div></div><div className="mt-5 flex justify-center gap-3"><button disabled={!me?.hintsRemaining} onClick={game.hint} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black disabled:opacity-40"><Eye size={18}/>힌트 {me?.hintsRemaining ?? 0}</button>{game.lastGuess && <span className={`rounded-xl px-5 py-3 font-black ${game.lastGuess.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{game.lastGuess.correct ? "정답!" : "오답 · 3초 차감"}</span>}</div></section>}

      {game.snapshot.state === "FINISHED" && <section className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl"><div className="text-7xl">{game.snapshot.winnerId === game.match.playerId ? "🏆" : game.snapshot.winnerId ? "😿" : "🤝"}</div><h2 className="mt-4 text-3xl font-black">{game.snapshot.winnerId === game.match.playerId ? "승리했습니다!" : game.snapshot.winnerId ? "아쉽게 패배했습니다" : "무승부입니다"}</h2>{game.snapshot.endReason === "FORFEIT" && <p className="mt-2 font-bold text-amber-600">{game.snapshot.winnerId === game.match.playerId ? "상대가 경기를 이탈했습니다." : "경기 이탈로 기권 처리되었습니다."}</p>}<div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-violet-50 p-4"><p className="text-sm text-slate-500">내 결과</p><p className="text-xl font-black">{me?.foundCount}/3 · 오답 {me?.wrongAnswerCount}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">상대 결과</p><p className="text-xl font-black">{opponent?.foundCount}/3 · 오답 {opponent?.wrongAnswerCount}</p></div></div><button onClick={game.returnToLobby} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 font-black text-white"><RotateCcw size={19}/>로비로 돌아가기</button></section>}

      {game.snapshot.state === "CANCELLED" && <section className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl"><div className="text-7xl">🛠️</div><h2 className="mt-4 text-3xl font-black">경기가 취소되었습니다</h2><p className="mt-2 text-slate-500">{game.snapshot.cancelReason ?? "서버 오류로 경기를 계속할 수 없습니다."}</p><p className="mt-2 font-bold text-emerald-600">이 경기는 승패 기록에 포함되지 않습니다.</p><button onClick={game.returnToLobby} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 font-black text-white"><RotateCcw size={19}/>로비로 돌아가기</button></section>}

      {(game.snapshot.state === "FINISHED" || game.snapshot.state === "CANCELLED") && <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow"><select value={reportReason} onChange={(event) => setReportReason(event.target.value as ReportReason)} disabled={Boolean(game.reportId)} className="rounded-xl border px-3 py-2"><option value="UNFAIR">불공정한 문제</option><option value="INAPPROPRIATE">부적절한 표현</option><option value="SYSTEM_ERROR">시스템 오류</option><option value="OTHER">기타</option></select><button disabled={Boolean(game.reportId)} onClick={() => game.report(reportReason, window.prompt("추가 설명이 있으면 입력해주세요.") ?? undefined)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 font-bold text-white disabled:bg-emerald-600"><Flag size={16}/>{game.reportId ? "신고 접수 완료" : "문제 신고"}</button></div>}

      {!game.connected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4"><div className="rounded-3xl bg-white p-8 text-center shadow-2xl"><WifiOff className="mx-auto text-red-500" size={48}/><h3 className="mt-3 text-xl font-black">서버와 다시 연결 중입니다</h3><p className="mt-2 text-sm text-slate-500">연결이 복구될 때까지 입력이 잠깁니다.</p></div></div>}
      {game.error && <button onClick={game.clearError} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-xl">{game.error.message} · 닫기</button>}
    </Shell>
  );
}
