# Attribution and asset status

> 문서 상태: CURRENT
> 이 파일은 확인된 출처와 확인이 필요한 자산을 구분한다.

## UI components

Figma Make 원본에는 [shadcn/ui](https://ui.shadcn.com/) 기반 컴포넌트가 포함되어 있으며 shadcn/ui는 MIT 라이선스를 사용한다. 저장소에는 Figma에서 생성된 다수의 UI 의존성과 비활성 참고 시안이 남아 있다.

## Game scene

### 따뜻한 거실

현재 `src/imports/image.png`의 기록:

- 표시 이름: 따뜻한 거실
- 장면 ID: `prototype-room`
- 현재 기록된 출처: Figma Make import
- 구체적인 원작자·생성 도구·생성일·이용 조건: 확인되지 않음
- 라이선스 상태: `UNVERIFIED`
- 사용 범위: 개발과 내부 테스트 전용

현재 파일이 Unsplash에서 왔다는 증빙은 확인되지 않았으므로 Unsplash 라이선스를 이 장면의 근거로 사용하지 않는다. 출시 전에 출처 증빙을 확보하거나 라이선스가 확인된 에셋으로 교체한다.

### 카툰 연구실

현재 `src/imports/laboratory.png`의 기록:

- 표시 이름: 카툰 연구실
- 장면 ID: `cartoon-laboratory`
- 제공 경로: 사용자가 대화에서 직접 제공
- 기록된 생성 도구: Nano Banana
- 생성본 파일 시각: 2026-07-26
- SHA-256: `B5641C7939B66EFCB371973AAB022234E35C653F066310183DB1F4BF92FFE64F`
- 권리 확인: 제공자가 직접 제작한 원본이며 프로젝트에서 제한 없이 사용할 수 있다고 2026-07-31 대화에서 확인
- 허용 범위: 상업적 사용, 수정, 복제, 배포와 서비스 포함
- 라이선스 상태: `VERIFIED` — 제작자 진술에 근거한 프로젝트 사용 허가
- 사용 범위: 개발, 테스트와 출시

라이선스 확인과 별개로 현재 원본은 1024×572로 정확한 16:9가 아니다. 출시 품질을 위해 1920×1080 정본과 서비스용 최적화 파일을 준비한 뒤 마스크를 다시 검수한다.

새 장면의 기록 요건은 `docs/GAME_ASSETS.md`를 따른다.
