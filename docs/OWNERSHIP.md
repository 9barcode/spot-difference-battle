# 개발 소유권과 통합 경계

> 문서 상태: CURRENT  
> 기준일: 2026-09-18

## 담당자

| 담당자 | 소유 영역 | 주요 책임 |
|---|---|---|
| 경래 | Cloudflare R2 에셋 저장소 | Private bucket, 이미지 업로드·검증·보존·삭제, object key와 SHA-256, 원본/변경본 쌍의 완결성 |
| 형주 | Supabase 및 R2 메타데이터 연결 | `puzzle_catalog`, schema/migration, 활성 버전 전환, R2 object key·퍼즐 버전·정답 메타데이터 연결, DB 권한과 개발환경 |
| 민수 | Cloudflare Workers | Private R2 읽기 전달, 경로 검증, GET/HEAD 응답, 캐시·보안 헤더, 배포·관측·장애 대응, Worker rollback |

민수의 담당은 Workers이며 Supabase 또는 R2 데이터 소유자가 아니다. 경래와 형주의 영역을 변경해야 하는 Worker 작업은 아래 공동 계약만 합의한 뒤 각 담당자가 자기 영역에서 반영한다.

## 공동 계약

세 영역은 다음 값만 공유한다.

| 계약 값 | 예시 |
|---|---|
| `puzzleId` | `home-office` |
| `assetVersion` | `2026-08-28.2` |
| original object key | `puzzles/home-office/2026-08-28.2/runtime/original.webp` |
| modified object key | `puzzles/home-office/2026-08-28.2/runtime/modified.webp` |
| MIME type | `image/webp` |

계약 변경은 경래·형주·민수 세 명의 검토가 필요하다. 정답 좌표는 게임 서버와 Supabase에만 존재하며 Worker 응답에 포함하지 않는다.

## 자격증명 경계

- R2 write 자격증명은 경래의 업로드·운영 환경에서만 사용한다.
- Worker는 R2 binding으로 읽으며 access key를 코드, 프런트 또는 Supabase에 저장하지 않는다.
- Supabase는 R2 object key와 메타데이터만 저장한다. R2 credential을 저장하지 않는다.
- 브라우저는 Worker 공개 origin과 경로만 사용한다.
- DB 연결 문자열과 service role은 프런트 및 Worker 이미지 응답에 포함하지 않는다.

## 퍼즐 게시 절차

1. 경래가 버전 고정 object key로 original/modified를 업로드하고 SHA-256을 확인한다.
2. 형주가 같은 `puzzleId`와 `assetVersion`으로 비활성 catalog row를 등록한다.
3. 민수가 Worker를 통해 두 이미지의 GET/HEAD, MIME type, 크기와 해시를 확인한다.
4. 형주가 검증된 버전을 원자적으로 활성화한다.
5. 세 담당자가 게임 로딩과 실제 플레이 E2E를 확인한다.
6. 이전 버전은 진행 중 경기와 rollback 보존 기간이 끝난 뒤 경래가 삭제한다.

이미지마다 Worker가 Supabase를 조회하지 않는다. 게임 서버가 catalog에서 확정한 `puzzleId`와 `assetVersion`을 전달하고, 브라우저는 그 값으로 Worker URL을 구성한다. Worker는 허용된 경로를 R2 object key로 매핑한다.

## 아직 담당자를 정해야 하는 영역

다음 영역은 현재 역할만으로 소유자가 정해지지 않았다.

| 미지정 영역 | 결정해야 할 책임 |
|---|---|
| 게임 Backend | `apps/server/**`, Socket.IO, DB catalog 런타임 조회, 경기 복구와 결과 저장 |
| 프런트 이미지 연결 | Worker base URL, 이미지 preload·오류·fallback, 솔로/1:1 R2 전환 |
| 퍼즐 콘텐츠 판정 | 정답 좌표 작성·검수, 난이도 등급, 저작권 승인 |
| 릴리스 책임자 | 브랜치 통합, staging 승인, Apps in Toss Android/iOS 검증과 운영 전환 |

최종 E2E는 공동 작업이지만 한 명을 릴리스 책임자로 지정해야 완료 여부가 모호해지지 않는다.

## Workers 완료 기준

- 허용한 `puzzleId/assetVersion/kind` 외 경로는 R2 조회 전에 거부한다.
- GET과 HEAD만 허용하고 method별 응답을 테스트한다.
- 올바른 `Content-Type`, 캐시 정책, `nosniff`를 제공한다.
- 없는 객체, 잘못된 버전과 traversal 입력을 구분 가능한 상태 코드로 처리한다.
- R2 secret을 번들·로그·응답에 노출하지 않는다.
- Canary ON/OFF와 이전 Git 에셋 fallback을 검증한다.
- Worker 요청 실패율과 R2 miss를 운영 환경에서 확인할 수 있다.
