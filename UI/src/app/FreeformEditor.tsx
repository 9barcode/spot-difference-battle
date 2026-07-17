import { GAME_CONFIG, type Difference, type DifferenceFill, type DifferenceStroke, type NormalizedPoint } from "@spot-battle/shared";
import { Check, Eraser, MousePointer2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import gameSceneImg from "@/imports/image.png";

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = l - chroma / 2;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] :
    hue < 120 ? [x, chroma, 0] :
    hue < 180 ? [0, chroma, x] :
    hue < 240 ? [0, x, chroma] :
    hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}

const PALETTE = Array.from({ length: 120 }, (_, index) => {
  const column = index % 12;
  const row = Math.floor(index / 12);
  const hue = column * 30;
  const saturation = row < 5 ? 82 : 52;
  const lightness = 24 + (row % 5) * 14;
  return hslToHex(hue, saturation, lightness);
});
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
  applyColor = true,
): Uint8Array {
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

    if (applyColor) {
      const luminance = (data[offset]! * 0.299 + data[offset + 1]! * 0.587 + data[offset + 2]! * 0.114) / 255;
      const shade = 0.35 + luminance * 0.8;
      output.data[offset] = Math.min(255, targetR * shade);
      output.data[offset + 1] = Math.min(255, targetG * shade);
      output.data[offset + 2] = Math.min(255, targetB * shade);
      output.data[offset + 3] = 235;
    }
    visited[index] = 2;

    const x = index % width;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < width * (height - 1)) stack.push(index + width);
  }
  return visited;
}

function drawSelectionOutline(output: ImageData, mask: Uint8Array, width: number, height: number): void {
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 2) continue;
    const x = index % width;
    const boundary =
      x === 0 || x === width - 1 || index < width || index >= width * (height - 1) ||
      mask[index - 1] !== 2 || mask[index + 1] !== 2 ||
      mask[index - width] !== 2 || mask[index + width] !== 2;
    if (!boundary) continue;
    const offset = index * 4;
    output.data[offset] = 124;
    output.data[offset + 1] = 58;
    output.data[offset + 2] = 237;
    output.data[offset + 3] = 255;
  }
}

export function DifferenceEffects({
  differences,
  selectedId,
  selectionOnly = false,
}: {
  differences: Difference[];
  selectedId?: string;
  selectionOnly?: boolean;
}) {
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

      let selectedMask: Uint8Array | null = null;
      differences.forEach((difference) => {
        if (!difference.fill) return;
        const isSelected = difference.id === selectedId;
        const mask = paintConnectedRegion(source, output, difference.fill, !(isSelected && selectionOnly));
        if (isSelected) selectedMask = mask;
      });
      if (selectedMask) drawSelectionOutline(output, selectedMask, width, height);
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
  }, [differences, selectedId, selectionOnly]);

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
  const [color, setColor] = useState("#ef4444");
  const [showPalette, setShowPalette] = useState(false);
  const [selectionOnly, setSelectionOnly] = useState(false);
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
    setSelectionOnly(false);
    setStrokes([]);
    setActivePoints([]);
  };

  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || value.length >= GAME_CONFIG.differenceCount) return;
    const point = pointFromPointer(event);
    if (tool === "FILL") {
      setFill({ seed: point, color, tolerance });
      setSelectionOnly(true);
      setShowPalette(true);
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

  const chooseColor = (nextColor: string) => {
    setColor(nextColor);
    setFill((currentFill) => currentFill ? { ...currentFill, color: nextColor } : currentFill);
    if (fill) setSelectionOnly(false);
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
        <button type="button" onClick={() => setShowPalette((visible) => !visible)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black">
          <span className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }}/>
          색상 선택
        </button>
        <label className="inline-flex items-center gap-2 text-xs font-bold">
          직접 선택
          <input type="color" value={color} onChange={(event) => chooseColor(event.target.value)} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"/>
        </label>
        {tool !== "FILL" && <label className="flex items-center gap-2 text-xs font-bold">굵기<input type="range" min="1" max="8" value={width} onChange={(event) => setWidth(Number(event.target.value))}/></label>}
        {tool === "FILL" && <label className="flex items-center gap-2 text-xs font-bold">선택 범위<input type="range" min="12" max="70" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))}/></label>}
      </div>
      {showPalette && (
        <div className="mb-3 rounded-2xl bg-white p-3 shadow">
          <p className="mb-2 text-center text-xs font-bold text-slate-500">120색 팔레트 · 원하는 색을 선택하세요</p>
          <div className="grid grid-cols-12 gap-1.5">
            {PALETTE.map((candidate, index) => (
              <button key={`${candidate}-${index}`} type="button" onClick={() => { chooseColor(candidate); setShowPalette(false); }} aria-label={candidate}
                className={`aspect-square min-h-6 rounded-md border-2 shadow-sm transition hover:scale-110 ${color === candidate ? "border-slate-950 ring-2 ring-violet-300" : "border-white"}`}
                style={{ backgroundColor: candidate }}/>
            ))}
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
        <img src={gameSceneImg} alt="편집할 원본 그림" className="block h-auto w-full select-none" draggable={false}/>
        <DifferenceEffects differences={preview} selectedId={current?.fill ? "current-edit" : undefined} selectionOnly={selectionOnly}/>
        <svg viewBox="0 0 1000 562.5" preserveAspectRatio="none" className={`absolute inset-0 h-full w-full touch-none ${disabled ? "cursor-not-allowed" : tool === "FILL" ? "cursor-pointer" : "cursor-crosshair"}`} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" disabled={!strokes.length} onClick={() => setStrokes((items) => items.slice(0, -1))} className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow disabled:opacity-40"><RotateCcw size={16}/>현재 획 취소</button>
        <button type="button" disabled={!current} onClick={clearCurrent} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-40"><Trash2 size={16}/>현재 작업 삭제</button>
        <button type="button" disabled={!current || selectionOnly || value.length >= GAME_CONFIG.differenceCount} onClick={saveCurrent} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-2 font-black text-white disabled:opacity-40"><Check size={17}/>차이점으로 저장</button>
      </div>
      <p className="mt-3 text-center text-sm font-bold text-violet-700">
        {selectionOnly ? "선택한 영역의 외곽선을 확인하고 색상을 골라주세요." : "연필은 여러 획을 그린 뒤 저장하세요."} · 완료 {value.length}/{GAME_CONFIG.differenceCount}
      </p>
    </div>
  );
}
