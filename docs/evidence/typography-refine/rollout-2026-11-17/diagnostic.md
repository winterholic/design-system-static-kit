# 로그인 복구 알림 뒤 배포 경로 확인

관측: 2026-11-17 KST / 2026-11-16 15:35~15:36 UTC. 환경: 이 Run의 Codex 명령 샌드박스, macOS, Node 26.9.0, Vercel CLI 63.1.2. 사용자의 로그인 완료 알림으로 R16을 재개했다. 아래 결과는 이 실행 경로에 한정한다.

## 보존한 검증

현재 HEAD는 `3b832969cf1a8176e6d1f3042c6bf0724be6bc78`이며 git pull은 Already up to date였다. `git diff --exit-code d09d1d18d43b7dd0b9348b843beec20619820a74 -- src site tests scripts package.json package-lock.json .github`는 exit 0이었다. GitHub run 43888654462를 다시 조회해 source d09d1d1 / completed / success와 verify·Chromium 단계 success를 확인했다. 소스 검증을 반복하지 않고 재사용한다.

site를 `.qa/deploy/`로 동기화한 뒤 3300개 파일을 직접 바이트 대조했다. `STAGING 3300 MISMATCHES 0`이었다. 기존 .vercel 프로젝트 연결은 유지했다.

## 실패 지점과 조사

1. 기본 `vercel whoami`는 exit 1, `The value of "err" is out of range. It must be a negative integer. Received 1`로 종료됐다. 로그인 정상 여부를 이 명령으로 확인하지 못했다.
2. 설치된 공개 CLI 소스 `/opt/homebrew/lib/node_modules/vercel/dist/vc.js`에서 macOS 기본 native 모드와 공식 `VERCEL_CLI_USE_NATIVE_BINARY=0` 선택을 확인했다. 이 선택은 샌드박스 권한을 바꾸지 않는다.
3. Node 모드의 읽기 전용 계정 조회에서는 업데이트 helper의 `mkdir /Users/winterholic/Library/Caches/com.vercel.cli`가 `EPERM`으로 거부된 로그를 관측했다. 이 경로에 대한 쓰기를 재시도하지 않았다.
4. 설치된 `dist/index.js`에서 `NO_UPDATE_NOTIFIER`가 업데이트 helper 호출을 막는 조건임을 확인하고, 해당 부수 기능만 끈 읽기 전용 계정 조회를 수행했다. 그래도 같은 ERR_OUT_OF_RANGE로 종료됐다.
5. 이 모드의 `whoami --debug`에서 비밀값을 출력하지 않도록 필터링한 로그를 읽었다. 스택은 `getSystemErrorMessage → errorToStringFriendly → persistAuthConfig → Client.persistAuthConfig → Client.ensureAuthorized → Client._fetch → fetchUser → getPrincipal`이었다. 설치된 `chunk-67N2NJCF.js`의 persistAuthConfig는 인증정보 저장 실패를 catch한 뒤 오류를 포맷하는 함수다. 따라서 인증 저장 실패 뒤 오류 포맷 단계가 원래 원인을 가리는 것은 코드와 스택으로 확인된다. 이 호출의 원래 errno와 인증 파일 경로는 확인하지 못했다. 인증 저장 경로의 쓰기 권한 문제가 원인일 가능성은 현재 writable roots와 일치하는 **추론**이며, 캐시 EPERM 관측과 구분한다.

인증 파일·토큰 원문은 직접 읽거나 복사하지 않았다. 기본 인증 저장 경로를 다른 곳으로 우회하거나, 다른 엔진으로 같은 제한을 피하는 실행도 하지 않았다. Node 모드 진단이 인증 저장 오류에 도달한 뒤 배포 쓰기 명령을 반복하지 않았다. 이번 재개에서는 실제 deploy를 실행하지 않았다.

## 운영 상태와 남은 단계

`production-version.json`: 운영 `/v1/catalog.json` HTTP 200, version 2.2.0. 새 2.3 운영 반영과 운영 브라우저 검증은 미실행이다. 다른 환경에서 로그인이나 배포가 불가능하다는 뜻은 아니다.

샌드박스 밖의 사용자 호스트 터미널에서 준비된 디렉터리로 이동해 배포할 수 있다.

```sh
cd /Users/winterholic/development/projects/design-system-static-kit/.qa/deploy
vercel deploy --prod --yes --archive=tgz
```

이 명령은 기존 운영 사이트에 2.3 정적 산출물을 반영한다. 호스트에서의 실행 결과는 현재 미검증이다. 배포 뒤 이 세션에서 새 deployment ID·READY·별칭을 확인하고 109개 경로 바이트 대조 및 운영 브라우저 검증으로 R16을 닫아야 한다. 인증 파일 쓰기 권한이 정상적으로 제공되는 승인된 실행 경로가 생겨도 같은 후속을 진행할 수 있다.
