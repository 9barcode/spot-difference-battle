import {
  GAME_CONFIG,
  type Difference,
  type DifferenceObjectEdit,
  type ObjectShapeEffect,
} from "@spot-battle/shared";
import { Check, MousePointer2, Shapes, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode, type SVGProps } from "react";
import type { GameSceneDefinition } from "./game-scenes";
import {
  type SceneMaskPrimitive,
  type SceneObjectDefinition,
} from "./scene-objects";

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const RENDER_MAX_WIDTH = 1000;
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 562.5;

function sceneSize(image: HTMLImageElement) {
  const width = Math.min(RENDER_MAX_WIDTH, image.naturalWidth);
  return { width, height: Math.round((width * image.naturalHeight) / image.naturalWidth) };
}

function loadSceneImage(scene: GameSceneDefinition): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("원본 그림을 불러오지 못했습니다."));
    image.src = scene.imageSrc;
  });
}

function tracePrimitive(
  context: CanvasRenderingContext2D,
  primitive: SceneMaskPrimitive,
  width: number,
  height: number,
): void {
  if (primitive.kind === "ellipse") {
    const rotation = ((primitive.rotate ?? 0) * Math.PI) / 180;
    const centerX = primitive.cx * width;
    const centerY = primitive.cy * height;
    const radiusX = primitive.rx * width;
    const radiusY = primitive.ry * height;
    // moveTo로 새 서브패스를 시작하지 않으면 여러 객체 마스크 사이가 직선으로 연결될 수 있다.
    context.moveTo(centerX + Math.cos(rotation) * radiusX, centerY + Math.sin(rotation) * radiusX);
    context.ellipse(centerX, centerY, radiusX, radiusY, rotation, 0, Math.PI * 2);
    return;
  }

  if (primitive.kind === "rect") {
    const x = primitive.x * width;
    const y = primitive.y * height;
    const rectWidth = primitive.width * width;
    const rectHeight = primitive.height * height;
    const radius = (primitive.radius ?? 0) * Math.min(width, height);
    if (primitive.rotate) {
      context.save();
      context.translate(x + rectWidth / 2, y + rectHeight / 2);
      context.rotate((primitive.rotate * Math.PI) / 180);
      context.moveTo(-rectWidth / 2, -rectHeight / 2);
      context.roundRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight, radius);
      context.restore();
    } else {
      context.moveTo(x, y);
      context.roundRect(x, y, rectWidth, rectHeight, radius);
    }
    return;
  }

  const [first, ...rest] = primitive.points;
  if (!first) return;
  context.moveTo(first[0] * width, first[1] * height);
  rest.forEach(([x, y]) => context.lineTo(x * width, y * height));
  context.closePath();
}

function traceObjectMask(
  context: CanvasRenderingContext2D,
  object: SceneObjectDefinition,
  width: number,
  height: number,
): void {
  context.beginPath();
  object.masks.forEach((primitive) => tracePrimitive(context, primitive, width, height));
}

function createObjectMask(
  object: SceneObjectDefinition,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#fff";
  // 각 primitive를 개별 경로로 채워 서로 떨어진 객체 조각 사이에 연결 면이 생기지 않게 한다.
  object.masks.forEach((primitive) => {
    context.beginPath();
    tracePrimitive(context, primitive, width, height);
    context.fill();
  });
  if (object.excludeMasks?.length) {
    context.globalCompositeOperation = "destination-out";
    object.excludeMasks.forEach((primitive) => {
      context.beginPath();
      tracePrimitive(context, primitive, width, height);
      context.fill();
    });
    context.globalCompositeOperation = "source-over";
  }
  return canvas;
}

