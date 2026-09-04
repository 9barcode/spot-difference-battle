import type { FoundMark, NormalizedPoint } from "@spot-battle/shared";
import { useRef } from "react";
import {
  normalizedPointFromClient,
  type ImageViewport,
} from "../model/image-geometry";

interface ImageBoardProps {
  src: string;
  alt: string;
  marks?: FoundMark[];
  onSelect?: (point: NormalizedPoint) => void;
  viewport: ImageViewport;
  onPanBy: (delta: NormalizedPoint) => void;
}

export function ImageBoard({
  src,
  alt,
  marks = [],
  onSelect,
  viewport,
  onPanBy,
}: ImageBoardProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const interactive = Boolean(onSelect) || viewport.scale > 1;

  return (
    <div
      data-testid={alt.endsWith("변경본") ? "modified-board" : "original-board"}
      className={`relative mx-auto aspect-square overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-lg ${interactive ? "cursor-crosshair" : ""}`}
      style={{ touchAction: viewport.scale > 1 ? "none" : "manipulation" }}
      onPointerDown={(event) => {
        if (!interactive || (event.pointerType === "mouse" && event.button !== 0)) return;
        gestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const totalDistance = Math.hypot(
          event.clientX - gesture.startX,
          event.clientY - gesture.startY,
        );
        if (totalDistance > 6) gesture.moved = true;
        if (viewport.scale > 1) {
          const rect = event.currentTarget.getBoundingClientRect();
          onPanBy({
            x: (event.clientX - gesture.lastX) / rect.width,
            y: (event.clientY - gesture.lastY) / rect.height,
          });
        }
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
      }}
      onPointerUp={(event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        gestureRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!gesture.moved && onSelect && imageRef.current) {
          onSelect(
            normalizedPointFromClient(
              event.clientX,
              event.clientY,
              imageRef.current.getBoundingClientRect(),
            ),
          );
        }
      }}
      onPointerCancel={() => {
        gestureRef.current = null;
      }}
    >
      <div
        className="absolute inset-0 origin-center will-change-transform"
        style={{
          transform: `translate(${viewport.pan.x * 100}%, ${viewport.pan.y * 100}%) scale(${viewport.scale})`,
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          className="block h-full w-full select-none object-contain"
        />
        {marks.map((mark, index) => (
          <span
            key={`${mark.differenceId}-${index}`}
            className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-emerald-400 bg-emerald-300/25 font-black text-emerald-950"
            style={{
              left: `${mark.region.x * 100}%`,
              top: `${mark.region.y * 100}%`,
              width: `${mark.region.radius * 200}%`,
              aspectRatio: "1",
            }}
          >
            ✓
          </span>
        ))}
      </div>
    </div>
  );
}
