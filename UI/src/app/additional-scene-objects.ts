import type { SceneObjectDefinition } from "./scene-objects";

/** 사용자 제공 1024×1024 장면의 수동 객체 맵. 모든 값은 정규화 좌표다. */
export const CAFE_SCENE_OBJECTS: SceneObjectDefinition[] = [
  { id: "cafe-left-pendant", label: "왼쪽 펜던트 조명", region: { x: 0.095, y: 0.13, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.09, cy: 0.20, rx: 0.035, ry: 0.045 }, { kind: "rect", x: 0.087, y: 0, width: 0.008, height: 0.17 }] },
  { id: "cafe-center-pendant", label: "가운데 펜던트 조명", region: { x: 0.31, y: 0.19, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.31, cy: 0.20, rx: 0.04, ry: 0.045 }, { kind: "rect", x: 0.307, y: 0, width: 0.008, height: 0.17 }] },
  { id: "cafe-small-pendant", label: "작은 펜던트 조명", region: { x: 0.38, y: 0.26, radius: 0.04 }, masks: [{ kind: "ellipse", cx: 0.375, cy: 0.27, rx: 0.027, ry: 0.025 }, { kind: "rect", x: 0.372, y: 0.09, width: 0.007, height: 0.16 }] },
  { id: "cafe-clock", label: "벽시계", region: { x: 0.65, y: 0.21, radius: 0.055 }, masks: [{ kind: "ellipse", cx: 0.65, cy: 0.21, rx: 0.075, ry: 0.082 }] },
  { id: "cafe-wall-books", label: "벽 선반의 책", region: { x: 0.08, y: 0.28, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0.0, 0.25], [0.13, 0.25], [0.13, 0.31], [0.0, 0.31]] }] },
  { id: "cafe-counter-plant", label: "카운터 화분", region: { x: 0.46, y: 0.25, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.45, cy: 0.225, rx: 0.035, ry: 0.055 }, { kind: "rect", x: 0.438, y: 0.25, width: 0.035, height: 0.035, radius: 0.006 }] },
  { id: "cafe-cake", label: "딸기 케이크", region: { x: 0.46, y: 0.53, radius: 0.05 }, masks: [{ kind: "ellipse", cx: 0.46, cy: 0.555, rx: 0.055, ry: 0.018 }, { kind: "rect", x: 0.415, y: 0.50, width: 0.09, height: 0.06, radius: 0.012 }] },
  { id: "cafe-macarons", label: "마카롱", region: { x: 0.55, y: 0.60, radius: 0.045 }, masks: [{ kind: "rect", x: 0.50, y: 0.57, width: 0.09, height: 0.075, radius: 0.025 }] },
  { id: "cafe-croissants", label: "크루아상", region: { x: 0.67, y: 0.61, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0.59, 0.58], [0.74, 0.58], [0.76, 0.65], [0.60, 0.65]] }] },
  { id: "cafe-covered-pastries", label: "유리 덮개 속 빵", region: { x: 0.70, y: 0.43, radius: 0.05 }, masks: [{ kind: "ellipse", cx: 0.70, cy: 0.425, rx: 0.065, ry: 0.045 }, { kind: "rect", x: 0.64, y: 0.425, width: 0.12, height: 0.03, radius: 0.01 }] },
  { id: "cafe-display-case", label: "진열장", region: { x: 0.40, y: 0.72, radius: 0.055 }, masks: [{ kind: "rect", x: 0.39, y: 0.47, width: 0.39, height: 0.025 }, { kind: "rect", x: 0.39, y: 0.70, width: 0.39, height: 0.03 }, { kind: "rect", x: 0.39, y: 0.47, width: 0.02, height: 0.26 }, { kind: "rect", x: 0.76, y: 0.47, width: 0.02, height: 0.26 }] },
  { id: "cafe-cat", label: "산타 모자 고양이", region: { x: 0.72, y: 0.70, radius: 0.06 }, masks: [{ kind: "ellipse", cx: 0.72, cy: 0.70, rx: 0.075, ry: 0.055 }, { kind: "ellipse", cx: 0.76, cy: 0.66, rx: 0.042, ry: 0.045 }] },
  { id: "cafe-roses", label: "장미 꽃다발", region: { x: 0.91, y: 0.67, radius: 0.065 }, masks: [{ kind: "polygon", points: [[0.82, 0.58], [0.99, 0.56], [1, 0.75], [0.84, 0.76]] }] },
  { id: "cafe-window-vines", label: "창가 덩굴", region: { x: 0.96, y: 0.20, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0.93, 0], [1, 0], [1, 0.37], [0.96, 0.32]] }] },
  { id: "cafe-coffee-cup", label: "앞 테이블 커피잔", region: { x: 0.18, y: 0.76, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.18, cy: 0.77, rx: 0.035, ry: 0.025 }, { kind: "ellipse", cx: 0.18, cy: 0.79, rx: 0.05, ry: 0.012 }] },
];