function drawStar(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
): void {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const currentRadius = index % 2 === 0 ? radius : radius * 0.42;
    const x = centerX + Math.cos(angle) * currentRadius;
    const y = centerY + Math.sin(angle) * currentRadius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function drawShapeEffect(
  context: CanvasRenderingContext2D,
  object: SceneObjectDefinition,
  edit: DifferenceObjectEdit,
  width: number,
  height: number,
  maskCanvas: HTMLCanvasElement,
): void {
  if (["NONE", "WIDE", "TALL"].includes(edit.shapeEffect)) return;

  const effectCanvas = document.createElement("canvas");
  effectCanvas.width = width;
  effectCanvas.height = height;
  const effectContext = effectCanvas.getContext("2d");
  if (!effectContext) return;
  effectContext.globalAlpha = 0.9;
  effectContext.strokeStyle = "rgba(255,255,255,.9)";
  effectContext.fillStyle = "rgba(255,255,255,.86)";
  effectContext.lineWidth = Math.max(3, width * 0.006);

  if (edit.shapeEffect === "STRIPES") {
    for (let x = -height; x < width + height; x += Math.max(18, width * 0.035)) {
      effectContext.beginPath();
      effectContext.moveTo(x, 0);
      effectContext.lineTo(x + height, height);
      effectContext.stroke();
    }
  } else if (edit.shapeEffect === "DOTS") {
    const gap = Math.max(24, width * 0.045);
    const radius = Math.max(4, width * 0.006);
    for (let y = gap / 2; y < height; y += gap) {
      for (let x = gap / 2; x < width; x += gap) {
        effectContext.beginPath();
        effectContext.arc(x, y, radius, 0, Math.PI * 2);
        effectContext.fill();
      }
    }
  } else if (edit.shapeEffect === "STAR") {
    const radius = Math.max(14, Math.min(width, height) * object.region.radius * 0.7);
    drawStar(effectContext, object.region.x * width, object.region.y * height, radius);
    effectContext.fill();
  } else if (edit.shapeEffect === "OUTLINE") {
    traceObjectMask(effectContext, object, width, height);
    effectContext.lineJoin = "round";
    effectContext.strokeStyle = "rgba(255,255,255,.95)";
    effectContext.lineWidth = Math.max(5, width * 0.008);
    effectContext.stroke();
  }

  effectContext.globalCompositeOperation = "destination-in";
  effectContext.globalAlpha = 1;
  effectContext.drawImage(maskCanvas, 0, 0);
  context.drawImage(effectCanvas, 0, 0);
}

function drawObjectWithShapeTransform(
  target: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  shapeEffect: ObjectShapeEffect,
  centerX: number,
  centerY: number,
): void {
  if (shapeEffect !== "WIDE" && shapeEffect !== "TALL") {
    target.drawImage(source, 0, 0);
    return;
  }

  const transformed = document.createElement("canvas");
  transformed.width = source.width;
  transformed.height = source.height;
  const context = transformed.getContext("2d");
  if (!context) {
    target.drawImage(source, 0, 0);
    return;
  }

  const scaleX = shapeEffect === "WIDE" ? 1.22 : 1;
  const scaleY = shapeEffect === "TALL" ? 1.22 : 1;
  context.translate(centerX, centerY);
  context.scale(scaleX, scaleY);
  context.translate(-centerX, -centerY);
  context.drawImage(source, 0, 0);
  target.drawImage(transformed, 0, 0);
}

/** 원본 위에 얹을 객체별 효과만 담은 투명 캔버스를 만든다. */
function drawEffectLayer(
  image: HTMLImageElement,
  differences: Difference[],
  scene: GameSceneDefinition,
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

  differences.forEach((difference) => {
    const edit = difference.objectEdit;
    if (!edit) return;
    const object = scene.objectsById.get(edit.objectId);
    if (!object) return;

    const maskCanvas = createObjectMask(object, width, height);
    const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!maskContext) return;
    const mask = maskContext.getImageData(0, 0, width, height).data;
    const objectCanvas = document.createElement("canvas");
    objectCanvas.width = width;
    objectCanvas.height = height;
    const objectContext = objectCanvas.getContext("2d");
    if (!objectContext) return;
    const output = objectContext.createImageData(width, height);
    const [targetR, targetG, targetB] = hexToRgb(edit.color);
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let offset = 0; offset < source.data.length; offset += 4) {
      const alpha = mask[offset + 3] ?? 0;
      if (alpha === 0) continue;
      const pixelIndex = offset / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const luminance =
        (source.data[offset]! * 0.299 +
          source.data[offset + 1]! * 0.587 +
          source.data[offset + 2]! * 0.114) /
        255;
      const shade = 0.28 + luminance * 0.92;
      output.data[offset] = Math.min(255, targetR * shade);
      output.data[offset + 1] = Math.min(255, targetG * shade);
      output.data[offset + 2] = Math.min(255, targetB * shade);
      output.data[offset + 3] = Math.round(alpha * 0.88);
    }

    objectContext.putImageData(output, 0, 0);
    drawShapeEffect(objectContext, object, edit, width, height, maskCanvas);
    const centerX = minX <= maxX ? (minX + maxX) / 2 : object.region.x * width;
    const centerY = minY <= maxY ? (minY + maxY) / 2 : object.region.y * height;
    drawObjectWithShapeTransform(context, objectCanvas, edit.shapeEffect, centerX, centerY);
  });

  return canvas;
}

