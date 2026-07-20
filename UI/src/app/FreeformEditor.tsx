import { GAME_CONFIG, type Difference, type DifferenceFill, type DifferenceStroke, type NormalizedPoint } from "@spot-battle/shared";
import { Check, MousePointer2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import gameSceneImg from "@/imports/image.png";


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

const RENDER_MAX_WIDTH = 1000;

function sceneSize(image: HTMLImageElement) {
  const width = Math.min(RENDER_MAX_WIDTH, image.naturalWidth);
  return { width, height: Math.round((width * image.naturalHeight) / image.naturalWidth) };
}

function loadSceneImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("원본 그림을 불러오지 못했습니다."));
    image.src = gameSceneImg;
  });
}

/** 원본 위에 얹을 효과만 담은 투명 캔버스를 만든다. 화면 표시와 이미지 내보내기가 함께 쓴다. */
function drawEffectLayer(
  image: HTMLImageElement,
  differences: Difference[],
  selectedId?: string,
  selectionOnly = false,
): HTMLCanvasElement | null {
  const { width, height } = sceneSize(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return null;
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
    if (stroke.points.length === 1) {
      context.lineTo(stroke.points[0]!.x * width + 0.1, stroke.points[0]!.y * height);
    }
    context.stroke();
    context.restore();
  });

  return canvas;
}

/**
 * 원본과 효과를 하나로 합쳐 문제 이미지를 만든다.
 *
 * 제작 명령을 상대 클라이언트로 보내면 개발자도구에서 정답 위치가 그대로 보이므로,
 * 제작자 쪽에서 합성까지 끝내고 결과 이미지만 서버로 올린다.
 */
