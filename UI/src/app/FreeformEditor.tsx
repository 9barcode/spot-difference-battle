import { GAME_CONFIG, type Difference, type DifferenceFill, type DifferenceStroke, type NormalizedPoint } from "@spot-battle/shared";
import { Check, Eraser, MousePointer2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import gameSceneImg from "@/imports/image.png";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#facc15", "#a855f7", "#ffffff"];
type Tool = "FILL" | "PENCIL" | "ERASER";

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function pointFromPointer(event: PointerEvent<SVGSVGElement>): NormalizedPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(0.98, Math.max(0.02, (event.clientX - rect.left) / rect.width)),
    y: Math.min(0.98, Math.max(0.02, (event.clientY - rect.top) / rect.height)),
  };
}

function regionFromDifference(fill: DifferenceFill | null, strokes: DifferenceStroke[]) {
  const points = [...(fill ? [fill.seed] : []), ...strokes.flatMap((stroke) => stroke.points)];
  if (!points.length) return { x: 0.5, y: 0.5, radius: 0.05 };
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const x = (minX + maxX) / 2;
  const y = (minY + maxY) / 2;
  const measured = Math.hypot(maxX - minX, maxY - minY) / 2 + (fill ? 0.08 : 0.025);
  const boundary = Math.min(x, 1 - x, y, 1 - y);
  return { x, y, radius: Math.max(0.02, Math.min(0.11, measured, boundary)) };
}

function paintConnectedRegion(
  source: ImageData,
  output: ImageData,
  fill: DifferenceFill,
): void {
  const { width, height, data } = source;
  const startX = Math.min(width - 1, Math.max(0, Math.floor(fill.seed.x * width)));
  const startY = Math.min(height - 1, Math.max(0, Math.floor(fill.seed.y * height)));
  const start = startY * width + startX;
  const sourceOffset = start * 4;
  const baseR = data[sourceOffset]!;
  const baseG = data[sourceOffset + 1]!;
  const baseB = data[sourceOffset + 2]!;
  const [targetR, targetG, targetB] = hexToRgb(fill.color);
  const visited = new Uint8Array(width * height);
  const stack = [start];
  const maxDistance = fill.tolerance * fill.tolerance * 3;

  while (stack.length) {
    const index = stack.pop()!;
    if (visited[index]) continue;
    visited[index] = 1;
    const offset = index * 4;
    const dr = data[offset]! - baseR;
    const dg = data[offset + 1]! - baseG;
    const db = data[offset + 2]! - baseB;
    if (dr * dr + dg * dg + db * db > maxDistance) continue;

    const luminance = (data[offset]! * 0.299 + data[offset + 1]! * 0.587 + data[offset + 2]! * 0.114) / 255;
    const shade = 0.35 + luminance * 0.8;
    output.data[offset] = Math.min(255, targetR * shade);
    output.data[offset + 1] = Math.min(255, targetG * shade);
    output.data[offset + 2] = Math.min(255, targetB * shade);
    output.data[offset + 3] = 235;

    const x = index % width;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < width * (height - 1)) stack.push(index + width);
  }
}

