import { GAME_CONFIG, type Difference, type NormalizedPoint } from "@spot-battle/shared";
import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import gameSceneImg from "@/imports/image.png";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#facc15", "#a855f7", "#ffffff"];

function pointFromPointer(event: PointerEvent<SVGSVGElement>): NormalizedPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(0.98, Math.max(0.02, (event.clientX - rect.left) / rect.width)),
    y: Math.min(0.98, Math.max(0.02, (event.clientY - rect.top) / rect.height)),
  };
}

function regionFromPoints(points: NormalizedPoint[]) {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const x = (minX + maxX) / 2;
  const y = (minY + maxY) / 2;
  const measured = Math.hypot(maxX - minX, maxY - minY) / 2 + 0.025;
  const boundaryLimit = Math.min(x, 1 - x, y, 1 - y);
  return { x, y, radius: Math.max(0.02, Math.min(0.11, measured, boundaryLimit)) };
}

function pointsAttribute(points: NormalizedPoint[]): string {
  return points.map((point) => `${point.x * 1000},${point.y * 562.5}`).join(" ");
}

export function DifferenceStroke({ difference }: { difference: Difference }) {
  if (!difference.stroke) return null;
  return (
    <polyline
      points={pointsAttribute(difference.stroke.points)}
      fill="none"
      stroke={difference.stroke.color}
      strokeWidth={difference.stroke.width * 10}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function FreeformEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: Difference[];
  onChange: (next: Difference[]) => void;
  disabled?: boolean;
}) {
  const [color, setColor] = useState(COLORS[0]!);
  const [width, setWidth] = useState(3);
  const [activePoints, setActivePoints] = useState<NormalizedPoint[]>([]);
  const drawingRef = useRef(false);

  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || value.length >= GAME_CONFIG.differenceCount) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setActivePoints([pointFromPointer(event)]);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    const point = pointFromPointer(event);
    setActivePoints((current) => {
      const last = current.at(-1);
      if (last && Math.hypot(last.x - point.x, last.y - point.y) < 0.004) return current;
      return [...current, point];
    });
  };

  const finish = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setActivePoints((points) => {
      if (points.length) {
        const normalizedPoints = points.length === 1 ? [points[0]!, { ...points[0]!, x: points[0]!.x + 0.001 }] : points;
        onChange([
          ...value,
          {
            id: `draw-${crypto.randomUUID()}`,
            kind: "DRAW",
            region: regionFromPoints(normalizedPoints),
            stroke: { points: normalizedPoints, color, width },
          },
        ]);
      }
      return [];
    });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white p-3 shadow">
        <span className="text-sm font-black">색상</span>
        {COLORS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setColor(candidate)}
            aria-label={candidate}
            className={`h-8 w-8 rounded-full border-2 shadow-sm ${color === candidate ? "scale-110 border-slate-900" : "border-white"}`}
            style={{ backgroundColor: candidate }}
          />
        ))}
        <label className="ml-2 flex items-center gap-2 text-sm font-bold">
          굵기
          <input type="range" min="1" max="7" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
        </label>
        <button type="button" disabled={!value.length || disabled} onClick={() => onChange(value.slice(0, -1))} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold disabled:opacity-40">
          <RotateCcw size={16} /> 되돌리기
        </button>
        <button type="button" disabled={!value.length || disabled} onClick={() => onChange([])} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-40">
          <Trash2 size={16} /> 전체 삭제
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
        <img src={gameSceneImg} alt="편집할 원본 그림" className="block h-auto w-full select-none" draggable={false} />
        <svg
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          className={`absolute inset-0 h-full w-full touch-none ${disabled ? "cursor-not-allowed" : "cursor-crosshair"}`}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          {value.map((difference) => <DifferenceStroke key={difference.id} difference={difference} />)}
          {activePoints.length > 0 && (
            <polyline points={pointsAttribute(activePoints)} fill="none" stroke={color} strokeWidth={width * 10} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
      <p className="mt-3 text-center text-sm font-bold text-violet-700">
        한 번 그은 획이 차이점 1개로 저장됩니다 · {value.length}/{GAME_CONFIG.differenceCount}
      </p>
    </div>
  );
}