export const FOREST_SCENE_OBJECTS: SceneObjectDefinition[] = [
  { id: "forest-main-house", label: "큰 버섯집", region: { x: 0.44, y: 0.40, radius: 0.075 }, masks: [{ kind: "polygon", points: [[0.20, 0.19], [0.58, 0.18], [0.65, 0.40], [0.55, 0.46], [0.55, 0.64], [0.31, 0.64], [0.31, 0.46], [0.19, 0.42]] }] },
  { id: "forest-chimney", label: "굴뚝", region: { x: 0.27, y: 0.25, radius: 0.04 }, masks: [{ kind: "polygon", points: [[0.245, 0.18], [0.28, 0.18], [0.30, 0.31], [0.265, 0.33]] }] },
  { id: "forest-sun", label: "해", region: { x: 0.68, y: 0.12, radius: 0.055 }, masks: [{ kind: "ellipse", cx: 0.68, cy: 0.12, rx: 0.065, ry: 0.065 }] },
  { id: "forest-rabbit", label: "책 읽는 토끼", region: { x: 0.25, y: 0.55, radius: 0.05 }, hitPriority: 2, masks: [{ kind: "ellipse", cx: 0.25, cy: 0.68, rx: 0.065, ry: 0.09 }, { kind: "ellipse", cx: 0.21, cy: 0.57, rx: 0.022, ry: 0.075, rotate: -20 }, { kind: "ellipse", cx: 0.27, cy: 0.56, rx: 0.022, ry: 0.075, rotate: 15 }] },
  { id: "forest-scarf", label: "토끼 목도리", region: { x: 0.18, y: 0.75, radius: 0.038 }, hitPriority: 3, masks: [{ kind: "polygon", points: [[0.19, 0.63], [0.29, 0.64], [0.28, 0.70], [0.22, 0.71], [0.20, 0.77], [0.17, 0.75]] }] },
  { id: "forest-bird", label: "노란 새", region: { x: 0.36, y: 0.69, radius: 0.04 }, masks: [{ kind: "ellipse", cx: 0.36, cy: 0.69, rx: 0.04, ry: 0.025 }, { kind: "polygon", points: [[0.39, 0.68], [0.44, 0.69], [0.39, 0.705]] }] },
  { id: "forest-bench", label: "나무 벤치", region: { x: 0.30, y: 0.78, radius: 0.05 }, hitPriority: -1, masks: [{ kind: "polygon", points: [[0.10, 0.64], [0.33, 0.63], [0.34, 0.77], [0.12, 0.79]] }] },
  { id: "forest-bridge", label: "나무다리", region: { x: 0.67, y: 0.79, radius: 0.065 }, hitPriority: 2, masks: [{ kind: "polygon", points: [[0.50, 0.75], [0.80, 0.74], [0.83, 0.82], [0.50, 0.84]] }] },
  { id: "forest-stream", label: "반짝이는 시냇물", region: { x: 0.70, y: 0.98, radius: 0.05 }, hitPriority: -1, masks: [{ kind: "polygon", points: [[0.63, 0.58], [0.78, 0.55], [0.70, 0.72], [0.60, 0.86], [0.54, 1], [0.83, 1], [0.80, 0.83], [0.80, 0.67]] }] },
  { id: "forest-left-glow-mushrooms", label: "왼쪽 빛나는 버섯", region: { x: 0.08, y: 0.86, radius: 0.055 }, masks: [{ kind: "polygon", points: [[0, 0.72], [0.16, 0.70], [0.18, 0.96], [0, 0.98]] }] },
  { id: "forest-right-glow-mushrooms", label: "오른쪽 빛나는 버섯", region: { x: 0.91, y: 0.84, radius: 0.055 }, masks: [{ kind: "polygon", points: [[0.83, 0.70], [1, 0.70], [1, 0.96], [0.84, 0.95]] }] },
  { id: "forest-right-house", label: "오른쪽 작은 버섯집", region: { x: 0.95, y: 0.57, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0.89, 0.45], [1, 0.44], [1, 0.68], [0.91, 0.68]] }] },
  { id: "forest-tree-door", label: "왼쪽 나무문", region: { x: 0.08, y: 0.33, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.08, cy: 0.34, rx: 0.035, ry: 0.055 }] },
  { id: "forest-red-mushroom", label: "오른쪽 붉은 버섯", region: { x: 0.91, y: 0.48, radius: 0.045 }, masks: [{ kind: "polygon", points: [[0.86, 0.43], [0.95, 0.43], [0.96, 0.53], [0.88, 0.55]] }] },
  { id: "forest-flowers", label: "왼쪽 꽃밭", region: { x: 0.09, y: 0.62, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0, 0.50], [0.17, 0.49], [0.18, 0.70], [0, 0.71]] }] },
];

