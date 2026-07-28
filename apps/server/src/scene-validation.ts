import {
  GAME_SCENE_OBJECT_IDS,
  OBJECT_SHAPE_EFFECTS,
  type Difference,
  type GameSceneId,
} from "@spot-battle/shared";
import { GameRuleError } from "@spot-battle/game-core";

export function validateSceneObjectEdits(
  sceneId: GameSceneId,
  differences: Difference[],
): void {
  const allowedObjectIds = new Set<string>(GAME_SCENE_OBJECT_IDS[sceneId]);
  const allowedEffects = new Set<string>(OBJECT_SHAPE_EFFECTS);
  const usedObjectIds = new Set<string>();

  differences.forEach((difference, index) => {
    const edit = difference.objectEdit;
    if (!edit) {
      throw new GameRuleError(
        "INVALID_SCENE_OBJECT",
        `${index + 1}번 차이점에 객체 편집 정보가 없습니다.`,
      );
    }
    if (!allowedObjectIds.has(edit.objectId)) {
      throw new GameRuleError(
        "INVALID_SCENE_OBJECT",
        `${index + 1}번 차이점의 객체가 현재 장면에 없습니다.`,
      );
    }
    if (usedObjectIds.has(edit.objectId)) {
      throw new GameRuleError(
        "DUPLICATE_SCENE_OBJECT",
        "같은 객체를 두 개 이상의 차이점으로 제출할 수 없습니다.",
      );
    }
    if (!allowedEffects.has(edit.shapeEffect)) {
      throw new GameRuleError(
        "INVALID_OBJECT_EFFECT",
        `${index + 1}번 차이점의 객체 효과가 허용되지 않습니다.`,
      );
    }
    usedObjectIds.add(edit.objectId);
  });
}
