import {
  GAME_CONFIG,
  getSystemSceneDifferences,
  type AnswerRegion,
  type Difference,
  type FoundMark,
  type NormalizedPoint,
  type ReportReason,
  type RevealedDifference,
} from "@spot-battle/shared";
import { ArrowLeft, Clock, Eye, Flag, LoaderCircle, LogOut, Play, RotateCcw, Send, UserRound, UsersRound, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { FreeformEditor, buildAutoFilledDifferences, renderProblemImage } from "./FreeformEditor";
import {
  DEFAULT_GAME_SCENE,
  getGameScene,
  type GameSceneDefinition,
} from "./game-scenes";
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

function RegionMarker({
  region,
  found,
  label,
}: {
  region: AnswerRegion;
  found: boolean;
  label: string;
}) {
  return (
    <span
      style={{
        left: `${region.x * 100}%`,
        top: `${region.y * 100}%`,
        width: `${region.radius * 200}%`,
        aspectRatio: "1",
      }}
      className={`pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-lg font-black ${
        found
          ? "border-4 border-emerald-400 bg-emerald-300/35 text-emerald-900"
          : "border-4 border-dashed border-red-500 bg-red-300/25 text-red-700"
      }`}
    >
      {label}
    </span>
  );
}

function BoardFrame({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect?: (point: NormalizedPoint) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl ${onSelect ? "cursor-crosshair" : ""}`}
      onClick={onSelect ? (event) => onSelect(pointFromEvent(event)) : undefined}
    >
      {children}
    </div>
  );
}

/** 원본 그림. 아무 표시도 얹지 않는다. */
function OriginalBoard({ scene }: { scene: GameSceneDefinition }) {
  return (
    <BoardFrame>
      <img src={scene.imageSrc} alt="게임 원본 그림" className="block h-auto w-full select-none" draggable={false} />
    </BoardFrame>
  );
}

/**
 * 상대가 만든 문제.
 *
 * 서버에서 받은 것은 합성이 끝난 이미지 한 장뿐이다.
 * 제작 명령이나 미발견 정답 좌표는 이 화면에 존재하지 않으므로
 * 개발자도구를 열어도 답을 미리 볼 수 없다.
 */
function ProblemBoard({
  imageSrc,
  imageAlt = "오류가 포함된 그림",
  foundMarks,
  hintArea,
  reveal,
  onSelect,
}: {
  imageSrc: string | null;
  imageAlt?: string;
  foundMarks: FoundMark[];
  hintArea?: AnswerRegion | null;
  reveal?: RevealedDifference[] | null;
  onSelect?: (point: NormalizedPoint) => void;
}) {
  if (!imageSrc) {
    return (
      <BoardFrame>
        <div className="grid aspect-video place-items-center bg-slate-100 text-sm font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <LoaderCircle className="animate-spin" size={18} />
            문제 이미지를 준비하는 중입니다
          </span>
        </div>
      </BoardFrame>
    );
  }

  return (
    <BoardFrame onSelect={onSelect}>
      <img src={imageSrc} alt={imageAlt} className="block h-auto w-full select-none" draggable={false} />
      {reveal
        ? reveal.map((difference) => (
            <RegionMarker
              key={difference.id}
              region={difference.region}
              found={difference.found}
              label={difference.found ? "✓" : "✗"}
            />
          ))
        : foundMarks.map((mark) => (
            <RegionMarker key={mark.differenceId} region={mark.region} found label="✓" />
          ))}
      {hintArea && !reveal && (
        <span
          style={{
            left: `${hintArea.x * 100}%`,
            top: `${hintArea.y * 100}%`,
            width: `${hintArea.radius * 200}%`,
            aspectRatio: "1",
          }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-dashed border-amber-400 bg-amber-200/25"
        />
      )}
    </BoardFrame>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-100 via-white to-amber-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

function isPointInside(point: NormalizedPoint, region: AnswerRegion): boolean {
  return Math.hypot(point.x - region.x, point.y - region.y) <= region.radius;
}

function SoloTestMode({
  header,
  onExit,
}: {
  header: React.ReactNode;
  onExit: () => void;
}) {
  const scene = DEFAULT_GAME_SCENE;
  const [stage, setStage] = useState<"EDITING" | "READY" | "FINDING" | "FINISHED">("EDITING");
  const [draft, setDraft] = useState<Difference[]>([]);
  const [problemImage, setProblemImage] = useState<string | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [foundMarks, setFoundMarks] = useState<FoundMark[]>([]);
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [hintArea, setHintArea] = useState<AnswerRegion | null>(null);
  const [hintRemaining, setHintRemaining] = useState(1);
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
  const [rendering, setRendering] = useState(false);
  const remaining = useRemainingSeconds(deadlineMs, wrongAnswerCount);

  useEffect(() => {
    if (stage === "FINDING" && remaining === 0) setStage("FINISHED");
  }, [stage, remaining]);

  const finishEditing = async () => {
    if (draft.length !== GAME_CONFIG.differenceCount || rendering) return;
    setRendering(true);
    try {
      setProblemImage(await renderProblemImage(draft, scene));
      setStage("READY");
    } finally {
      setRendering(false);
    }
  };

  const startFinding = () => {
    setFoundIds(new Set());
    setFoundMarks([]);
    setWrongAnswerCount(0);
    setHintRemaining(1);
    setLastGuessCorrect(null);
    setDeadlineMs(Date.now() + GAME_CONFIG.findingDurationSeconds * 1_000);
    setStage("FINDING");
  };

  const guess = (point: NormalizedPoint) => {
    if (stage !== "FINDING") return;
    const hit = draft.find((difference) => isPointInside(point, difference.region));
    if (!hit) {
      setWrongAnswerCount((current) => current + 1);
      setLastGuessCorrect(false);
      return;
    }
    setLastGuessCorrect(true);
    if (foundIds.has(hit.id)) return;
    const next = new Set(foundIds).add(hit.id);
    setFoundIds(next);
    setFoundMarks((current) => [...current, { differenceId: hit.id, region: hit.region }]);
    if (next.size === GAME_CONFIG.differenceCount) setStage("FINISHED");
  };

  const useHint = () => {
    if (!hintRemaining) return;
    const target = draft.find((difference) => !foundIds.has(difference.id));
    if (!target) return;
    setHintRemaining(0);
    setHintArea({ ...target.region, radius: Math.min(target.region.radius * 2.3, 0.25) });
    window.setTimeout(() => setHintArea(null), 2_000);
  };

  return (
    <Shell>
      {header}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm">
        <span className="inline-flex items-center gap-2 font-black text-violet-700"><UserRound size={18}/>1인 테스트 모드</span>
        <button onClick={onExit} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold"><ArrowLeft size={16}/>로비</button>
      </div>

      {stage === "EDITING" && (
        <section>
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-black">객체 3개를 수정하세요</h2>
            <p className="text-sm text-slate-500">수정 완료를 누르면 편집 화면이 완전히 닫히고 찾기 단계가 시작됩니다.</p>
          </div>
          <div className="mx-auto max-w-5xl"><FreeformEditor value={draft} onChange={setDraft} scene={scene}/></div>
          <div className="mt-5 text-center">
            <button disabled={draft.length !== GAME_CONFIG.differenceCount || rendering} onClick={() => void finishEditing()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3 font-black text-white disabled:opacity-40">
              {rendering ? <LoaderCircle className="animate-spin" size={18}/> : <Send size={18}/>}
              {rendering ? "문제 이미지 만드는 중" : `수정 완료 ${draft.length}/${GAME_CONFIG.differenceCount}`}
            </button>
          </div>
        </section>
      )}

      {stage === "READY" && (
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="text-6xl">🙈</div>
          <h2 className="mt-4 text-2xl font-black">수정이 완료되었습니다</h2>
          <p className="mt-2 text-slate-500">편집 화면과 선택 정보는 숨겨졌습니다. 준비되면 찾기를 시작하세요.</p>
          <button onClick={startFinding} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-8 py-4 font-black text-slate-900"><Play size={19}/>찾기 시작</button>
        </section>
      )}

      {stage === "FINDING" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-center">
            <div><h2 className="text-2xl font-black">수정된 객체를 찾으세요</h2><p className="text-sm text-slate-500">오답은 3초 차감됩니다.</p></div>
            <span className={`flex items-center gap-2 rounded-full px-4 py-2 font-black ${(remaining ?? 0) <= 10 ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-700"}`}><Clock size={18}/>{remaining ?? 0}초 · {foundIds.size}/{GAME_CONFIG.differenceCount}</span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div><p className="mb-2 text-center text-sm font-black">원본</p><OriginalBoard scene={scene}/></div>
            <div><p className="mb-2 text-center text-sm font-black">수정 그림</p><ProblemBoard imageSrc={problemImage} foundMarks={foundMarks} hintArea={hintArea} onSelect={guess}/></div>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <button disabled={!hintRemaining} onClick={useHint} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black disabled:opacity-40"><Eye size={18}/>힌트 {hintRemaining}</button>
            {lastGuessCorrect !== null && <span className={`rounded-xl px-5 py-3 font-black ${lastGuessCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{lastGuessCorrect ? "정답!" : "오답 · 3초 차감"}</span>}
          </div>
        </section>
      )}

      {stage === "FINISHED" && (
        <section className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="text-7xl">{foundIds.size === GAME_CONFIG.differenceCount ? "🎉" : "⏰"}</div>
          <h2 className="mt-4 text-3xl font-black">{foundIds.size === GAME_CONFIG.differenceCount ? "모두 찾았습니다!" : "테스트 시간이 끝났습니다"}</h2>
          <p className="mt-3 font-bold text-slate-600">정답 {foundIds.size}/{GAME_CONFIG.differenceCount} · 오답 {wrongAnswerCount}</p>
          {problemImage && <div className="mt-6"><ProblemBoard imageSrc={problemImage} foundMarks={foundMarks} reveal={draft.map((difference) => ({ id: difference.id, kind: difference.kind, region: difference.region, found: foundIds.has(difference.id) }))}/></div>}
          <div className="mt-7 flex justify-center gap-3">
            <button onClick={() => { setStage("EDITING"); setDraft([]); setProblemImage(null); }} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 font-black text-white"><RotateCcw size={19}/>다시 테스트</button>
            <button onClick={onExit} className="rounded-2xl bg-slate-100 px-7 py-4 font-black">로비로</button>
          </div>
        </section>
      )}
    </Shell>
  );
}

export default function MvpApp() {
  const game = useGameClient();
  const scene = getGameScene(game.snapshot?.imageId);
  const [nicknameInput, setNicknameInput] = useState(game.nickname);
  const [soloMode, setSoloMode] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("UNFAIR");
  const me = game.snapshot?.players.find((player) => player.playerId === game.match?.playerId);
  const opponent = game.snapshot?.players.find((player) => player.playerId !== game.match?.playerId);
  const remaining = useRemainingSeconds(game.snapshot?.deadlineMs, me?.wrongAnswerCount ?? 0);
  const [systemProblemImage, setSystemProblemImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSystemProblemImage(null);
    void renderProblemImage(getSystemSceneDifferences(scene.id), scene).then((image) => {
      if (active) setSystemProblemImage(image);
    });
    return () => { active = false; };
  }, [scene]);

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
    return <Shell>{header}<section className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><div className="mb-4 text-5xl">👋</div><h2 className="text-2xl font-black">닉네임을 정해주세요</h2><p className="mt-2 text-sm text-slate-500">계정 없이 바로 시작할 수 있습니다.</p><input data-testid="nickname-input" aria-label="닉네임" autoFocus value={nicknameInput} onChange={(event) => setNicknameInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && game.saveNickname(nicknameInput)} maxLength={16} placeholder="2~16자 닉네임" className="mt-6 w-full rounded-2xl border-2 border-violet-200 px-4 py-3 text-center font-bold outline-none focus:border-violet-500"/><button data-testid="nickname-submit" onClick={() => game.saveNickname(nicknameInput)} className="mt-3 w-full rounded-2xl bg-violet-600 py-3 font-black text-white hover:bg-violet-700">시작하기</button></section></Shell>;
  }

  if (soloMode) {
    return <SoloTestMode header={header} onExit={() => setSoloMode(false)} />;
  }

  if (game.phase === "LOBBY") {
    return (
      <Shell>
        {header}
        <section className="mx-auto max-w-3xl rounded-3xl bg-violet-700 p-10 text-center text-white shadow-xl">
          <div className="text-6xl">⚔️</div>
          <h2 className="mt-4 text-3xl font-black">틀린그림찾기 시작</h2>
          <p className="mt-2 text-violet-200">같은 원본과 오류 그림을 보고 상대보다 더 많은 차이를 찾습니다.</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm"><span className="rounded-xl bg-white/10 p-3">동일 문제 대결</span><span className="rounded-xl bg-white/10 p-3">풀이 60초</span><span className="rounded-xl bg-white/10 p-3">좌우 모두 클릭</span></div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button data-testid="matchmaking-start" disabled={!game.connected} onClick={game.startMatching} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-8 py-4 font-black text-slate-900 disabled:opacity-40"><UsersRound size={20}/>{game.connected ? "온라인 상대 찾기" : "서버 연결 중"}</button>
            <button onClick={() => setSoloMode(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-violet-700"><UserRound size={20}/>1인 테스트 모드</button>
          </div>
        </section>
      </Shell>
    );
  }

  if (game.phase === "MATCHING") {
    return <Shell>{header}<section data-testid="matching-screen" className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-xl"><LoaderCircle className="mx-auto animate-spin text-violet-600" size={56}/><h2 className="mt-5 text-2xl font-black">상대를 찾는 중...</h2><p className="mt-2 text-sm text-slate-500">잠시만 기다려주세요.</p><button onClick={game.cancelMatching} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 font-bold"><X size={18}/>매칭 취소</button></section></Shell>;
  }

  if (!game.snapshot || !game.match) {
    return <Shell>{header}<div className="text-center"><LoaderCircle className="mx-auto animate-spin"/>경기 정보를 불러오는 중입니다.</div></Shell>;
  }

  return (
    <Shell>
      {header}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm">
        <div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">실시간 찾기 배틀</span>
          <span className="ml-3 font-black">내 결과 {me?.foundCount ?? 0}/{GAME_CONFIG.differenceCount} · 오답 {me?.wrongAnswerCount ?? 0} · 상대 {opponent?.foundCount ?? 0}/{GAME_CONFIG.differenceCount}</span>
        </div>
        <div className="flex items-center gap-2">{remaining !== null && <span className={`flex items-center gap-2 rounded-full px-4 py-2 font-black ${remaining <= 10 ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-700"}`}><Clock size={18}/>{remaining}초</span>}{game.snapshot.state !== "FINISHED" && <button data-testid="forfeit-button" onClick={() => window.confirm("경기를 나가면 기권패로 처리됩니다. 나갈까요?") && game.forfeit()} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-red-100 hover:text-red-600" title="경기 나가기"><LogOut size={18}/></button>}</div>
      </div>

      {opponent?.connectionStatus === "RECONNECTING" && <div className="mb-5 rounded-2xl bg-amber-100 px-5 py-4 text-center font-bold text-amber-800">상대의 연결이 끊겼습니다. 10초 동안 복귀를 기다립니다.</div>}

      {game.snapshot.state === "READY" && <section data-testid="ready-screen" className="rounded-3xl bg-white p-10 text-center shadow-xl"><div className="text-6xl">🔍</div><h2 className="mt-4 text-2xl font-black">상대: {game.match.opponentNickname}</h2><p className="mt-2 font-black text-violet-700">같은 틀린그림 문제로 대결합니다</p><p className="mt-2 text-slate-500">양쪽이 준비하면 바로 시작합니다. 원본과 오류 그림 어느 쪽을 눌러도 정답 처리됩니다.</p><button data-testid="ready-button" disabled={me?.ready} onClick={game.ready} className="mt-6 rounded-2xl bg-violet-600 px-8 py-4 font-black text-white disabled:bg-emerald-500">{me?.ready ? "준비 완료 · 상대 대기 중" : "준비 완료"}</button></section>}

      {game.snapshot.state === "FINDING" && (
          <section data-testid="finding-screen">
            <div className="mb-4 text-center"><h2 className="text-2xl font-black">두 그림의 차이를 찾으세요</h2><p className="text-sm text-slate-500">원본·오류 그림 어느 쪽의 같은 위치를 눌러도 정답입니다. 오답은 3초가 차감됩니다.</p></div>
            <div className="grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-center text-sm font-black">원본</p><ProblemBoard imageSrc={scene.imageSrc} imageAlt="원본 그림" foundMarks={game.foundMarks} hintArea={game.hintArea} onSelect={game.guess}/></div><div><p className="mb-2 text-center text-sm font-black">오류 그림</p><ProblemBoard imageSrc={systemProblemImage} imageAlt="오류가 포함된 그림" foundMarks={game.foundMarks} hintArea={game.hintArea} onSelect={systemProblemImage ? game.guess : undefined}/></div></div>
            <div className="mt-5 flex justify-center gap-3"><button disabled={!me?.hintsRemaining} onClick={game.hint} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black disabled:opacity-40"><Eye size={18}/>힌트 {me?.hintsRemaining ?? 0}</button>{game.lastGuess && <span className={`rounded-xl px-5 py-3 font-black ${game.lastGuess.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>{game.lastGuess.correct ? "정답!" : "오답 · 3초 차감"}</span>}</div>
          </section>
      )}

      {game.snapshot.state === "FINISHED" && (
        <section data-testid="finished-screen" className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="text-7xl">{game.snapshot.winnerId === game.match.playerId ? "🏆" : game.snapshot.winnerId ? "😿" : "🤝"}</div>
          <h2 className="mt-4 text-3xl font-black">{game.snapshot.winnerId === game.match.playerId ? "승리했습니다!" : game.snapshot.winnerId ? "아쉽게 패배했습니다" : "결과를 확정할 수 없습니다"}</h2>
          {game.snapshot.endReason === "FORFEIT" && <p className="mt-2 font-bold text-amber-600">{game.snapshot.winnerId === game.match.playerId ? "상대가 경기를 이탈했습니다." : "경기 이탈로 기권 처리되었습니다."}</p>}
          <div className="mt-6 rounded-2xl bg-violet-50 p-5">
            <p className="text-sm text-slate-500">내 찾기 결과</p>
            <p className="mt-1 text-2xl font-black">{me?.foundCount}/{GAME_CONFIG.differenceCount} · 오답 {me?.wrongAnswerCount}</p>
            <p className="mt-1 text-xs text-slate-500">상대 {opponent?.foundCount}/{GAME_CONFIG.differenceCount} · 오답 {opponent?.wrongAnswerCount} · 내 힌트 {GAME_CONFIG.hintsPerGame - (me?.hintsRemaining ?? 0)}회 사용</p>
          </div>
          {game.snapshot.revealedDifferences && systemProblemImage && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-black">전체 차이점과 내 결과</p>
              <ProblemBoard imageSrc={systemProblemImage} foundMarks={game.foundMarks} reveal={game.snapshot.revealedDifferences}/>
              <p className="mt-2 text-xs text-slate-500">초록 ✓ 찾은 곳 · 빨강 ✗ 놓친 곳</p>
            </div>
          )}
          <button onClick={game.returnToLobby} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 font-black text-white"><RotateCcw size={19}/>로비로 돌아가기</button>
        </section>
      )}

      {game.snapshot.state === "CANCELLED" && <section className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl"><div className="text-7xl">🛠️</div><h2 className="mt-4 text-3xl font-black">경기가 취소되었습니다</h2><p className="mt-2 text-slate-500">{game.snapshot.cancelReason ?? "서버 오류로 경기를 계속할 수 없습니다."}</p><p className="mt-2 font-bold text-emerald-600">이 경기는 승패 기록에 포함되지 않습니다.</p><button onClick={game.returnToLobby} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 font-black text-white"><RotateCcw size={19}/>로비로 돌아가기</button></section>}

      {(game.snapshot.state === "FINISHED" || game.snapshot.state === "CANCELLED") && <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow"><select value={reportReason} onChange={(event) => setReportReason(event.target.value as ReportReason)} disabled={Boolean(game.reportId)} className="rounded-xl border px-3 py-2"><option value="UNFAIR">불공정한 문제</option><option value="INAPPROPRIATE">부적절한 표현</option><option value="SYSTEM_ERROR">시스템 오류</option><option value="OTHER">기타</option></select><button disabled={Boolean(game.reportId)} onClick={() => game.report(reportReason, window.prompt("추가 설명이 있으면 입력해주세요.") ?? undefined)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 font-bold text-white disabled:bg-emerald-600"><Flag size={16}/>{game.reportId ? "신고 접수 완료" : "문제 신고"}</button></div>}

      {!game.connected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4"><div className="rounded-3xl bg-white p-8 text-center shadow-2xl"><WifiOff className="mx-auto text-red-500" size={48}/><h3 className="mt-3 text-xl font-black">서버와 다시 연결 중입니다</h3><p className="mt-2 text-sm text-slate-500">연결이 복구될 때까지 입력이 잠깁니다.</p></div></div>}
      {game.error && <button onClick={game.clearError} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-xl">{game.error.message} · 닫기</button>}
    </Shell>
  );
}
