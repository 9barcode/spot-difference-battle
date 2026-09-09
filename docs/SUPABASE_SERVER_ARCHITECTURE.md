# Supabase 단일 백엔드 결정

운영 데이터베이스는 Supabase PostgreSQL 하나만 사용한다. 서버 시작에는
`SUPABASE_DB_URL`이 필수이며 인메모리 저장소로 자동 대체하지 않는다.

## 계층 경계

- `game/`: 게임 규칙과 경기 레지스트리
- `application/`: 매칭 등 유스케이스와 런타임 조정
- `transport/`: Socket.IO 요청 변환과 입력 검증
- `persistence/`: Supabase PostgreSQL 저장소
- `sessions/`: 게스트 세션 도메인 상태
- `observability/`: 운영 로그

현재 Socket.IO 전송 계층은 기존 앱 호환을 위해 유지한다. 향후 Supabase Realtime 및
Edge Functions로 교체할 때 `game/`과 `application/`은 유지하고 `transport/`만 교체한다.
Edge Function은 장기 연결이나 경기 타이머를 실행하지 않고 짧은 명령 처리만 담당한다.

## 검증 원칙

- Supabase SDK나 PostgreSQL 클라이언트를 모킹하지 않는다.
- 순수 규칙은 유닛 테스트로 검증한다.
- 네트워크 경기 흐름은 실제 Fastify/Socket.IO 서버를 띄워 검증한다.
- DB 통합 테스트는 실제 `SUPABASE_DB_URL`이 있을 때만 실행한다.
- 자격 증명이 없는 환경에서는 DB 통합 테스트를 명시적으로 제외하며 성공으로 가장하지 않는다.

`InMemoryMatchStore`는 로컬 게임 흐름을 위한 독립 구현체이며 `NODE_ENV=production`에서는
선택할 수 없다. 로컬/E2E에서는 `STORAGE_DRIVER=memory`를 명시해야 하므로 운영 서버가
자동으로 인메모리 저장소에 빠지는 일은 없다. Supabase Realtime/Edge Functions 전환 테스트는 실제 프로젝트 연결 정보가 준비된
뒤 별도 통합 테스트로 추가한다.
