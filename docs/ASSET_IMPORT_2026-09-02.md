# 2026-09-02 퍼즐 이미지 반입 기록

> 문서 상태: HISTORICAL

## 원본과 비교 기준

- 원본 경로: `C:\Users\dbrud\SpotTheDifference_Assets`
- 비교 대상: `UI/src/imports`
- 원본 68개를 SHA-256으로 먼저 비교했다. 최초 반입 뒤 원본 폴더에 hard 이미지 10개가 추가되어 같은 기준으로 재검사했다.
- JPEG와 WebP처럼 인코딩만 다른 동일 그림은 128×128 RGB로 정규화한 평균 절대 픽셀 차이로 다시 비교했다. 기존 에셋과 평균 차이가 0.80 이하인 파일은 같은 그림의 재인코딩본으로 제외했다.
- 원본 폴더 내부에서 SHA-256이 같은 별칭 파일도 한 번만 계산했다.

## 결과

| 구분 | 파일 수 |
| --- | ---: |
| 원본 전체 | 68 |
| 저장소와 SHA-256 동일 | 10 |
| 원본 폴더 내부 별칭 중복 | 6 |
| 기존 그림의 JPEG/WebP 재인코딩본 | 28 |
| 신규 반입 후 유지 | 18 |
| 광역 배경·색조 변화로 제거 | 6 |

신규 파일은 `UI/src/imports/pending/<difficulty>`에 원본 바이트 그대로 저장했다. `pending` 에셋은 정답 영역과 권리 증빙이 확정되기 전까지 프로덕션 번들과 게임 문제 목록에 포함하지 않는다.

## 신규 파일

### easy

- `easy_photo_paris_original.jpg`
- `easy_photo_paris_modified.jpg`
- `easy_medieval_alchemist_original.jpg` — 변경본 없음

### medium

- `medium_koreafolklore_heungbu_original.jpg`
- `medium_koreafolklore_heungbu_modified.jpg`
- `medium_photo_interior_library_original.jpg`
- `medium_photo_interior_library_modified.jpg`
- `medium_photo_kyoto_original.jpg`
- `medium_photo_kyoto_modified.jpg`
- `medium_photo_seoul_original.jpg` — 변경본 없음

### hard

- `hard_photo_ny_original.jpg`
- `hard_photo_ny_modified.jpg`
- `hard_megalophobia_floating_monolith_original.jpg`
- `hard_megalophobia_floating_monolith_modified.jpg`
- `hard_megalophobia_giant_astronaut_original.jpg`
- `hard_megalophobia_giant_astronaut_modified.jpg`
- `hard_megalophobia_titan_statue_original.jpg`
- `hard_megalophobia_titan_statue_modified.jpg`

## 품질검사에서 제거한 파일

- `medium_photo_jeju_original.jpg`, `medium_photo_jeju_modified.jpg` — 낮과 밤에 가까운 하늘·바다·꽃밭 전체 색조 변화
- `hard_megalophobia_sky_whale_original.jpg`, `hard_megalophobia_sky_whale_modified.jpg` — 하늘과 고래의 넓은 색조 변화
- `hard_megalophobia_underwater_kraken_original.jpg`, `hard_megalophobia_underwater_kraken_modified.jpg` — 수면 배경과 광원·전체 색조의 광역 변화

2026-09-03 검사에서 흐린 배경이나 넓은 구획의 변화가 정답처럼 작동할 수 있는 위 3쌍을 저장소에서 제거했다. 간판·차량·가구처럼 경계와 명칭이 분명한 객체 변화는 크기가 넓더라도 유지했다.

## 활성화 전 필수 확인

1. Paris, Heungbu, interior library, Kyoto, New York와 유지된 megalophobia 3개 쌍의 정답 영역을 정규화 좌표로 검수한다.
2. medieval alchemist와 Seoul의 누락된 변경본을 확보한다.
3. 이미지별 생성 출처와 상업 이용·재배포 권리를 승인한다.
4. 승인된 이미지를 WebP로 최적화하고 해시·버전·난이도를 퍼즐 매니페스트에 등록한다.
5. 서버 판정 테스트와 실제 640×360 게임 완주 E2E를 추가한다.
