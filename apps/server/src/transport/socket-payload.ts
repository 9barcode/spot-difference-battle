import { GameRuleError } from "@spot-battle/game-core";

export function requirePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GameRuleError("INVALID_PAYLOAD", "요청 형식이 올바르지 않습니다.");
  }
  return value as Record<string, unknown>;
}

export function requireStringField(payload: unknown, field: string): string {
  const value = requirePayload(payload)[field];
  if (typeof value !== "string") {
    throw new GameRuleError("INVALID_PAYLOAD", `${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

export function requireActionContext(payload: unknown): {
  expectedState: string;
  expectedStateVersion: number;
} {
  const input = requirePayload(payload);
  if (typeof input.expectedState !== "string" || !Number.isInteger(input.expectedStateVersion)) {
    throw new GameRuleError("INVALID_PAYLOAD", "경기 상태 정보가 올바르지 않습니다.");
  }
  return {
    expectedState: input.expectedState,
    expectedStateVersion: input.expectedStateVersion as number,
  };
}

export function requirePoint(payload: unknown): { x: number; y: number } {
  const point = requirePayload(payload).point;
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    throw new GameRuleError("INVALID_POINT", "선택 좌표가 올바르지 않습니다.");
  }
  const { x, y } = point as Record<string, unknown>;
  if (
    typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1 ||
    typeof y !== "number" || !Number.isFinite(y) || y < 0 || y > 1
  ) {
    throw new GameRuleError("INVALID_POINT", "선택 좌표가 올바르지 않습니다.");
  }
  return { x, y };
}
