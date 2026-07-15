import { useState, useEffect, useCallback } from "react";
import {
  Home, Sword, Trophy, ShoppingBag, Gift, Users,
  Clock, Check, X, Plus, Zap, Crown, Bell,
  Trash2, Move, Maximize2, Palette, Star,
  Copy, Share2, Settings, Mail, Award, Flag,
  ChevronRight, Search, Heart,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import gameSceneImg from "@/imports/image.png";

type Screen =
  | "lobby"
  | "matching"
  | "editor"
  | "gameplay"
  | "results"
  | "ranking"
  | "shop"
  | "season"
  | "profile"
  | "friends"
  | "invite";

const PLAYER = { name: "별빛냥이", level: 24, coins: 3840, diamonds: 12, avatar: "🐱", winRate: 68 };

// ── Shared UI Atoms ─────────────────────────────────────────────────────────

function Badge({ children, color = "purple" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-600",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors[color] || colors.purple}`}>
      {children}
    </span>
  );
}

function ProgressDots({ found, total }: { found: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
            i < found ? "bg-purple-500 border-purple-500 scale-110" : "border-gray-300 bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function TimerBar({ timeLeft, total, warn = 15 }: { timeLeft: number; total: number; warn?: number }) {
  const pct = (timeLeft / total) * 100;
  const danger = timeLeft <= warn;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-1000 ${danger ? "bg-red-400" : "bg-purple-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-purple-100 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm shadow-purple-100/40">
      <button
        onClick={() => onNav("lobby")}
        className="flex items-center gap-2 group"
      >
        <span className="text-2xl">🔍</span>
        <span className="font-black text-purple-700 text-lg leading-none">틀린그림찾기</span>
      </button>

      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5">
          <span className="text-base leading-none">🪙</span>
          <span className="font-black text-yellow-700 text-sm">{PLAYER.coins.toLocaleString()}</span>
          <button className="w-4 h-4 rounded-full bg-yellow-300 flex items-center justify-center ml-0.5 hover:bg-yellow-400 transition-colors">
            <Plus size={10} className="text-yellow-800" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
          <span className="text-base leading-none">💎</span>
          <span className="font-black text-blue-700 text-sm">{PLAYER.diamonds}</span>
          <button className="w-4 h-4 rounded-full bg-blue-300 flex items-center justify-center ml-0.5 hover:bg-blue-400 transition-colors">
            <Plus size={10} className="text-blue-800" />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-purple-600 rounded-full px-3 py-1.5">
          <Crown size={13} className="text-yellow-300" />
          <span className="font-black text-white text-sm">Lv.{PLAYER.level}</span>
        </div>
        <button className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-400 hover:bg-purple-100 transition-colors relative">
          <Bell size={15} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </button>
        <button
          onClick={() => onNav("profile")}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xl shadow-md hover:scale-105 transition-transform"
        >
          {PLAYER.avatar}
        </button>
      </div>
    </header>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "lobby", label: "홈", icon: Home },
  { id: "matching", label: "대전", icon: Sword },
  { id: "ranking", label: "랭킹", icon: Trophy },
  { id: "shop", label: "상점", icon: ShoppingBag },
  { id: "season", label: "시즌", icon: Gift },
  { id: "invite", label: "친구 초대", icon: Users },
];

function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <nav className="w-[72px] bg-white/90 backdrop-blur-md border-r border-purple-100 flex flex-col items-center pt-4 pb-4 gap-1 fixed left-0 top-[53px] h-[calc(100vh-53px)] z-40 overflow-y-auto">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = screen === id || (id === "matching" && ["matching", "editor", "gameplay", "results"].includes(screen));
        return (
          <button
            key={id}
            onClick={() => setScreen(id as Screen)}
            className={`w-[58px] flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all ${
              active
                ? "bg-purple-600 text-white shadow-lg shadow-purple-300/40"
                : "text-purple-300 hover:bg-purple-50 hover:text-purple-600"
            }`}
          >
            <Icon size={19} />
            <span className="text-[9.5px] font-black leading-none text-center">{label}</span>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col gap-1">
        {[
          { id: "profile", icon: "😸", label: "프로필" },
          { id: "friends", icon: "👥", label: "친구" },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setScreen(id as Screen)}
            className="w-[58px] flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-purple-300 hover:bg-purple-50 hover:text-purple-600 transition-all"
          >
            <span className="text-lg">{icon}</span>
            <span className="text-[9.5px] font-black leading-none">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ── Lobby Screen ─────────────────────────────────────────────────────────────

function LobbyScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [activeQuests] = useState([
    { label: "대전 1회 플레이", done: true, reward: "🪙 50" },
    { label: "차이점 5개 찾기", done: true, reward: "🪙 100" },
    { label: "연속 정답 3개", done: false, reward: "💎 2" },
  ]);

  const recentMatches = [
    { opp: "달콤토끼", avatar: "🐰", result: "승", time: "12분 전", score: "5:3" },
    { opp: "하늘곰돌이", avatar: "🐻", result: "패", time: "1시간 전", score: "2:5" },
    { opp: "무지개여우", avatar: "🦊", result: "승", time: "3시간 전", score: "5:4" },
  ];

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-3xl p-6 text-white overflow-hidden">
        <div className="absolute -right-4 -top-4 text-[120px] opacity-10 select-none rotate-12">🔍</div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 text-8xl select-none">⭐</div>
        <div className="relative">
          <p className="text-purple-200 text-sm font-semibold mb-0.5">오늘도 대결하러 왔군요!</p>
          <h1 className="text-2xl font-black mb-3">{PLAYER.name} 님 환영합니다 👋</h1>
          <div className="flex gap-3">
            {[
              { label: "총 승리", val: "142" },
              { label: "승률", val: "68%" },
              { label: "현재 연승", val: "3" },
              { label: "시즌 레벨", val: "Lv.7" },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
                <div className="text-[10px] text-purple-200 font-semibold">{label}</div>
                <div className="font-black text-lg">{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game modes */}
      <section>
        <h2 className="font-black text-foreground/80 text-sm uppercase tracking-wider mb-3">게임 모드 선택</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              id: "matching",
              emoji: "⚔️",
              title: "빠른 대전",
              sub: "실시간 랜덤 매칭",
              badge: "52명 접속 중",
              badgeColor: "purple",
              border: "border-purple-100 hover:border-purple-400 hover:shadow-purple-100",
            },
            {
              id: "gameplay",
              emoji: "📅",
              title: "데일리 도전",
              sub: "매일 새로운 문제",
              badge: "오늘 미완료",
              badgeColor: "orange",
              border: "border-orange-100 hover:border-orange-400 hover:shadow-orange-100",
            },
            {
              id: "invite",
              emoji: "👫",
              title: "친구 대전",
              sub: "초대 링크로 대결",
              badge: "링크 생성",
              badgeColor: "green",
              border: "border-green-100 hover:border-green-400 hover:shadow-green-100",
            },
          ].map(({ id, emoji, title, sub, badge, badgeColor, border }) => (
            <button
              key={id}
              onClick={() => setScreen(id as Screen)}
              className={`bg-white rounded-2xl p-5 border-2 ${border} hover:shadow-lg transition-all group text-left`}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform inline-block">{emoji}</div>
              <div className="font-black text-foreground text-base">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-3">{sub}</div>
              <Badge color={badgeColor}>{badge}</Badge>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily Quest */}
        <div className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-foreground text-sm">📋 오늘의 퀘스트</h3>
            <span className="text-xs text-orange-500 font-black">2/3 완료</span>
          </div>
          <div className="space-y-2">
            {activeQuests.map((q, i) => (
              <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${q.done ? "bg-green-50" : "bg-purple-50"}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${q.done ? "bg-green-500" : "bg-purple-200"}`}>
                  {q.done && <Check size={11} className="text-white" />}
                </div>
                <span className={`text-xs flex-1 font-semibold ${q.done ? "text-gray-400 line-through" : "text-foreground"}`}>
                  {q.label}
                </span>
                <span className="text-xs font-black text-gray-600">{q.reward}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent matches */}
        <div className="bg-white rounded-2xl p-5 border border-purple-50 shadow-sm">
          <h3 className="font-black text-foreground text-sm mb-3">📊 최근 전적</h3>
          <div className="space-y-2.5">
            {recentMatches.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${
                  r.result === "승" ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {r.result}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-lg">
                  {r.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-foreground">{r.opp}</div>
                  <div className="text-[10px] text-muted-foreground">{r.time}</div>
                </div>
                <div className={`text-sm font-black ${r.result === "승" ? "text-purple-600" : "text-gray-400"}`}>
                  {r.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Season teaser */}
      <button
        onClick={() => setScreen("season")}
        className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 flex items-center gap-4 hover:from-yellow-500 hover:to-orange-500 transition-all shadow-md shadow-orange-200/40 group"
      >
        <div className="text-3xl group-hover:scale-110 transition-transform">👑</div>
        <div className="flex-1 text-left">
          <div className="font-black text-white text-sm">시즌 1 패스 진행 중 · 레벨 7</div>
          <div className="text-orange-100 text-xs">다음 보상까지 340 XP</div>
          <div className="mt-1.5 bg-white/30 rounded-full h-1.5 w-48">
            <div className="bg-white h-1.5 rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
        <ChevronRight size={20} className="text-white" />
      </button>
    </div>
  );
}

// ── Matching Screen ───────────────────────────────────────────────────────────

function MatchingScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [phase, setPhase] = useState<"searching" | "found">("searching");
  const [dots, setDots] = useState(".");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDots(p => (p.length >= 3 ? "." : p + ".")), 500);
    const f = setTimeout(() => setPhase("found"), 3500);
    return () => { clearInterval(d); clearTimeout(f); };
  }, []);

  useEffect(() => {
    if (phase !== "found") return;
    const t = setInterval(() => setTick(n => n + 1), 100);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-purple-100/50 max-w-sm w-full border border-purple-100">
        <h2 className="text-center font-black text-foreground text-xl mb-1">
          {phase === "searching" ? `상대방 찾는 중${dots}` : "매칭 완료! 🎉"}
        </h2>
        <p className="text-center text-xs text-muted-foreground mb-7">
          {phase === "searching" ? "비슷한 실력의 상대를 탐색합니다" : "곧 차이점 제작이 시작됩니다"}
        </p>

        <div className="flex items-center gap-3 mb-8">
          {/* My card */}
          <div className="flex-1 text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl shadow-lg ring-4 ring-purple-200">
                {PLAYER.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">
                Lv.{PLAYER.level}
              </div>
            </div>
            <div className="font-black text-foreground text-sm">{PLAYER.name}</div>
            <div className="text-[10px] text-purple-500 font-semibold mt-0.5">승률 {PLAYER.winRate}%</div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center font-black text-white text-xs shadow-lg">
              VS
            </div>
          </div>

          {/* Opponent card */}
          <div className="flex-1 text-center">
            {phase === "searching" ? (
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 mx-auto mb-2 text-3xl">
                ?
              </div>
            ) : (
              <div className="relative w-20 h-20 mx-auto mb-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-4xl shadow-lg ring-4 ring-blue-200">
                  🐰
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">
                  Lv.22
                </div>
              </div>
            )}
            {phase === "found" ? (
              <>
                <div className="font-black text-foreground text-sm">달콤토끼</div>
                <div className="text-[10px] text-blue-500 font-semibold mt-0.5">승률 61%</div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground font-semibold mt-2 h-8 flex items-center justify-center">
                탐색 중{dots}
              </div>
            )}
          </div>
        </div>

        {phase === "searching" && (
          <div className="text-center mb-5">
            <div className="text-xs text-muted-foreground">예상 대기 시간</div>
            <div className="text-3xl font-black text-purple-600 mt-1">~15초</div>
          </div>
        )}

        {phase === "found" && (
          <div className="mb-5 bg-purple-50 rounded-2xl p-3 text-center border border-purple-100">
            <div className="text-xs font-black text-purple-700">두 플레이어에게 동일한 원본 그림이 제공됩니다</div>
            <div className="text-xs text-muted-foreground mt-1">30초 동안 차이점 5개를 만들어보세요!</div>
          </div>
        )}

        <div className="space-y-2.5">
          {phase === "found" && (
            <button
              onClick={() => setScreen("editor")}
              className="w-full bg-purple-600 text-white font-black rounded-xl py-3 hover:bg-purple-700 transition-colors shadow-md shadow-purple-200/60"
            >
              차이점 제작 시작하기 →
            </button>
          )}
          <button
            onClick={() => setScreen("lobby")}
            className="w-full bg-gray-100 text-gray-500 font-semibold rounded-xl py-2.5 hover:bg-gray-200 transition-colors text-sm"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Editor Screen ────────────────────────────────────────────────────────────

const EDITOR_TOOLS = [
  { id: "remove", icon: Trash2, label: "제거", color: "text-red-500", bg: "bg-red-50", ring: "ring-red-300" },
  { id: "add", icon: Plus, label: "추가", color: "text-green-600", bg: "bg-green-50", ring: "ring-green-300" },
  { id: "color", icon: Palette, label: "색상", color: "text-blue-500", bg: "bg-blue-50", ring: "ring-blue-300" },
  { id: "move", icon: Move, label: "이동", color: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-300" },
  { id: "resize", icon: Maximize2, label: "크기", color: "text-purple-500", bg: "bg-purple-50", ring: "ring-purple-300" },
];

const STICKERS = ["🐱", "🌸", "⭐", "🎀", "🌙", "🍀", "🦋", "🌈", "🎪", "🏠", "🐶", "🐸", "🍎", "🎸", "💫"];

function EditorScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [selectedTool, setSelectedTool] = useState("remove");
  const [timeLeft, setTimeLeft] = useState(30);
  const [differences, setDifferences] = useState<Array<{ type: string; label: string; x: number; y: number }>>([
    { type: "remove", label: "화분 제거", x: 28, y: 40 },
    { type: "color", label: "의자 색상 변경", x: 55, y: 65 },
    { type: "add", label: "고양이 스티커 추가", x: 72, y: 30 },
  ]);
  const [clickFx, setClickFx] = useState<{ x: number; y: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  const diffLabels: Record<string, string[]> = {
    remove: ["책상 제거", "램프 제거", "시계 제거", "화분 제거", "액자 제거"],
    add: ["하트 스티커", "별 스티커", "꽃 스티커", "구름 추가", "풍선 추가"],
    color: ["소파 색상", "커튼 색상", "러그 색상", "쿠션 색상", "테이블 색상"],
    move: ["테이블 이동", "의자 이동", "램프 이동"],
    resize: ["창문 크기", "그림 크기", "화분 크기"],
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setClickFx({ x, y });
    setTimeout(() => setClickFx(null), 700);
    if (differences.length < 5) {
      const opts = diffLabels[selectedTool] || ["차이점"];
      const label = opts[Math.floor(Math.random() * opts.length)];
      setDifferences(d => [...d, { type: selectedTool, label, x, y }]);
    }
  }, [differences.length, selectedTool]);

  const tool = EDITOR_TOOLS.find(t => t.id === selectedTool)!;

  return (
    <div className="flex h-[calc(100vh-53px)] overflow-hidden bg-gray-50">
      {/* Left tools panel */}
      <div className="w-[72px] bg-white border-r border-purple-50 flex flex-col items-center py-4 gap-2">
        <p className="text-[9px] font-black text-muted-foreground mb-1 uppercase tracking-wider">도구</p>
        {EDITOR_TOOLS.map(({ id, icon: Icon, label, color, bg, ring }) => {
          const active = selectedTool === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedTool(id)}
              className={`w-[56px] flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                active ? `${bg} ${color} ring-2 ${ring} shadow-sm` : "hover:bg-gray-50 text-gray-300"
              }`}
            >
              <Icon size={20} />
              <span className={`text-[9px] font-black leading-none ${active ? color : ""}`}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Center editing area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Timer header */}
        <div className="bg-white border-b border-purple-50 px-4 py-2.5 flex items-center gap-3">
          <div className={`flex items-center gap-1.5 font-black text-lg tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-foreground"}`}>
            <Clock size={18} />
            00:{timeLeft.toString().padStart(2, "0")}
          </div>
          <div className="flex-1">
            <TimerBar timeLeft={timeLeft} total={30} warn={10} />
          </div>
          <span className="text-sm font-black text-foreground">
            {differences.length}
            <span className="text-muted-foreground font-normal">/5</span>
          </span>
          <span className="text-xs text-muted-foreground">차이점</span>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 overflow-hidden">
          <div className="relative" style={{ cursor: "crosshair" }} onClick={handleClick}>
            <ImageWithFallback
              src={gameSceneImg}
              alt="원본 그림 — 차이점을 만들어보세요"
              className="rounded-2xl shadow-xl border-4 border-white object-contain"
              style={{ maxHeight: "340px", maxWidth: "520px" }}
            />
            {/* Tool hint */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              {(() => { const T = EDITOR_TOOLS.find(t => t.id === selectedTool)!.icon; return <T size={11} />; })()}
              {tool.label} 도구 선택됨
            </div>
            {/* Click ripple effect */}
            {clickFx && (
              <div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${clickFx.x}%`, top: `${clickFx.y}%` }}
              >
                <div className="w-10 h-10 rounded-full border-4 border-purple-400 animate-ping" />
              </div>
            )}
            {/* Difference markers */}
            {differences.map((d, i) => (
              <div
                key={i}
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/90 border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-lg cursor-pointer hover:bg-purple-700 transition-colors"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                onClick={(e) => { e.stopPropagation(); setDifferences(ds => ds.filter((_, j) => j !== i)); }}
                title="클릭하면 삭제"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Sticker tray */}
          {selectedTool === "add" && (
            <div className="bg-white rounded-2xl border border-purple-100 p-3 flex gap-2 overflow-x-auto max-w-[520px] w-full shadow-sm">
              {STICKERS.map((s, i) => (
                <button
                  key={i}
                  className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 hover:bg-purple-100 hover:scale-110 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — task list */}
      <div className="w-52 bg-white border-l border-purple-50 flex flex-col">
        <div className="p-3.5 border-b border-purple-50">
          <div className="font-black text-foreground text-sm">작업 목록</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {differences.length}개 완료 / 5개 필요
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {differences.map((d, i) => {
            const t = EDITOR_TOOLS.find(tool => tool.id === d.type)!;
            return (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border ${t.bg} border-transparent`}>
                <div className={`w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[9px] font-black uppercase tracking-wide ${t.color}`}>{t.label}</div>
                  <div className="text-xs text-foreground font-semibold truncate">{d.label}</div>
                </div>
                <button
                  onClick={() => setDifferences(ds => ds.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {differences.length < 5 && Array.from({ length: 5 - differences.length }, (_, i) => (
            <div key={`empty-${i}`} className="border-2 border-dashed border-gray-100 rounded-xl p-3 text-center text-muted-foreground text-[10px] leading-relaxed">
              {i === 0 ? "그림을 클릭해\n차이점을 추가하세요" : ""}
            </div>
          ))}
        </div>
        <div className="p-3">
          <button
            onClick={() => { if (differences.length >= 5) setScreen("gameplay"); }}
            className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
              differences.length >= 5
                ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200/60"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {differences.length >= 5 ? "제출하기 ✓" : `${5 - differences.length}개 더 필요`}
          </button>
          {differences.length >= 5 && (
            <p className="text-[10px] text-center text-muted-foreground mt-1.5">상대방도 제작 중입니다</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gameplay Screen ───────────────────────────────────────────────────────────

const HIDDEN_SPOTS = [
  { x: 28, y: 40 }, { x: 55, y: 65 }, { x: 72, y: 30 }, { x: 18, y: 70 }, { x: 63, y: 50 },
];

function GameplayScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [myFound, setMyFound] = useState(2);
  const [oppFound, setOppFound] = useState(3);
  const [clicks, setClicks] = useState<Array<{ x: number; y: number; correct: boolean }>>([]);
  const [hints, setHints] = useState(2);
  const [showHint, setShowHint] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) { setScreen("results"); return; }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, setScreen]);

  useEffect(() => {
    if (myFound >= 5) setTimeout(() => setScreen("results"), 600);
  }, [myFound, setScreen]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const correct = HIDDEN_SPOTS.some(
      s => myFound < 5 && Math.abs(s.x - px) < 12 && Math.abs(s.y - py) < 12
    );
    setClicks(c => [...c, { x: px, y: py, correct }]);
    if (correct) { setMyFound(v => v + 1); }
    else { setWrongFlash(true); setTimeout(() => setWrongFlash(false), 500); }
  }, [myFound]);

  const useHint = () => {
    if (hints <= 0) return;
    setHints(h => h - 1);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };

  const danger = timeLeft <= 15;

  return (
    <div className={`flex flex-col h-[calc(100vh-53px)] transition-colors ${wrongFlash ? "bg-red-50" : "bg-gray-50"}`}>
      {/* HUD */}
      <div className="bg-white border-b border-purple-50 px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Me */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-2xl shadow-md">
              {PLAYER.avatar}
            </div>
            <div>
              <div className="text-xs font-black text-foreground">{PLAYER.name}</div>
              <ProgressDots found={myFound} total={5} />
            </div>
          </div>

          {/* Timer */}
          <div className="flex-1 flex flex-col items-center">
            <div className={`font-black text-2xl tabular-nums ${danger ? "text-red-500" : "text-foreground"}`}>
              00:{timeLeft.toString().padStart(2, "0")}
            </div>
            <div className="w-32 mt-1">
              <TimerBar timeLeft={timeLeft} total={60} warn={15} />
            </div>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-xs font-black text-foreground">달콤토끼</div>
              <div className="flex gap-1 justify-end">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < oppFound ? "bg-sky-500 border-sky-500" : "border-gray-200"}`} />
                ))}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-2xl shadow-md">
              🐰
            </div>
          </div>
        </div>
      </div>

      {/* Game images */}
      <div className="flex-1 flex items-center justify-center gap-5 p-5 overflow-hidden">
        {/* Original */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-black text-muted-foreground bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
            원본 그림
          </div>
          <div className="relative">
            <ImageWithFallback
              src={gameSceneImg}
              alt="원본 그림"
              className="rounded-2xl shadow-xl border-4 border-white object-contain"
              style={{ maxHeight: "340px", maxWidth: "400px" }}
            />
          </div>
        </div>

        {/* Modified — clickable */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-black text-purple-600 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-200 shadow-sm animate-pulse">
            차이점을 클릭하세요!
          </div>
          <div
            className="relative cursor-crosshair"
            onClick={handleClick}
          >
            <ImageWithFallback
              src={gameSceneImg}
              alt="수정된 그림 — 차이점을 찾아보세요"
              className="rounded-2xl shadow-xl border-4 border-purple-200 object-contain"
              style={{
                maxHeight: "340px",
                maxWidth: "400px",
                filter: "hue-rotate(20deg) saturate(1.15) brightness(0.97)",
              }}
            />
            {/* Found markers */}
            {clicks.map((c, i) => (
              <div
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                  c.correct ? "bg-green-500/90" : "bg-red-500/90"
                }`}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                {c.correct ? <Check size={14} className="text-white" /> : <X size={14} className="text-white" />}
              </div>
            ))}
            {/* Hint highlight */}
            {showHint && (
              <div
                className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-yellow-400 bg-yellow-200/30 animate-pulse"
                style={{ left: "45%", top: "38%" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-purple-50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-black">
          <span className="text-muted-foreground">찾은 차이점:</span>
          <span className="text-purple-600">{myFound}</span>
          <span className="text-muted-foreground">/ 5</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={useHint}
            disabled={hints === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              hints > 0
                ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Zap size={15} />
            힌트 ({hints})
          </button>
          <button
            onClick={() => setScreen("results")}
            className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            포기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const won = true;

  return (
    <div className="min-h-[calc(100vh-53px)] bg-gradient-to-b from-violet-700 via-purple-700 to-indigo-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Trophy / banner */}
        <div className="text-center mb-6">
          <div className={`text-7xl mb-2 ${won ? "animate-bounce" : ""}`}>{won ? "🏆" : "😿"}</div>
          <h1 className={`text-5xl font-black mb-2 tracking-tight ${won ? "text-yellow-300" : "text-white/70"}`}>
            {won ? "VICTORY!" : "DEFEAT"}
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="bg-yellow-400/20 text-yellow-300 font-black px-3 py-1 rounded-full">
              +{won ? "150" : "30"} 🪙
            </span>
            <span className="bg-blue-400/20 text-blue-300 font-black px-3 py-1 rounded-full">
              +{won ? "5" : "1"} 💎
            </span>
            {won && <span className="bg-green-400/20 text-green-300 font-black px-3 py-1 rounded-full">+18 XP</span>}
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-white/15 rounded-xl p-1 mb-4">
          {(["summary", "detail"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${
                tab === t ? "bg-white text-purple-700 shadow-sm" : "text-white/60 hover:text-white/80"
              }`}
            >
              {t === "summary" ? "결과 요약" : "상세 기록"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 mb-4">
          {tab === "summary" ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl mx-auto mb-2 ring-4 ring-yellow-300 shadow-lg">
                    {PLAYER.avatar}
                  </div>
                  <div className="font-black text-foreground text-sm">{PLAYER.name}</div>
                  <div className="text-3xl font-black text-purple-600 mt-1">5</div>
                  <div className="text-xs text-muted-foreground">32.4초</div>
                </div>
                <div className="text-2xl font-black text-gray-200">VS</div>
                <div className="flex-1 text-center opacity-60">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-3xl mx-auto mb-2 shadow-lg">
                    🐰
                  </div>
                  <div className="font-black text-foreground text-sm">달콤토끼</div>
                  <div className="text-3xl font-black text-gray-400 mt-1">3</div>
                  <div className="text-xs text-muted-foreground">—</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 bg-purple-50 rounded-xl p-3">
                {[
                  { label: "정확도", val: "83%" },
                  { label: "오답", val: "1회" },
                  { label: "연속 정답", val: "4" },
                  { label: "소요 시간", val: "32초" },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <div className="text-[9px] text-muted-foreground font-semibold">{label}</div>
                    <div className="font-black text-foreground text-sm">{val}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs font-black text-foreground mb-3">이번 게임의 차이점 5개</p>
              <div className="space-y-2">
                {[
                  { label: "화분 제거", found: true, time: "8.2초" },
                  { label: "의자 색상 변경", found: true, time: "11.5초" },
                  { label: "고양이 스티커 추가", found: true, time: "4.3초" },
                  { label: "테이블 이동", found: false, time: "—" },
                  { label: "창문 크기 변경", found: false, time: "—" },
                ].map((d, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${d.found ? "bg-green-50" : "bg-gray-50"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${d.found ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                      {d.found ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={`text-xs flex-1 font-semibold ${d.found ? "text-foreground" : "text-muted-foreground"}`}>
                      {d.label}
                    </span>
                    <span className={`text-xs font-black ${d.found ? "text-green-600" : "text-gray-300"}`}>{d.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setScreen("matching")}
            className="bg-white text-purple-700 font-black rounded-xl py-3 hover:bg-purple-50 transition-colors text-sm"
          >
            재대전
          </button>
          <button className="bg-white/20 text-white font-black rounded-xl py-3 hover:bg-white/30 transition-colors text-sm border border-white/20">
            친구 추가
          </button>
          <button
            onClick={() => setScreen("lobby")}
            className="bg-purple-900/40 text-white/80 font-black rounded-xl py-3 hover:bg-purple-900/60 transition-colors text-sm"
          >
            로비
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ranking Screen ────────────────────────────────────────────────────────────

const GLOBAL_PLAYERS = [
  { rank: 1, name: "빛나는토끼", level: 45, score: 12480, avatar: "🐰" },
  { rank: 2, name: "별빛여우", level: 42, score: 11200, avatar: "🦊" },
  { rank: 3, name: "달콤고양이", level: 38, score: 10650, avatar: "🐱" },
  { rank: 4, name: "하늘곰돌이", level: 35, score: 9870, avatar: "🐻" },
  { rank: 5, name: "무지개펭귄", level: 33, score: 9320, avatar: "🐧" },
  { rank: 6, name: "구름새", level: 30, score: 8740, avatar: "🐦" },
  { rank: 7, name: "꿈꾸는토끼", level: 28, score: 8200, avatar: "🐹" },
  { rank: 8, name: "초코판다", level: 26, score: 7100, avatar: "🐼" },
  { rank: 24, name: "별빛냥이 (나)", level: 24, score: 5840, avatar: "🐱", isMe: true },
];

const FRIEND_PLAYERS = [
  { rank: 1, name: "달콤토끼", level: 22, score: 4200, avatar: "🐰" },
  { rank: 2, name: "별빛냥이 (나)", level: 24, score: 3840, avatar: "🐱", isMe: true },
  { rank: 3, name: "하늘여우", level: 19, score: 3100, avatar: "🦊" },
  { rank: 4, name: "초록개구리", level: 16, score: 2400, avatar: "🐸" },
];

function RankingScreen() {
  const [tab, setTab] = useState<"global" | "friends">("global");
  const list = tab === "global" ? GLOBAL_PLAYERS : FRIEND_PLAYERS;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-black text-foreground mb-4">🏆 랭킹</h2>

      {/* Tab */}
      <div className="flex bg-white rounded-xl border border-purple-100 p-1 mb-5 shadow-sm">
        {(["global", "friends"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg font-black text-sm transition-all ${
              tab === t ? "bg-purple-600 text-white shadow-md" : "text-muted-foreground hover:text-purple-600"
            }`}
          >
            {t === "global" ? "전체 랭킹" : "친구 랭킹"}
          </button>
        ))}
      </div>

      {/* Podium (global only) */}
      {tab === "global" && (
        <div className="flex items-end justify-center gap-4 mb-6">
          {[GLOBAL_PLAYERS[1], GLOBAL_PLAYERS[0], GLOBAL_PLAYERS[2]].map((p, i) => {
            const heights = ["h-20", "h-28", "h-16"];
            const bgs = ["bg-gray-200", "bg-yellow-300", "bg-amber-300/70"];
            const rank = [2, 1, 3];
            const medals = ["🥈", "🥇", "🥉"];
            return (
              <div key={i} className="flex flex-col items-center">
                <div className="text-3xl mb-1">{p.avatar}</div>
                <div className="text-xs font-black text-foreground mb-1">{p.name.split(" ")[0]}</div>
                <div className="text-lg mb-1">{medals[i]}</div>
                <div className={`w-20 ${heights[i]} ${bgs[i]} rounded-t-2xl flex items-end justify-center pb-2`}>
                  <span className="font-black text-gray-600 text-sm">#{rank[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {list.map((p: any) => (
          <div
            key={p.rank}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
              p.isMe
                ? "bg-purple-50 border-purple-300 shadow-md shadow-purple-100"
                : "bg-white border-purple-50 hover:border-purple-100"
            }`}
          >
            <div className="w-8 text-center font-black text-sm">
              {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : (
                <span className="text-muted-foreground">#{p.rank}</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl shadow-sm">
              {p.avatar}
            </div>
            <div className="flex-1">
              <div className={`font-black text-sm ${p.isMe ? "text-purple-700" : "text-foreground"}`}>{p.name}</div>
              <div className="text-[10px] text-muted-foreground">Lv.{p.level}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-foreground">{p.score.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">점</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shop Screen ───────────────────────────────────────────────────────────────

const SHOP_ITEMS: Record<string, Array<{ name: string; desc: string; price: string; emoji: string; badge?: string }>> = {
  "추천": [
    { name: "동물 스티커팩", desc: "귀여운 동물 스티커 20종", price: "🪙 500", emoji: "🐾", badge: "BEST" },
    { name: "프리미엄 패스", desc: "시즌 보상 2배 + 특별 아이템", price: "💎 30", emoji: "👑", badge: "HOT" },
    { name: "힌트 3개", desc: "게임 중 사용 가능한 힌트", price: "🪙 200", emoji: "💡" },
    { name: "무지개 테두리", desc: "프로필 무지개 테두리 효과", price: "💎 15", emoji: "🌈" },
  ],
  "아이템": [
    { name: "힌트 1개", desc: "게임 중 사용 가능한 힌트", price: "🪙 80", emoji: "💡" },
    { name: "힌트 5개 묶음", desc: "5개 묶음 할인가", price: "🪙 350", emoji: "💡", badge: "SALE" },
    { name: "시간 연장권", desc: "게임 시간 +10초 추가", price: "🪙 150", emoji: "⏱️" },
    { name: "더블 XP권", desc: "다음 게임 XP 2배 획득", price: "🪙 300", emoji: "⚡" },
  ],
  "꾸미기": [
    { name: "별빛 테두리", desc: "반짝이는 별빛 프로필 테두리", price: "💎 10", emoji: "⭐" },
    { name: "무지개 테두리", desc: "화려한 무지개 테두리", price: "💎 15", emoji: "🌈" },
    { name: "불꽃 승리 이펙트", desc: "승리 시 불꽃 연출 효과", price: "💎 20", emoji: "🎆" },
    { name: "하트 클릭 이펙트", desc: "클릭 시 하트 이펙트", price: "🪙 300", emoji: "💕" },
  ],
  "스티커팩": [
    { name: "동물 친구 스티커팩", desc: "동물 캐릭터 스티커 20종", price: "🪙 500", emoji: "🐾", badge: "BEST" },
    { name: "카페 테마 스티커팩", desc: "카페 소품 스티커 15종", price: "🪙 400", emoji: "☕" },
    { name: "계절 테마 스티커팩", desc: "사계절 스티커 25종", price: "🪙 600", emoji: "🌸" },
    { name: "우주 스티커팩", desc: "우주 테마 스티커 18종", price: "💎 8", emoji: "🚀" },
  ],
  "패스": [
    { name: "시즌 1 프리미엄 패스", desc: "시즌 기간 동안 프리미엄 보상 수령", price: "💎 30", emoji: "👑", badge: "시즌1" },
  ],
};

function ShopScreen() {
  const [category, setCategory] = useState("추천");
  const categories = Object.keys(SHOP_ITEMS);

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <h2 className="text-2xl font-black text-foreground mb-4">🛍️ 상점</h2>

      {/* Categories */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full font-bold text-sm flex-shrink-0 transition-all ${
              category === c
                ? "bg-purple-600 text-white shadow-md shadow-purple-200/40"
                : "bg-white border border-purple-100 text-muted-foreground hover:border-purple-300 hover:text-purple-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="grid grid-cols-2 gap-3">
        {(SHOP_ITEMS[category] || []).map((item, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-purple-50 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/40 transition-all group">
            <div className="relative mb-3 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl flex items-center justify-center text-4xl shadow-sm">
                {item.emoji}
              </div>
              {item.badge && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                  {item.badge}
                </span>
              )}
            </div>
            <div className="text-center">
              <div className="font-black text-foreground text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-3 leading-relaxed">{item.desc}</div>
              <button className="w-full bg-purple-600 text-white font-black rounded-xl py-2 text-sm group-hover:bg-purple-700 transition-colors shadow-sm">
                {item.price}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Season Screen ─────────────────────────────────────────────────────────────

const SEASON_REWARDS = [
  { level: 1, free: "🪙 100", premium: "🪙 300", done: true },
  { level: 3, free: "💡 힌트 1개", premium: "💎 2", done: true },
  { level: 5, free: "🪙 200", premium: "⭐ 별빛 테두리", done: true },
  { level: 7, free: "💎 1", premium: "🪙 500", done: false, current: true },
  { level: 10, free: "🪙 300", premium: "🎆 불꽃 이펙트", done: false },
  { level: 15, free: "💎 3", premium: "🐾 동물 스티커팩", done: false },
  { level: 20, free: "🪙 500", premium: "👑 시즌 프로필", done: false },
];

function SeasonScreen() {
  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Season header */}
      <div className="relative bg-gradient-to-r from-violet-600 to-purple-500 rounded-3xl p-6 mb-5 text-white overflow-hidden">
        <div className="absolute right-4 top-2 text-7xl opacity-15 select-none">❄️</div>
        <div className="text-purple-200 text-sm font-semibold">시즌 1 · 겨울 대축제</div>
        <h2 className="text-2xl font-black mt-1">시즌 패스</h2>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-purple-200">
          <Clock size={13} />
          <span>24일 14시간 남음</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-purple-200 mb-1">
            <span>레벨 7</span>
            <span>다음 레벨 340 XP 필요</span>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <div className="bg-yellow-300 h-3 rounded-full transition-all" style={{ width: "60%" }} />
          </div>
        </div>
      </div>

      {/* Pass options */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-white rounded-2xl border border-purple-100 p-4 text-center shadow-sm">
          <div className="text-3xl mb-2">🎁</div>
          <div className="text-sm font-black text-foreground">무료 보상</div>
          <div className="text-xs text-muted-foreground mt-0.5">기본 제공</div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-4 text-center text-white shadow-lg shadow-orange-200/40 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 text-8xl flex items-center justify-center select-none">✨</div>
          <div className="relative text-3xl mb-2">👑</div>
          <div className="relative text-sm font-black">프리미엄 패스</div>
          <div className="relative text-xs opacity-80 mt-0.5">💎 30 구매</div>
        </div>
      </div>

      {/* Reward list */}
      <div className="space-y-2.5">
        {SEASON_REWARDS.map((r, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl p-4 border-2 transition-all ${
              r.current ? "border-purple-400 shadow-md shadow-purple-100" : r.done ? "border-green-100 opacity-65" : "border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                r.done ? "bg-green-500 text-white" : r.current ? "bg-purple-600 text-white" : "bg-gray-100 text-muted-foreground"
              }`}>
                {r.done ? <Check size={18} /> : `${r.level}`}
              </div>
              <div className="text-xs font-black text-muted-foreground w-12">Lv.{r.level}</div>
              <div className="flex flex-1 gap-2">
                <div className={`flex-1 bg-gray-50 rounded-xl p-2.5 text-center ${r.done ? "opacity-50" : ""}`}>
                  <div className="text-[9px] text-muted-foreground mb-0.5 font-semibold">무료</div>
                  <div className="text-sm font-black text-foreground">{r.free}</div>
                </div>
                <div className={`flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-center ${r.done ? "opacity-50" : ""}`}>
                  <div className="text-[9px] text-yellow-600 mb-0.5 font-semibold">프리미엄</div>
                  <div className="text-sm font-black text-foreground">{r.premium}</div>
                </div>
              </div>
              {r.current && (
                <div className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">현재</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Invite Screen ─────────────────────────────────────────────────────────────

function InviteScreen() {
  const [copied, setCopied] = useState(false);
  const link = "https://findiff.game/invite/STARCAT-X7K2";

  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 max-w-lg mx-auto">
      <h2 className="text-2xl font-black text-foreground mb-2">👫 친구 대전</h2>
      <p className="text-sm text-muted-foreground mb-6">링크를 공유해 친구와 직접 대결하세요!</p>

      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md shadow-purple-100/30 mb-5">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🔗</div>
          <div className="font-black text-foreground text-lg">초대 링크 생성</div>
          <div className="text-xs text-muted-foreground mt-1">링크를 받은 친구가 접속하면 자동으로 대전방에 입장합니다</div>
        </div>
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 text-xs font-mono text-purple-700 truncate">
            {link}
          </div>
          <button
            onClick={copy}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 ${
              copied ? "bg-green-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "카카오톡", emoji: "💬", color: "bg-yellow-400 hover:bg-yellow-500 text-yellow-900" },
            { label: "페이스북", emoji: "📘", color: "bg-blue-500 hover:bg-blue-600 text-white" },
            { label: "트위터", emoji: "🐦", color: "bg-sky-400 hover:bg-sky-500 text-white" },
          ].map(({ label, emoji, color }) => (
            <button key={label} className={`${color} rounded-xl py-2.5 font-bold text-sm transition-colors flex items-center justify-center gap-1.5`}>
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-purple-50">
        <h3 className="font-black text-foreground text-sm mb-3">친구 목록</h3>
        <div className="space-y-2">
          {[
            { name: "달콤토끼", avatar: "🐰", online: true, level: 22 },
            { name: "하늘여우", avatar: "🦊", online: true, level: 19 },
            { name: "초록개구리", avatar: "🐸", online: false, level: 16 },
            { name: "구름새", avatar: "🐦", online: false, level: 30 },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl">
                  {f.avatar}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${f.online ? "bg-green-500" : "bg-gray-300"}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-foreground">{f.name}</div>
                <div className="text-[10px] text-muted-foreground">Lv.{f.level} · {f.online ? "접속 중" : "오프라인"}</div>
              </div>
              {f.online && (
                <button className="text-xs font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors">
                  초대
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────

function ProfileScreen() {
  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h2 className="text-2xl font-black text-foreground mb-5">😸 내 프로필</h2>
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md shadow-purple-100/30 mb-4">
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-5xl shadow-lg ring-4 ring-purple-200">
              {PLAYER.avatar}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[9px] font-black rounded-full px-2 py-0.5 shadow">
              ⭐ 별빛 테두리
            </div>
          </div>
          <div className="flex-1">
            <div className="font-black text-xl text-foreground">{PLAYER.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Crown size={14} className="text-yellow-500" />
              <span className="text-sm text-purple-600 font-black">Lv.{PLAYER.level}</span>
              <span className="text-xs text-muted-foreground">· 시즌 Lv.7</span>
            </div>
            <div className="flex gap-3 mt-3">
              {[{ label: "승률", val: `${PLAYER.winRate}%` }, { label: "총 대전", val: "209" }, { label: "총 승리", val: "142" }].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <div className="font-black text-foreground">{val}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Achievement highlights */}
      <div className="bg-white rounded-2xl p-5 border border-purple-50 mb-4">
        <h3 className="font-black text-foreground text-sm mb-3">🏅 업적</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { emoji: "⚔️", label: "연승왕", desc: "3연승" },
            { emoji: "🎯", label: "정확한 눈", desc: "정확도 90%+" },
            { emoji: "🔍", label: "탐정", desc: "차이점 100개 발견" },
          ].map(({ emoji, label, desc }) => (
            <div key={label} className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs font-black text-foreground">{label}</div>
              <div className="text-[9px] text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings quick links */}
      <div className="bg-white rounded-2xl border border-purple-50 overflow-hidden">
        {[
          { icon: Mail, label: "우편함", badge: "3" },
          { icon: Award, label: "업적 전체 보기" },
          { icon: Settings, label: "설정" },
          { icon: Flag, label: "신고" },
        ].map(({ icon: Icon, label, badge }, i) => (
          <button key={label} className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-purple-50 transition-colors text-left ${i !== 0 ? "border-t border-purple-50" : ""}`}>
            <Icon size={17} className="text-purple-400" />
            <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
            {badge && <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>}
            <ChevronRight size={15} className="text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Friends Screen ────────────────────────────────────────────────────────────

function FriendsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [search, setSearch] = useState("");
  const friends = [
    { name: "달콤토끼", avatar: "🐰", online: true, level: 22, wins: 89 },
    { name: "하늘여우", avatar: "🦊", online: true, level: 19, wins: 54 },
    { name: "초록개구리", avatar: "🐸", online: false, level: 16, wins: 32 },
    { name: "구름새", avatar: "🐦", online: false, level: 30, wins: 241 },
    { name: "무지개판다", avatar: "🐼", online: false, level: 11, wins: 18 },
  ];

  return (
    <div className="p-5 max-w-lg mx-auto">
      <h2 className="text-2xl font-black text-foreground mb-4">👥 친구</h2>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2.5 shadow-sm">
          <Search size={15} className="text-purple-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="닉네임 검색..."
            className="flex-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground bg-transparent outline-none"
          />
        </div>
        <button className="bg-purple-600 text-white font-black rounded-xl px-4 hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-sm">
          <Plus size={15} /> 추가
        </button>
      </div>

      <div className="space-y-2">
        {friends.filter(f => f.name.includes(search)).map((f, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-purple-50 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl shadow-sm">
                {f.avatar}
              </div>
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${f.online ? "bg-green-500" : "bg-gray-300"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-foreground text-sm">{f.name}</div>
              <div className="text-[10px] text-muted-foreground">Lv.{f.level} · 승리 {f.wins}회</div>
              <div className={`text-[10px] font-semibold mt-0.5 ${f.online ? "text-green-500" : "text-gray-400"}`}>
                {f.online ? "● 접속 중" : "○ 오프라인"}
              </div>
            </div>
            <div className="flex gap-1.5">
              {f.online && (
                <button
                  onClick={() => setScreen("invite")}
                  className="text-xs font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  대전
                </button>
              )}
              <button className="text-xs font-black bg-gray-100 text-gray-500 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                ···
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────

const FULL_SCREENS: Screen[] = ["editor", "gameplay", "results"];
const HIDE_SIDEBAR_SCREENS: Screen[] = ["editor", "gameplay"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");

  const content: Record<Screen, React.ReactNode> = {
    lobby: <LobbyScreen setScreen={setScreen} />,
    matching: <MatchingScreen setScreen={setScreen} />,
    editor: <EditorScreen setScreen={setScreen} />,
    gameplay: <GameplayScreen setScreen={setScreen} />,
    results: <ResultsScreen setScreen={setScreen} />,
    ranking: <RankingScreen />,
    shop: <ShopScreen />,
    season: <SeasonScreen />,
    invite: <InviteScreen />,
    profile: <ProfileScreen />,
    friends: <FriendsScreen setScreen={setScreen} />,
  };

  const hideSidebar = HIDE_SIDEBAR_SCREENS.includes(screen);
  const fullHeight = FULL_SCREENS.includes(screen);

  return (
    <div className="min-h-screen bg-background font-[Nunito,_sans-serif]">
      <Header onNav={setScreen} />
      <div className="flex">
        {!hideSidebar && <Sidebar screen={screen} setScreen={setScreen} />}
        <main
          className={`flex-1 ${!hideSidebar ? "ml-[72px]" : ""} ${fullHeight ? "" : "min-h-[calc(100vh-53px)] overflow-y-auto"}`}
        >
          {content[screen]}
        </main>
      </div>
    </div>
  );
}
