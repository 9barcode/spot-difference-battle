import {
  GAME_CONFIG,
  PROBLEM_IMAGE_LIMITS,
  type AnswerRegion,
  type Difference,
  type NormalizedPoint,
  type PlayerResult,
} from "@spot-battle/shared";

export interface DifferenceValidationOptions {
  minimumRadius: number;
  maximumRadius: number;
  minimumGap: number;
}

export interface DifferenceValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_VALIDATION_OPTIONS: DifferenceValidationOptions = {
  minimumRadius: 0.02,
  maximumRadius: 0.12,
  minimumGap: 0.03,
};

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function validateDifferences(
  differences: Difference[],
  options: DifferenceValidationOptions = DEFAULT_VALIDATION_OPTIONS,
): DifferenceValidationResult {
  const errors: string[] = [];

  if (differences.length !== GAME_CONFIG.differenceCount) {
    errors.push(`차이점은 정확히 ${GAME_CONFIG.differenceCount}개여야 합니다.`);
  }

  const ids = new Set<string>();

  differences.forEach((difference, index) => {
    const { id, region } = difference;

    if (!id || ids.has(id)) {
      errors.push(`${index + 1}번 차이점의 ID가 없거나 중복되었습니다.`);
    }
    ids.add(id);

    if (!isNormalized(region.x) || !isNormalized(region.y)) {
      errors.push(`${index + 1}번 차이점의 좌표가 이미지 범위를 벗어났습니다.`);
    }

    if (region.radius < options.minimumRadius || region.radius > options.maximumRadius) {
      errors.push(`${index + 1}번 차이점의 크기가 허용 범위를 벗어났습니다.`);
    }

    if (
      region.x - region.radius < 0 ||
      region.x + region.radius > 1 ||
      region.y - region.radius < 0 ||
      region.y + region.radius > 1
    ) {
      errors.push(`${index + 1}번 차이점이 이미지 경계에 걸쳐 있습니다.`);
    }
  });

  for (let left = 0; left < differences.length; left += 1) {
    for (let right = left + 1; right < differences.length; right += 1) {
      const a = differences[left];
      const b = differences[right];
      if (!a || !b) continue;

      if (distance(a.region, b.region) < a.region.radius + b.region.radius + options.minimumGap) {
        errors.push(`${left + 1}번과 ${right + 1}번 차이점이 너무 가깝습니다.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 제작자가 올린 문제 이미지를 검증한다.
 * 서버는 픽셀을 해석하지 않으므로 형식과 용량만 확인한다.
 */
export function validateProblemImage(image: unknown): DifferenceValidationResult {
  if (typeof image !== "string") {
    return { valid: false, errors: ["문제 이미지가 없습니다."] };
  }
  if (!PROBLEM_IMAGE_LIMITS.allowedPrefixes.some((prefix) => image.startsWith(prefix))) {
    return { valid: false, errors: ["허용되지 않은 문제 이미지 형식입니다."] };
  }

  const payload = image.slice(image.indexOf(",") + 1);
  const approximateBytes = Math.floor((payload.length * 3) / 4);
  const errors: string[] = [];

  if (approximateBytes <= 0) errors.push("문제 이미지가 비어 있습니다.");
  if (approximateBytes > PROBLEM_IMAGE_LIMITS.maxBytes) {
    errors.push("문제 이미지 용량이 허용치를 넘었습니다.");
  }

  return { valid: errors.length === 0, errors };
}

export function isPointInAnswerRegion(point: NormalizedPoint, region: AnswerRegion): boolean {
  if (!isNormalized(point.x) || !isNormalized(point.y)) return false;
  return distance(point, region) <= region.radius;
}

export function getRemainingTimeMs(
  deadlineMs: number,
  nowMs: number,
  wrongAnswerCount: number,
): number {
  const penaltyMs = Math.max(0, wrongAnswerCount) * GAME_CONFIG.wrongAnswerPenaltySeconds * 1_000;
  return Math.max(0, deadlineMs - nowMs - penaltyMs);
}

export function determineWinner(
  first: PlayerResult,
  second: PlayerResult,
): string | null {
  if (first.foundCount !== second.foundCount) {
    return first.foundCount > second.foundCount ? first.playerId : second.playerId;
  }

  if (first.wrongAnswerCount !== second.wrongAnswerCount) {
    return first.wrongAnswerCount < second.wrongAnswerCount ? first.playerId : second.playerId;
  }

  if (first.lastCorrectAtMs !== second.lastCorrectAtMs) {
    if (first.lastCorrectAtMs === null) return second.playerId;
    if (second.lastCorrectAtMs === null) return first.playerId;
    return first.lastCorrectAtMs < second.lastCorrectAtMs ? first.playerId : second.playerId;
  }

  return null;
}

export {
  GameMatch,
  GameRuleError,
  type MatchPlayer,
  type PersistedMatchPlayer,
  type PersistedMatchState,
} from "./match.js";