/** 원본과 객체별 효과를 합쳐 문제 이미지를 만든다. */
export async function renderProblemImage(
  differences: Difference[],
  scene: GameSceneDefinition,
): Promise<string> {
  const image = await loadSceneImage(scene);
  const { width, height } = sceneSize(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("문제 이미지를 만들 수 없습니다.");

  context.drawImage(image, 0, 0, width, height);
  const layer = drawEffectLayer(image, differences, scene);
  if (layer) context.drawImage(layer, 0, 0);
  return canvas.toDataURL("image/png");
}

export function DifferenceEffects({
  differences,
  scene,
}: {
  differences: Difference[];
  scene: GameSceneDefinition;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectsKey = JSON.stringify(differences);

  useEffect(() => {
    let cancelled = false;
    void loadSceneImage(scene).then((image) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const layer = drawEffectLayer(image, differences, scene);
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
  }, [effectsKey, scene]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function overlaps(candidate: Difference, existing: Difference[]): boolean {
  return existing.some((difference) => {
    const gap = Math.hypot(
      difference.region.x - candidate.region.x,
      difference.region.y - candidate.region.y,
    );
    return gap < difference.region.radius + candidate.region.radius + 0.012;
  });
}

const AUTO_FILL_COLORS = ["#ef2b2d", "#1775e5", "#18a83a", "#ffd400", "#6522a8"];
const AUTO_FILL_SHAPES: ObjectShapeEffect[] = ["WIDE", "TALL", "STRIPES", "DOTS", "OUTLINE", "NONE"];

/** 제한시간이 끝날 때 부족한 차이점을 서로 다른 고정 객체로 채운다. */
export function buildAutoFilledDifferences(
  current: Difference[],
  scene: GameSceneDefinition,
): Difference[] {
  const filled = [...current];
  const used = new Set(filled.map((difference) => difference.objectEdit?.objectId).filter(Boolean));

  for (const [index, objectId] of scene.autoFillObjectIds.entries()) {
    if (filled.length >= GAME_CONFIG.differenceCount) break;
    if (used.has(objectId)) continue;
    const object = scene.objectsById.get(objectId);
    if (!object) continue;
    const difference: Difference = {
      id: `auto-${object.id}-${filled.length}`,
      kind: "COLOR",
      region: { ...object.region },
      objectEdit: {
        objectId: object.id,
        objectLabel: object.label,
        color: AUTO_FILL_COLORS[index % AUTO_FILL_COLORS.length]!,
        shapeEffect: AUTO_FILL_SHAPES[index % AUTO_FILL_SHAPES.length]!,
      },
    };
    if (overlaps(difference, filled)) continue;
    filled.push(difference);
    used.add(objectId);
  }
  return filled;
}

type ScenePrimitiveSvgProps = SVGProps<SVGElement> & {
  "data-testid"?: string;
  "data-object-id"?: string;
};

function renderSvgPrimitive(
  primitive: SceneMaskPrimitive,
  key: string,
  props: ScenePrimitiveSvgProps,
): ReactNode {
  if (primitive.kind === "ellipse") {
    const cx = primitive.cx * SVG_WIDTH;
    const cy = primitive.cy * SVG_HEIGHT;
    return (
      <ellipse
        key={key}
        cx={cx}
        cy={cy}
        rx={primitive.rx * SVG_WIDTH}
        ry={primitive.ry * SVG_HEIGHT}
        transform={primitive.rotate ? `rotate(${primitive.rotate} ${cx} ${cy})` : undefined}
        {...(props as SVGProps<SVGEllipseElement>)}
      />
    );
  }
  if (primitive.kind === "rect") {
    const x = primitive.x * SVG_WIDTH;
    const y = primitive.y * SVG_HEIGHT;
    const width = primitive.width * SVG_WIDTH;
    const height = primitive.height * SVG_HEIGHT;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return (
      <rect
        key={key}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={(primitive.radius ?? 0) * Math.min(SVG_WIDTH, SVG_HEIGHT)}
        transform={primitive.rotate ? `rotate(${primitive.rotate} ${centerX} ${centerY})` : undefined}
        {...(props as SVGProps<SVGRectElement>)}
      />
    );
  }
  return (
    <polygon
      key={key}
      points={primitive.points.map(([x, y]) => `${x * SVG_WIDTH},${y * SVG_HEIGHT}`).join(" ")}
      {...(props as SVGProps<SVGPolygonElement>)}
    />
  );
}

const PALETTE = [
  { name: "빨강", value: "#ef2b2d" },
  { name: "주황", value: "#ff9418" },
  { name: "노랑", value: "#ffd400" },
  { name: "초록", value: "#18a83a" },
  { name: "파랑", value: "#1775e5" },
  { name: "남색", value: "#173568" },
  { name: "보라", value: "#6522a8" },
];

const SHAPE_EFFECTS: Array<{ value: ObjectShapeEffect; label: string }> = [
  { value: "NONE", label: "색상만" },
  { value: "WIDE", label: "가로로 넓게" },
  { value: "TALL", label: "세로로 길게" },
  { value: "STRIPES", label: "줄무늬" },
  { value: "DOTS", label: "점무늬" },
  { value: "STAR", label: "별 무늬" },
  { value: "OUTLINE", label: "윤곽 변경" },
];

export function FreeformEditor({
  value,
  onChange,
  scene,
  disabled = false,
}: {
  value: Difference[];
  onChange: (next: Difference[]) => void;
  scene: GameSceneDefinition;
  disabled?: boolean;
}) {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [color, setColor] = useState("#ef2b2d");
  const [shapeEffect, setShapeEffect] = useState<ObjectShapeEffect>("NONE");
  const selectedObject = selectedObjectId ? scene.objectsById.get(selectedObjectId) ?? null : null;
  const usedObjectIds = useMemo(
    () => new Set(value.map((difference) => difference.objectEdit?.objectId).filter(Boolean)),
    [value],
  );

  const current: Difference | null = selectedObject
    ? {
        id: "current-edit",
        kind: shapeEffect === "NONE" ? "COLOR" : "DRAW",
        region: { ...selectedObject.region },
        objectEdit: {
          objectId: selectedObject.id,
          objectLabel: selectedObject.label,
          color,
          shapeEffect,
        },
      }
    : null;
  const preview = current ? [...value, current] : value;

  const selectObject = (object: SceneObjectDefinition) => {
    if (disabled || value.length >= GAME_CONFIG.differenceCount || usedObjectIds.has(object.id)) return;
    setSelectedObjectId(object.id);
  };

  const clearCurrent = () => setSelectedObjectId(null);

  const saveCurrent = () => {
    if (!current || value.length >= GAME_CONFIG.differenceCount) return;
    onChange([...value, { ...current, id: `object-${crypto.randomUUID()}` }]);
    clearCurrent();
  };

  const removeSaved = (id: string) => {
    if (disabled) return;
    onChange(value.filter((difference) => difference.id !== id));
  };

  return (
    <div>
      <div className="mb-3 rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white">
            <MousePointer2 size={16} /> 객체 직접 선택
          </span>
          <span className="text-sm font-bold text-slate-600">
            {scene.objects.slice(0, 8).map((object) => object.label).join("·")} 등이 서로 다른 객체로 분리되어 있습니다.
          </span>
        </div>
        {selectedObject && (
          <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <p className="mb-2 text-xs font-black text-slate-500">선택 객체: {selectedObject.label}</p>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((candidate) => (
                  <button
                    key={candidate.value}
                    type="button"
                    title={candidate.name}
                    aria-label={candidate.name}
                    onClick={() => setColor(candidate.value)}
                    className={`h-9 w-9 rounded-full border-4 transition hover:scale-110 ${
                      color === candidate.value ? "border-slate-900" : "border-white shadow"
                    }`}
                    style={{ backgroundColor: candidate.value }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-black text-slate-500"><Shapes size={14}/>모양 변경</p>
              <div className="flex flex-wrap gap-2">
                {SHAPE_EFFECTS.map((effect) => (
                  <button
                    key={effect.value}
                    type="button"
                    onClick={() => setShapeEffect(effect.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-black ${
                      shapeEffect === effect.value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {effect.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={clearCurrent} className="rounded-xl bg-red-50 p-3 text-red-600" title="선택 취소">
                <Trash2 size={18} />
              </button>
              <button type="button" onClick={saveCurrent} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-5 py-3 font-black text-white">
                <Check size={17} />차이점 저장
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl">
        <img src={scene.imageSrc} alt={scene.imageAlt} className="block h-auto w-full select-none" draggable={false} />
        <DifferenceEffects differences={preview} scene={scene} />
        <svg
          data-testid="editor-board"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          preserveAspectRatio="none"
          className={`absolute inset-0 h-full w-full touch-none ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <style>{`
            .coarse-object-hit-target { pointer-events: none; }
            @media (pointer: coarse) {
              .coarse-object-hit-target { pointer-events: all; }
            }
          `}</style>
          {scene.objects.flatMap((object) => {
            const isCurrent = object.id === selectedObjectId;
            const isSaved = usedObjectIds.has(object.id);
            return [
              <circle
                key={`${object.id}-coarse-hit-target`}
                className="coarse-object-hit-target"
                cx={object.region.x * SVG_WIDTH}
                cy={object.region.y * SVG_HEIGHT}
                r={Math.max(object.region.radius * SVG_WIDTH, 55)}
                fill="rgba(255,255,255,.001)"
                data-testid={`scene-object-hit-${object.id}`}
                data-object-id={object.id}
                aria-hidden="true"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectObject(object);
                }}
              />,
              ...object.masks.map((primitive, index) =>
                renderSvgPrimitive(primitive, `${object.id}-${index}`, {
                  fill: isCurrent ? "rgba(124,58,237,.22)" : isSaved ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.001)",
                  stroke: isCurrent ? "#7c3aed" : isSaved ? "#10b981" : "transparent",
                  strokeWidth: isCurrent || isSaved ? 4 : 0,
                  vectorEffect: "non-scaling-stroke",
                  "data-testid": index === 0 ? `scene-object-${object.id}` : undefined,
                  "data-object-id": object.id,
                  "aria-label": index === 0 ? `${object.label} 선택` : undefined,
                  role: index === 0 ? "button" : undefined,
                  tabIndex: index === 0 ? 0 : undefined,
                  onKeyDown: (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectObject(object);
                  },
                  onPointerDown: (event) => {
                    event.stopPropagation();
                    selectObject(object);
                  },
                }),
              ),
            ];
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {value.map((difference, index) => (
          <span key={difference.id} className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-800">
            {index + 1}. {difference.objectEdit?.objectLabel ?? "객체"}
            <button type="button" onClick={() => removeSaved(difference.id)} disabled={disabled} aria-label="저장한 차이점 삭제" className="rounded-full bg-white/70 p-1 disabled:opacity-30">
              <X size={13}/>
            </button>
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-sm font-bold text-violet-700">
        그림 속 객체를 클릭한 뒤 색상과 모양·무늬 효과를 선택하세요. · 완료 {value.length}/{GAME_CONFIG.differenceCount}
      </p>
    </div>
  );
}