export const CITY_SCENE_OBJECTS: SceneObjectDefinition[] = [
  { id: "city-dragon-sign", label: "용 네온사인", region: { x: 0.28, y: 0.17, radius: 0.055 }, masks: [{ kind: "rect", x: 0.21, y: 0.07, width: 0.13, height: 0.20, radius: 0.012 }] },
  { id: "city-cyber-ramen-sign", label: "사이버 라멘 간판", region: { x: 0.27, y: 0.35, radius: 0.05 }, masks: [{ kind: "rect", x: 0.21, y: 0.29, width: 0.14, height: 0.12, radius: 0.008 }] },
  { id: "city-left-pink-sign", label: "왼쪽 분홍 간판", region: { x: 0.05, y: 0.39, radius: 0.055 }, masks: [{ kind: "polygon", points: [[0, 0.27], [0.12, 0.27], [0.13, 0.50], [0, 0.50]] }] },
  { id: "city-ramen-sign", label: "라멘 간판", region: { x: 0.40, y: 0.53, radius: 0.05 }, masks: [{ kind: "rect", x: 0.35, y: 0.43, width: 0.10, height: 0.18, radius: 0.006, rotate: -8 }] },
  { id: "city-tech-sign", label: "오른쪽 테크 간판", region: { x: 0.96, y: 0.52, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0.92, 0.43], [1, 0.41], [1, 0.61], [0.94, 0.63]] }] },
  { id: "city-headphone-person", label: "헤드폰을 쓴 사람", region: { x: 0.20, y: 0.72, radius: 0.06 }, masks: [{ kind: "polygon", points: [[0.15, 0.58], [0.24, 0.58], [0.27, 0.83], [0.18, 0.95], [0.13, 0.92]] }] },
  { id: "city-food-stall", label: "라멘 포장마차", region: { x: 0.42, y: 0.71, radius: 0.07 }, masks: [{ kind: "polygon", points: [[0.28, 0.57], [0.53, 0.58], [0.55, 0.85], [0.30, 0.86]] }] },
  { id: "city-chef", label: "포장마차 요리사", region: { x: 0.36, y: 0.70, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.36, cy: 0.65, rx: 0.035, ry: 0.045 }, { kind: "polygon", points: [[0.32, 0.67], [0.40, 0.67], [0.41, 0.77], [0.32, 0.77]] }] },
  { id: "city-large-umbrella", label: "오른쪽 큰 우산", region: { x: 0.84, y: 0.68, radius: 0.055 }, masks: [{ kind: "polygon", points: [[0.75, 0.64], [0.84, 0.58], [0.92, 0.65], [0.84, 0.66]] }, { kind: "rect", x: 0.838, y: 0.65, width: 0.007, height: 0.18 }] },
  { id: "city-cyan-coat-person", label: "청록색 코트 인물", region: { x: 0.79, y: 0.76, radius: 0.055 }, masks: [{ kind: "ellipse", cx: 0.79, cy: 0.68, rx: 0.03, ry: 0.04 }, { kind: "polygon", points: [[0.75, 0.70], [0.83, 0.70], [0.84, 0.88], [0.76, 0.88]] }] },
  { id: "city-right-man", label: "오른쪽 휴대폰 인물", region: { x: 0.96, y: 0.76, radius: 0.055 }, masks: [{ kind: "polygon", points: [[0.91, 0.64], [1, 0.64], [1, 0.89], [0.93, 0.88]] }] },
  { id: "city-bollard", label: "앞쪽 볼라드", region: { x: 0.42, y: 0.91, radius: 0.04 }, masks: [{ kind: "rect", x: 0.39, y: 0.84, width: 0.045, height: 0.11, radius: 0.015 }] },
  { id: "city-road-reflection", label: "도로 네온 반사", region: { x: 0.64, y: 0.90, radius: 0.06 }, masks: [{ kind: "polygon", points: [[0.52, 0.78], [0.76, 0.78], [0.82, 1], [0.49, 1]] }] },
  { id: "city-tower-screen", label: "고층 빌딩 화면", region: { x: 0.81, y: 0.12, radius: 0.05 }, masks: [{ kind: "rect", x: 0.76, y: 0.04, width: 0.11, height: 0.14, radius: 0.004 }] },
  { id: "city-overhead-cables", label: "공중 전선", region: { x: 0.59, y: 0.27, radius: 0.045 }, masks: [{ kind: "polygon", points: [[0.31, 0.14], [1, 0.18], [1, 0.29], [0.31, 0.22]] }] },
];

