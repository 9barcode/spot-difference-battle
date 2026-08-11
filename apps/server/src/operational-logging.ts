export interface OperationalLogContext {
  matchId?: string;
  playerId?: string;
  action?: string;
  code?: string;
  state?: string;
}

export interface OperationalLogFields extends OperationalLogContext {
  event: string;
  errorType?: string;
  errorCode?: string;
}

/**
 * 운영 로그에는 추적에 필요한 식별자만 허용한다.
 * 소켓 인증 토큰, 이미지 데이터, 신고 상세처럼 큰 값이나 민감한 값은 받지 않는다.
 */
export function operationalLogFields(
  event: string,
  context: OperationalLogContext = {},
  error?: unknown,
): OperationalLogFields {
  const fields: OperationalLogFields = { event };

  for (const key of ["matchId", "playerId", "action", "code", "state"] as const) {
    const value = context[key];
    if (value !== undefined) fields[key] = value;
  }

  if (error instanceof Error) {
    fields.errorType = error.name;
    const candidateCode = (error as Error & { code?: unknown }).code;
    if (typeof candidateCode === "string") fields.errorCode = candidateCode;
  } else if (error !== undefined) {
    fields.errorType = typeof error;
  }

  return fields;
}