export function DifferenceEffects({ differences }: { differences: Difference[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = new Image();
    image.src = gameSceneImg;
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = Math.min(1000, image.naturalWidth);
      const height = Math.round(width * image.naturalHeight / image.naturalWidth);
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
      if (!sourceContext) return;
      sourceContext.drawImage(image, 0, 0, width, height);
      const source = sourceContext.getImageData(0, 0, width, height);
      const output = context.createImageData(width, height);

      differences.forEach((difference) => {
        if (difference.fill) paintConnectedRegion(source, output, difference.fill);
      });
      context.clearRect(0, 0, width, height);
      context.putImageData(output, 0, 0);

      differences.flatMap((difference) => difference.strokes ?? []).forEach((stroke) => {
        if (!stroke.points.length) return;
        context.save();
        context.globalCompositeOperation = stroke.tool === "ERASER" ? "destination-out" : "source-over";
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.width * 3;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        stroke.points.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        if (stroke.points.length === 1) context.lineTo(stroke.points[0]!.x * width + 0.1, stroke.points[0]!.y * height);
        context.stroke();
        context.restore();
      });
    };
  }, [differences]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
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
  const [tool, setTool] = useState<Tool>("FILL");
  const [color, setColor] = useState(COLORS[0]!);
  const [width, setWidth] = useState(3);
  const [tolerance, setTolerance] = useState(34);
  const [fill, setFill] = useState<DifferenceFill | null>(null);
  const [strokes, setStrokes] = useState<DifferenceStroke[]>([]);
  const [activePoints, setActivePoints] = useState<NormalizedPoint[]>([]);
  const drawingRef = useRef(false);

  const current = useMemo<Difference | null>(() => {
    if (!fill && !strokes.length && !activePoints.length) return null;
    const previewStrokes = activePoints.length
      ? [...strokes, { points: activePoints, color, width, tool: tool === "ERASER" ? "ERASER" : "PENCIL" }]
      : strokes;
    return {
      id: "current-edit",
      kind: fill ? "COLOR" : "DRAW",
      region: regionFromDifference(fill, previewStrokes),
      fill: fill ?? undefined,
      strokes: previewStrokes.length ? previewStrokes : undefined,
    };
  }, [activePoints, color, fill, strokes, tool, width]);

  const preview = current ? [...value, current] : value;
  const clearCurrent = () => {
    setFill(null);
    setStrokes([]);
    setActivePoints([]);
  };

  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || value.length >= GAME_CONFIG.differenceCount) return;
    const point = pointFromPointer(event);
    if (tool === "FILL") {
      setFill({ seed: point, color, tolerance });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    setActivePoints([point]);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    const point = pointFromPointer(event);
    setActivePoints((points) => {
      const last = points.at(-1);
      return last && Math.hypot(last.x - point.x, last.y - point.y) < 0.003 ? points : [...points, point];
    });
  };

  const finish = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setActivePoints((points) => {
      if (points.length) setStrokes((items) => [...items, { points, color, width, tool: tool === "ERASER" ? "ERASER" : "PENCIL" }]);
      return [];
    });
  };

  const saveCurrent = () => {
    if (!current || value.length >= GAME_CONFIG.differenceCount) return;
    onChange([...value, { ...current, id: `edit-${crypto.randomUUID()}` }]);
    clearCurrent();
  };

  const toolButton = (candidate: Tool, label: string, icon: React.ReactNode) => (
    <button type="button" onClick={() => setTool(candidate)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black ${tool === candidate ? "bg-violet-600 text-white" : "bg-slate-100"}`}>
      {icon}{label}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow">
        {toolButton("FILL", "물체 색칠", <MousePointer2 size={16}/>)}
        {toolButton("PENCIL", "연필", <Pencil size={16}/>)}
        {toolButton("ERASER", "지우개", <Eraser size={16}/>)}
        <span className="mx-1 h-7 w-px bg-slate-200" />
        {COLORS.map((candidate) => <button key={candidate} type="button" onClick={() => setColor(candidate)} className={`h-8 w-8 rounded-full border-2 shadow-sm ${color === candidate ? "scale-110 border-slate-900" : "border-white"}`} style={{ backgroundColor: candidate }} aria-label={candidate}/>)}
        {tool !== "FILL" && <label className="flex items-center gap-2 text-xs font-bold">굵기<input type="range" min="1" max="8" value={width} onChange={(event) => setWidth(Number(event.target.value))}/></label>}
        {tool === "FILL" && <label className="flex items-center gap-2 text-xs font-bold">선택 범위<input type="range" min="12" max="70" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))}/></label>}
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
        <img src={gameSceneImg} alt="편집할 원본 그림" className="block h-auto w-full select-none" draggable={false}/>
        <DifferenceEffects differences={preview}/>
        <svg viewBox="0 0 1000 562.5" preserveAspectRatio="none" className={`absolute inset-0 h-full w-full touch-none ${disabled ? "cursor-not-allowed" : tool === "FILL" ? "cursor-pointer" : "cursor-crosshair"}`} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" disabled={!strokes.length} onClick={() => setStrokes((items) => items.slice(0, -1))} className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow disabled:opacity-40"><RotateCcw size={16}/>현재 획 취소</button>
        <button type="button" disabled={!current} onClick={clearCurrent} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-40"><Trash2 size={16}/>현재 작업 삭제</button>
        <button type="button" disabled={!current || value.length >= GAME_CONFIG.differenceCount} onClick={saveCurrent} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-2 font-black text-white disabled:opacity-40"><Check size={17}/>차이점으로 저장</button>
      </div>
      <p className="mt-3 text-center text-sm font-bold text-violet-700">연필은 여러 획을 그린 뒤 저장하세요 · 완료 {value.length}/{GAME_CONFIG.differenceCount}</p>
    </div>
  );
}