export const UNDERWATER_SCENE_OBJECTS: SceneObjectDefinition[] = [
  { id: "underwater-turtle", label: "바다거북", region: { x: 0.49, y: 0.49, radius: 0.075 }, masks: [{ kind: "ellipse", cx: 0.45, cy: 0.46, rx: 0.15, ry: 0.09, rotate: -8 }, { kind: "ellipse", cx: 0.62, cy: 0.42, rx: 0.065, ry: 0.045 }, { kind: "polygon", points: [[0.40, 0.48], [0.52, 0.62], [0.46, 0.65], [0.34, 0.54]] }, { kind: "polygon", points: [[0.52, 0.48], [0.61, 0.58], [0.57, 0.61], [0.48, 0.53]] }] },
  { id: "underwater-jellyfish", label: "빛나는 해파리", region: { x: 0.34, y: 0.20, radius: 0.065 }, masks: [{ kind: "ellipse", cx: 0.33, cy: 0.15, rx: 0.075, ry: 0.06 }, { kind: "polygon", points: [[0.28, 0.18], [0.40, 0.18], [0.63, 0.35], [0.50, 0.30], [0.36, 0.24]] }] },
  { id: "underwater-chest", label: "보물상자", region: { x: 0.27, y: 0.77, radius: 0.075 }, masks: [{ kind: "polygon", points: [[0.08, 0.65], [0.42, 0.64], [0.47, 0.88], [0.10, 0.91]] }] },
  { id: "underwater-starfish", label: "불가사리", region: { x: 0.10, y: 0.56, radius: 0.045 }, hitPriority: 2, masks: [{ kind: "polygon", points: [[0.10, 0.50], [0.12, 0.54], [0.17, 0.54], [0.13, 0.58], [0.15, 0.63], [0.10, 0.60], [0.06, 0.64], [0.07, 0.58], [0.03, 0.55], [0.08, 0.55]] }] },
  { id: "underwater-left-blue-fish", label: "왼쪽 파란 물고기", region: { x: 0.28, y: 0.41, radius: 0.04 }, masks: [{ kind: "ellipse", cx: 0.28, cy: 0.41, rx: 0.038, ry: 0.022 }, { kind: "polygon", points: [[0.245, 0.41], [0.22, 0.395], [0.22, 0.425]] }] },
  { id: "underwater-yellow-school", label: "노란 물고기 떼", region: { x: 0.77, y: 0.62, radius: 0.06 }, masks: [{ kind: "polygon", points: [[0.64, 0.53], [0.91, 0.52], [0.98, 0.76], [0.63, 0.75]] }] },
  { id: "underwater-striped-fish", label: "줄무늬 물고기", region: { x: 0.89, y: 0.62, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.89, cy: 0.62, rx: 0.055, ry: 0.04 }, { kind: "polygon", points: [[0.94, 0.62], [0.98, 0.59], [0.98, 0.65]] }] },
  { id: "underwater-clownfish", label: "흰동가리", region: { x: 0.91, y: 0.51, radius: 0.04 }, hitPriority: 2, masks: [{ kind: "ellipse", cx: 0.91, cy: 0.51, rx: 0.035, ry: 0.022 }, { kind: "polygon", points: [[0.94, 0.51], [0.98, 0.49], [0.98, 0.53]] }] },
  { id: "underwater-left-coral", label: "왼쪽 산호초", region: { x: 0.02, y: 0.30, radius: 0.05 }, hitPriority: -1, masks: [{ kind: "polygon", points: [[0, 0.24], [0.18, 0.26], [0.22, 0.68], [0, 0.70]] }] },
  { id: "underwater-right-coral", label: "오른쪽 산호초", region: { x: 0.97, y: 0.29, radius: 0.05 }, hitPriority: -1, masks: [{ kind: "polygon", points: [[0.79, 0.21], [1, 0.22], [1, 0.54], [0.80, 0.53]] }] },
  { id: "underwater-shell", label: "바닥 조개", region: { x: 0.75, y: 0.88, radius: 0.04 }, hitPriority: 2, masks: [{ kind: "ellipse", cx: 0.75, cy: 0.88, rx: 0.035, ry: 0.022, rotate: -10 }] },
  { id: "underwater-rocks", label: "오른쪽 바위", region: { x: 0.87, y: 0.78, radius: 0.05 }, hitPriority: -1, masks: [{ kind: "polygon", points: [[0.70, 0.78], [0.86, 0.76], [0.90, 0.89], [0.72, 0.90]] }] },
  { id: "underwater-bubbles", label: "물방울", region: { x: 0.70, y: 0.25, radius: 0.045 }, masks: [{ kind: "ellipse", cx: 0.72, cy: 0.24, rx: 0.012, ry: 0.012 }, { kind: "ellipse", cx: 0.68, cy: 0.31, rx: 0.009, ry: 0.009 }, { kind: "ellipse", cx: 0.84, cy: 0.20, rx: 0.008, ry: 0.008 }] },
  { id: "underwater-left-seaweed", label: "왼쪽 해초", region: { x: 0.07, y: 0.88, radius: 0.05 }, masks: [{ kind: "polygon", points: [[0, 0.74], [0.15, 0.72], [0.17, 1], [0, 1]] }] },
  { id: "underwater-right-seaweed", label: "오른쪽 해초", region: { x: 0.94, y: 0.87, radius: 0.05 }, hitPriority: -2, masks: [{ kind: "polygon", points: [[0.83, 0.70], [1, 0.68], [1, 1], [0.88, 1]] }] },
];
