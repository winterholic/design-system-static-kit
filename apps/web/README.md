# apps/web

Static Kit 플랫폼의 Next.js(App Router, TypeScript) 앱이다. 설계 근거와 측정은 `docs/dev/platform/04-web-spike.md`.

## 규칙

- Core(`src/`)는 루트 패키지의 `exports` 진입점(`@winterholic/design-system-static-kit/service`, `/edit`)으로만 쓴다. `src/`를 상대 경로로 import하지 않는다. `npm run test:boundary`가 강제한다.
- `app/dev/spike/**`와 `lib/spike-core.ts`는 Core import 스파이크(S1~S5) 재확인용이다. 필요 없어지면 지운다.
- 해시 게이트 계산식은 `scripts/tree-hash.mjs` 한 곳이다(`00-baseline.md` 4.2절).
- 화면의 색·글자·간격은 `app/globals.css`의 토큰만 쓴다. 내부 설계서·진단 링크는 상단 메뉴에 두지 않는다(`/dev/qa`).
- `public/`은 `scripts/sync-static.mjs`가 `site/`에서 복사한 호환 산출물이다. 손으로 고치지 않고 커밋하지 않는다.

## 기존 URL 컷오버

- `/gallery`와 `/gallery/`는 오프라인 도구인 `/gallery/index.html`을 200으로 제공한다.
- 컷오버 전 `/combos`, `/combos/`, `/combos/index.html`은 쿼리를 보존해 `/explore/combos`로 307 응답한다. 운영 별칭을 새 앱으로 전환한 뒤 `next.config.mjs`의 `permanent`를 `true`로 바꿔 308 응답으로 고정한다.
- `/combos//`는 Next가 먼저 `/combos/`로 308 정규화한 뒤 위 307을 따른다. `/combos/render.html/`은 기존 정적 렌더 파일을 200으로 제공하고, `/COMBOS/` 같은 대소문자 변형은 404다.

## 명령 (저장소 루트에서)

```sh
npm --workspace apps/web run dev        # 개발 서버
npm --workspace apps/web run build      # 정적 산출물 복사 + next build
npm --workspace apps/web run test:boundary
npm --workspace apps/web run test:e2e   # build 이후. next start 를 4310 포트에서 띄운다
```

기능 트랙은 각자 `app/<기능>/` 아래를 채운다. 공통 껍데기는 `shell/`, 내비 정의는 `lib/nav.ts`다.
