import {
  DEFAULT_GAME_SCENE_ID,
  type Difference,
  type ObjectShapeEffect,
} from "@spot-battle/shared";
import { GameRuleError } from "@spot-battle/game-core";
import { describe, expect, it } from "vitest";
import { validateSceneObjectEdits } from "../src/scene-validation.js";

function difference(
  id: string,
  objectId: string,
  shapeEffect: string = "NONE",
): Difference {
  return {
    id,
    kind: "COLOR",
    region: { x: 0.2 + Number(id) * 0.2, y: 0.5, radius: 0.04 },
    objectEdit: {
      objectId,
      objectLabel: objectId,
      color: "#ef2b2d",
      shapeEffect: shapeEffect as ObjectShapeEffect,
    },
  };
}

describe("validateSceneObjectEdits", () => {
  it("accepts distinct registered objects and effects", () => {
    expect(() =>
      validateSceneObjectEdits(DEFAULT_GAME_SCENE_ID, [
        difference("1", "plant"),
        difference("2", "sofa", "WIDE"),
        difference("3", "cat", "STRIPES"),
      ]),
    ).not.toThrow();
  });

  it("rejects missing, unknown, duplicate, and unsupported object edits", () => {
    const missing = difference("1", "plant");
    delete missing.objectEdit;

    const cases: Difference[][] = [
      [missing],
      [difference("1", "unknown")],
      [difference("1", "cat"), difference("2", "cat")],
      [difference("1", "cat", "ROTATE")],
    ];

    for (const differences of cases) {
      expect(() =>
        validateSceneObjectEdits(DEFAULT_GAME_SCENE_ID, differences),
      ).toThrow(GameRuleError);
    }
  });
});
