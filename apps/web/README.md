# apps/web

Static Kit 플랫폼의 Next.js(App Router, TypeScript) 앱이다. 설계 근거와 측정은 `docs/dev/platform/04-web-spike.md`.

## 규칙

- Core(`src/`)는 루트 패키지의 `exports` 진입점(`@winterholic/design-system-static-kit/service`, `/edit`)으로만 쓴다. `src/`를 상대 경로로 import하지 않는다. `npm run test:boundary`가 강제한다.
- `./compiler`, `./catalog` 진입점은 스파이크 전용이며 `app/dev/spike/**`와 `lib/spike-core.ts`에서만 허용된다. `./service` 병합 뒤 지운다.
- 화면의 색·글자·간격은 `app/globals.css`의 토큰만 쓴다. 내부 설계서·진단 링크는 상단 메뉴에 두지 않는다(`/dev/qa`).
- `public/`은 `scripts/sync-static.mjs`가 `site/`에서 복사한 호환 산출물이다. 손으로 고치지 않고 커밋하지 않는다.

## 명령 (저장소 루트에서)

```sh
npm --workspace apps/web run dev        # 개발 서버
npm --workspace apps/web run build      # 정적 산출물 복사 + next build
npm --workspace apps/web run test:boundary
npm --workspace apps/web run test:e2e   # build 이후. next start 를 4310 포트에서 띄운다
```

기능 트랙은 각자 `app/<기능>/` 아래를 채운다. 공통 껍데기는 `shell/`, 내비 정의는 `lib/nav.ts`다.
