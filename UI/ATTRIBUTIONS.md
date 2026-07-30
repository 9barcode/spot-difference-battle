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
- 구체적인 모델 버전·계정 이용 조건·상업 이용 증빙: 확인되지 않음
- 라이선스 상태: `UNVERIFIED`
- 사용 범위: 개발과 내부 테스트 전용

원본은 1024×572로 정확한 16:9가 아니므로 출시 전 1920×1080 정본으로 교체하고 마스크를 다시 검수해야 한다.

새 장면의 기록 요건은 `docs/GAME_ASSETS.md`를 따른다.
