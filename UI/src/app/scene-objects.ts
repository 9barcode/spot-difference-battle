import type { AnswerRegion } from "@spot-battle/shared";

export type SceneMaskPrimitive =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; radius?: number; rotate?: number }
  | { kind: "polygon"; points: Array<[number, number]> };

export interface SceneObjectDefinition {
  id: string;
  label: string;
  region: AnswerRegion;
  masks: SceneMaskPrimitive[];
  /** 큰 객체 안에 포함된 별도 객체를 색칠 범위에서 제외한다. */
  excludeMasks?: SceneMaskPrimitive[];
}

/**
 * 원본 PNG 위에 얹는 수동 오브젝트 맵이다.
 * 모든 좌표는 0~1 정규화 좌표이므로 화면 크기와 렌더 해상도에 관계없이 동일하게 동작한다.
 * 래스터 이미지 자체에는 레이어 정보가 없기 때문에, 클릭 가능한 객체와 색상 변경 범위를 여기서 명시한다.
 */
export const SCENE_OBJECTS: SceneObjectDefinition[] = [
  {
    id: "plant",
    label: "화분과 식물",
    region: { x: 0.06, y: 0.65, radius: 0.055 },
    masks: [
      { kind: "ellipse", cx: 0.035, cy: 0.26, rx: 0.017, ry: 0.050, rotate: -38 },
      { kind: "ellipse", cx: 0.068, cy: 0.28, rx: 0.020, ry: 0.055, rotate: -18 },
      { kind: "ellipse", cx: 0.105, cy: 0.33, rx: 0.022, ry: 0.060, rotate: 42 },
      { kind: "ellipse", cx: 0.020, cy: 0.38, rx: 0.024, ry: 0.055, rotate: -55 },
      { kind: "ellipse", cx: 0.065, cy: 0.39, rx: 0.021, ry: 0.055, rotate: 12 },
      { kind: "ellipse", cx: 0.120, cy: 0.43, rx: 0.024, ry: 0.065, rotate: 55 },
      { kind: "ellipse", cx: 0.025, cy: 0.50, rx: 0.027, ry: 0.060, rotate: -42 },
      { kind: "ellipse", cx: 0.075, cy: 0.50, rx: 0.025, ry: 0.065, rotate: 20 },
      { kind: "ellipse", cx: 0.125, cy: 0.55, rx: 0.025, ry: 0.065, rotate: 58 },
      { kind: "ellipse", cx: 0.035, cy: 0.61, rx: 0.027, ry: 0.060, rotate: -35 },
      { kind: "ellipse", cx: 0.085, cy: 0.62, rx: 0.025, ry: 0.060, rotate: 18 },
      { kind: "rect", x: 0.048, y: 0.28, width: 0.010, height: 0.46, radius: 0.004, rotate: -5 },
      { kind: "rect", x: 0.080, y: 0.32, width: 0.009, height: 0.42, radius: 0.004, rotate: 6 },
      { kind: "polygon", points: [[0.0,0.70],[0.09,0.69],[0.09,0.91],[0.01,0.91]] },
    ],
  },
  {
    id: "lamp",
    label: "전등",
    region: { x: 0.225, y: 0.19, radius: 0.06 },
    masks: [
      { kind: "polygon", points: [[0.19,0.10],[0.25,0.095],[0.285,0.22],[0.205,0.27]] },
      { kind: "rect", x: 0.174, y: 0.08, width: 0.012, height: 0.35, radius: 0.006 },
      { kind: "ellipse", cx: 0.181, cy: 0.09, rx: 0.027, ry: 0.012 },
    ],
  },
  {
    id: "sofa",
    label: "소파",
    region: { x: 0.20, y: 0.70, radius: 0.055 },
    masks: [
      { kind: "polygon", points: [[0.0,0.42],[0.09,0.40],[0.17,0.42],[0.19,0.64],[0.15,0.84],[0.02,0.84],[0.0,0.72]] },
      { kind: "polygon", points: [[0.12,0.42],[0.28,0.41],[0.37,0.51],[0.36,0.75],[0.30,0.80],[0.12,0.78]] },
      { kind: "polygon", points: [[0.17,0.64],[0.37,0.59],[0.37,0.76],[0.30,0.82],[0.14,0.80]] },
    ],
    excludeMasks: [
      { kind: "polygon", points: [[0.18,0.45],[0.30,0.43],[0.34,0.61],[0.20,0.64],[0.17,0.52]] },
    ],
  },
  {
    id: "pillow",
    label: "베개",
    region: { x: 0.26, y: 0.53, radius: 0.055 },
    masks: [
      { kind: "polygon", points: [[0.18,0.45],[0.30,0.43],[0.34,0.61],[0.20,0.64],[0.17,0.52]] },
    ],
  },
  {
    id: "window",
    label: "창문",
    region: { x: 0.50, y: 0.32, radius: 0.07 },
    masks: [
      { kind: "rect", x: 0.38, y: 0.08, width: 0.22, height: 0.42, radius: 0.005 },
    ],
    excludeMasks: [
      { kind: "ellipse", cx: 0.54, cy: 0.17, rx: 0.035, ry: 0.035 },
      { kind: "ellipse", cx: 0.57, cy: 0.14, rx: 0.035, ry: 0.045 },
      { kind: "ellipse", cx: 0.59, cy: 0.18, rx: 0.04, ry: 0.035 },
    ],
  },
  {
    id: "left-curtain",
    label: "왼쪽 커튼",
    region: { x: 0.345, y: 0.30, radius: 0.05 },
    masks: [
      { kind: "polygon", points: [[0.30,0.02],[0.39,0.02],[0.37,0.30],[0.36,0.53],[0.31,0.52]] },
    ],
  },
  {
    id: "right-curtain",
    label: "오른쪽 커튼",
    region: { x: 0.65, y: 0.42, radius: 0.05 },
    masks: [
      { kind: "polygon", points: [[0.59,0.02],[0.68,0.02],[0.67,0.60],[0.62,0.59],[0.60,0.34]] },
    ],
  },
  {
    id: "cloud",
    label: "구름",
    region: { x: 0.555, y: 0.17, radius: 0.045 },
    masks: [
      { kind: "ellipse", cx: 0.54, cy: 0.17, rx: 0.035, ry: 0.035 },
      { kind: "ellipse", cx: 0.57, cy: 0.14, rx: 0.035, ry: 0.045 },
      { kind: "ellipse", cx: 0.59, cy: 0.18, rx: 0.04, ry: 0.035 },
    ],
  },
  {
    id: "clock",
    label: "시계",
    region: { x: 0.76, y: 0.20, radius: 0.055 },
    masks: [
      { kind: "ellipse", cx: 0.76, cy: 0.20, rx: 0.055, ry: 0.095 },
    ],
  },
  {
    id: "picture",
    label: "액자",
    region: { x: 0.91, y: 0.25, radius: 0.055 },
    masks: [
      { kind: "rect", x: 0.845, y: 0.12, width: 0.14, height: 0.28, radius: 0.005 },
    ],
  },
  {
    id: "vase",
    label: "꽃병",
    region: { x: 0.79, y: 0.48, radius: 0.05 },
    masks: [
      { kind: "polygon", points: [[0.77,0.38],[0.81,0.38],[0.83,0.50],[0.82,0.56],[0.76,0.56],[0.75,0.50]] },
    ],
  },
  {
    id: "books",
    label: "책",
    region: { x: 0.91, y: 0.53, radius: 0.05 },
    masks: [
      { kind: "rect", x: 0.86, y: 0.47, width: 0.11, height: 0.035, radius: 0.01 },
      { kind: "rect", x: 0.855, y: 0.505, width: 0.12, height: 0.035, radius: 0.01 },
      { kind: "rect", x: 0.85, y: 0.54, width: 0.13, height: 0.038, radius: 0.01 },
    ],
  },
  {
    id: "rug",
    label: "카펫",
    region: { x: 0.42, y: 0.88, radius: 0.06 },
    masks: [
      { kind: "ellipse", cx: 0.50, cy: 0.86, rx: 0.32, ry: 0.135 },
    ],
    excludeMasks: [
      { kind: "ellipse", cx: 0.515, cy: 0.64, rx: 0.045, ry: 0.075 },
      { kind: "ellipse", cx: 0.505, cy: 0.76, rx: 0.055, ry: 0.12 },
      { kind: "polygon", points: [[0.47,0.60],[0.48,0.55],[0.50,0.60]] },
      { kind: "polygon", points: [[0.53,0.59],[0.55,0.55],[0.56,0.61]] },
      { kind: "ellipse", cx: 0.46, cy: 0.86, rx: 0.055, ry: 0.035, rotate: -10 },
      { kind: "ellipse", cx: 0.647, cy: 0.895, rx: 0.025, ry: 0.038, rotate: -12 },
    ],
  },
  {
    id: "cabinet",
    label: "서랍장",
    region: { x: 0.83, y: 0.71, radius: 0.07 },
    masks: [
      { kind: "polygon", points: [[0.69,0.56],[1.0,0.57],[1.0,0.84],[0.72,0.80]] },
    ],
  },
  {
    id: "cat",
    label: "고양이",
    region: { x: 0.51, y: 0.72, radius: 0.055 },
    masks: [
      { kind: "ellipse", cx: 0.515, cy: 0.64, rx: 0.045, ry: 0.075 },
      { kind: "ellipse", cx: 0.505, cy: 0.76, rx: 0.055, ry: 0.12 },
      { kind: "polygon", points: [[0.47,0.60],[0.48,0.55],[0.50,0.60]] },
      { kind: "polygon", points: [[0.53,0.59],[0.55,0.55],[0.56,0.61]] },
      { kind: "ellipse", cx: 0.46, cy: 0.86, rx: 0.055, ry: 0.035, rotate: -10 },
    ],
  },
  {
    id: "ball",
    label: "공",
    region: { x: 0.647, y: 0.895, radius: 0.042 },
    masks: [
      { kind: "ellipse", cx: 0.647, cy: 0.895, rx: 0.025, ry: 0.038, rotate: -12 },
    ],
  },
];

export const SCENE_OBJECTS_BY_ID = new Map(SCENE_OBJECTS.map((object) => [object.id, object]));