export async function renderProblemImage(differences: Difference[]): Promise<string> {
  const image = await loadSceneImage();
  const { width, height } = sceneSize(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("문제 이미지를 만들 수 없습니다.");

  context.drawImage(image, 0, 0, width, height);
  const layer = drawEffectLayer(image, differences);
  if (layer) context.drawImage(layer, 0, 0);

  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
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
  const effectsKey = JSON.stringify(differences);

  useEffect(() => {
    let cancelled = false;
    void loadSceneImage().then((image) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const layer = drawEffectLayer(image, differences, selectedId, selectionOnly);
      if (!layer) return;
      canvas.width = layer.width;
      canvas.height = layer.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, layer.width, layer.height);
      context.drawImage(layer, 0, 0);
    });
    return () => {
      cancelled = true;
    };
  }, [effectsKey, selectedId, selectionOnly]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/**
 * 자동 보충 후보.
 * 서로 충분히 떨어져 있고 경계에서 안전한 좌표만 고른다.
 * 서버가 아니라 여기서 채우는 이유는 문제 이미지를 렌더할 수 있는 쪽이 클라이언트뿐이기 때문이다.
 */
const AUTO_FILL_CANDIDATES: { seed: NormalizedPoint; color: string }[] = [
  { seed: { x: 0.18, y: 0.3 }, color: "#ef2b2d" },
  { seed: { x: 0.82, y: 0.28 }, color: "#1775e5" },
  { seed: { x: 0.3, y: 0.74 }, color: "#18a83a" },
  { seed: { x: 0.68, y: 0.76 }, color: "#ffd400" },
  { seed: { x: 0.5, y: 0.48 }, color: "#6522a8" },
];

const MINIMUM_GAP = 0.03;

function overlaps(candidate: Difference, existing: Difference[]): boolean {
  return existing.some((difference) => {
    const gap = Math.hypot(
      difference.region.x - candidate.region.x,
      difference.region.y - candidate.region.y,
    );
    return gap < difference.region.radius + candidate.region.radius + MINIMUM_GAP;
  });
}

/** 제한시간이 끝날 때 부족한 차이점을 후보로 채워 정확히 differenceCount개를 만든다. */
export function buildAutoFilledDifferences(current: Difference[]): Difference[] {
  const filled = [...current];
  for (const candidate of AUTO_FILL_CANDIDATES) {
    if (filled.length >= GAME_CONFIG.differenceCount) break;
    const fill: DifferenceFill = { seed: candidate.seed, color: candidate.color, tolerance: 34 };
    const difference: Difference = {
      id: `auto-${filled.length}-${candidate.seed.x}-${candidate.seed.y}`,
      kind: "COLOR",
      region: regionFromDifference(fill, []),
      fill,
    };
    if (overlaps(difference, filled)) continue;
    filled.push(difference);
  }
  return filled;
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
  const [color, setColor] = useState("#ef4444");
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [tolerance, setTolerance] = useState(34);
  const [fill, setFill] = useState<DifferenceFill | null>(null);

  const current: Difference | null = fill
    ? {
        id: "current-edit",
        kind: "COLOR",
        region: regionFromDifference(fill, []),
        fill,
      }
    : null;
  const preview = current ? [...value, current] : value;

  const clearCurrent = () => {
    setFill(null);
    setSelectionOnly(false);
  };

  const selectRegion = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || value.length >= GAME_CONFIG.differenceCount) return;
    const point = pointFromPointer(event);
    setFill({ seed: point, color, tolerance });
    setSelectionOnly(true);
  };

  const chooseColor = (nextColor: string) => {
    setColor(nextColor);
    setFill((currentFill) => currentFill ? { ...currentFill, color: nextColor } : currentFill);
    if (fill) setSelectionOnly(false);
  };

  const saveCurrent = () => {
    if (!current || selectionOnly || value.length >= GAME_CONFIG.differenceCount) return;
    onChange([...value, { ...current, id: `edit-${crypto.randomUUID()}` }]);
    clearCurrent();
  };

  const paletteColors = [
    { name: "빨강", value: "#ef2b2d", position: "left-[25%] top-[8%]" },
    { name: "주황", value: "#ff9418", position: "right-[20%] top-[10%]" },
    { name: "노랑", value: "#ffd400", position: "right-[5%] top-[38%]" },
    { name: "초록", value: "#18a83a", position: "bottom-[18%] right-[10%]" },
    { name: "파랑", value: "#1775e5", position: "bottom-[5%] right-[32%]" },
    { name: "남색", value: "#173568", position: "bottom-[6%] left-[30%]" },
    { name: "보라", value: "#6522a8", position: "bottom-[25%] left-[7%]" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white p-3 shadow">
        <span className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white">
          <MousePointer2 size={16}/>영역 색상 변경
        </span>
        <label className="flex items-center gap-2 text-xs font-bold">
          선택 범위
          <input type="range" min="12" max="70" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))}/>
        </label>
        <span className="text-xs font-bold text-slate-500">그림의 바꿀 부분을 먼저 클릭하세요.</span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
        <img src={gameSceneImg} alt="따뜻한 거실과 귀여운 고양이" className="block h-auto w-full select-none" draggable={false}/>
        <DifferenceEffects differences={preview} selectedId={current?.fill ? "current-edit" : undefined} selectionOnly={selectionOnly}/>
        <svg
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          className={`absolute inset-0 h-full w-full touch-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          onPointerDown={selectRegion}
        />

        <aside
          aria-label="나무 색상 팔레트"
          className="absolute right-2 top-2 z-20 h-28 w-40 rounded-[48%] border-[5px] border-[#9a5b24] shadow-2xl sm:right-4 sm:top-4 sm:h-36 sm:w-52"
          style={{
            background:
              "radial-gradient(circle at 35% 28%, #f7d38b 0 8%, transparent 9%), repeating-linear-gradient(12deg, #dca65a 0 8px, #cf9148 9px 12px, #e3b56c 13px 20px)",
          }}
        >
          <div className="absolute left-[3%] top-[34%] h-[30%] w-[18%] rounded-full bg-white/90 shadow-inner ring-2 ring-[#a56a32]" aria-hidden="true"/>
          {paletteColors.map((candidate) => (
            <button
              key={candidate.name}
              type="button"
              title={candidate.name}
              aria-label={candidate.name}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => chooseColor(candidate.value)}
              className={`absolute h-[20%] w-[18%] rounded-[45%_55%_48%_52%] border-2 transition hover:scale-110 ${candidate.position} ${color === candidate.value ? "border-white ring-2 ring-slate-900" : "border-white/60"}`}
              style={{
                background: `radial-gradient(circle at 35% 25%, rgba(255,255,255,.75), transparent 22%), ${candidate.value}`,
                boxShadow: "0 3px 4px rgba(91,48,16,.35)",
              }}
            />
          ))}
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#82501f]/75 px-2 py-1 text-[9px] font-black text-white sm:text-[10px]">
            {selectionOnly ? "색 선택" : "7 COLORS"}
          </span>
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" disabled={!current} onClick={clearCurrent} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-40">
          <Trash2 size={16}/>현재 작업 삭제
        </button>
        <button type="button" disabled={!current || selectionOnly || value.length >= GAME_CONFIG.differenceCount} onClick={saveCurrent} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-2 font-black text-white disabled:opacity-40">
          <Check size={17}/>차이점으로 저장
        </button>
      </div>
      <p className="mt-3 text-center text-sm font-bold text-violet-700">
        {selectionOnly ? "하이라이트된 영역을 확인하고 나무 팔레트에서 색을 선택하세요." : "영역을 클릭하고 7가지 색 중 하나로 바꾸세요."} · 완료 {value.length}/{GAME_CONFIG.differenceCount}
      </p>
    </div>
  );
}
