import { GameRuleError } from "@spot-battle/game-core";
import { describe, expect, it } from "vitest";
import { requireActionContext, requirePoint } from "../../src/transport/socket-payload.js";

describe("socket payload validation", () => {
  it("정규화 좌표 범위만 허용한다", () => {
    expect(requirePoint({ point: { x: 0, y: 1 } })).toEqual({ x: 0, y: 1 });
    expect(() => requirePoint({ point: { x: 1.01, y: 0.5 } })).toThrow(GameRuleError);
  });

  it("정수 상태 버전만 허용한다", () => {
    expect(requireActionContext({ expectedState: "PLAYING", expectedStateVersion: 3 }))
      .toEqual({ expectedState: "PLAYING", expectedStateVersion: 3 });
    expect(() => requireActionContext({ expectedState: "PLAYING", expectedStateVersion: 3.5 }))
      .toThrow(GameRuleError);
  });
});
