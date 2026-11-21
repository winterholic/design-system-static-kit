# REST API v1 · MCP 연동 기준

작성 2026-11-21. 구현 기준은 브랜치 `next/api-mcp`의 REST 작업 표와 MCP 도구 등록이다. 모든 채널은 `src/service/index.mjs`의 공개 서비스 여섯 함수를 호출한다. 어댑터는 전송 입력을 서비스 입력으로 옮기고 결과 봉투를 HTTP 또는 MCP 응답으로 전달한다.

## SDK·전송·배포 선택

- MCP 서버는 `mcp-handler` 2.4.0, `@modelcontextprotocol/server` 2.4.0, Zod 4를 사용한다. Next.js Route Handler `/api/mcp` 한 개를 Streamable HTTP 엔드포인트로 노출한다. Core에는 MCP·Next 의존성이 없다.
- MCP 클라이언트의 실제 프로토콜 시험은 공식 `@modelcontextprotocol/client` 2.4.0의 `Client`와 `StreamableHTTPClientTransport`를 쓴다. 연결 뒤 클라이언트 API는 `listTools()`와 `callTool()`을 사용한다.
- 이 handler 릴리스는 MCP 2026-07-28 stateless `server/discover` 흐름과 구형 2025-era Streamable HTTP initialize 흐름을 한 엔드포인트에서 받는다. 두 흐름의 호환 시험은 실제 SDK transport로 수행한다. HTTP+SSE 구형 별도 전송은 제공하지 않는다.
- Next Route Handler는 기본 Node.js runtime을 사용하며 `maxDuration = 30`을 선언한다. MCP 도구 내부 상한은 10초다. 서비스 호출은 동기이므로 실행을 중단하지 않고 반환 직후 초과 결과를 폐기한다.
- 배포 토폴로지는 상태 없는 HTTP 함수다. MCP 세션 저장이나 외부 URL fetch가 없고, 각 호출은 입력 Blueprint 또는 manifest를 다시 받는다. 정적 카탈로그 조회는 CDN 캐시가 가능하고 POST는 캐시하지 않는다.

공식 근거: [MCP TypeScript SDK 클라이언트 연결 안내](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/connect.md), [MCP 2026-07-28 Streamable HTTP 명세](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [MCP 버전·구형 호환 규칙](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning), [MCP TypeScript SDK 2.4.0 릴리스](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/%40modelcontextprotocol%2Fserver%402.4.0), [Vercel mcp-handler 릴리스](https://github.com/vercel-labs/mcp-handler/releases), [Vercel의 Next.js MCP 예제](https://github.com/vercel-labs/mcp-for-next.js), [Next.js Route Handler](https://nextjs.org/docs/app/getting-started/route-handlers), [Vercel 함수 최대 실행 시간](https://vercel.com/docs/functions/configuring-functions/duration).

## 공통 서비스 계약

서비스는 성공·실패 모두 JSON 직렬화 가능한 결과 봉투를 돌려준다. 결과 봉투와 OpenAPI의 `catalogVersion`은 서버의 기본 카탈로그인 `2.4.0`이다. 명시적으로 `2.5.0`을 쓰려면 Blueprint의 `catalogVersion`을 올린다. REST의 검증·컴파일 요청과 MCP의 같은 도구 호출에 별도 `catalogVersion`을 넣는 경우 Blueprint 버전과 같아야 한다. 조회에서는 기본 카탈로그에 대한 기대값이므로 `2.4.0`을 쓰거나 생략한다. `contractVersion`은 서비스 결과 계약 버전이다.

```json
{"ok":false,"errors":[{"code":"BAD_REQUEST","path":"$args.fields","message":"잘못된 인자","hint":"허용 인자: ..."}],"warnings":[],"catalogVersion":"2.4.0","contractVersion":"1.0.0"}
```

실패에는 `value`가 없고, 진단 필드는 항상 비지 않은 `code`, `$`로 시작하는 `path`, `message`, `hint`를 갖는다. 규칙 진단은 `rule` 또는 기계가 읽을 수 있는 `fix`를 더 가질 수 있다. 전송 계층은 입력을 조용히 무시하지 않는다. 알 수 없는 키·필드·잘못된 범위는 `BAD_REQUEST`다. 클라이언트가 `catalogVersion`을 보내면 지원되지 않는 버전은 `UNSUPPORTED_VERSION`, 현재 버전과 다른 값은 `CATALOG_VERSION`으로 거부된다.

서비스 함수 연결표:

| 서비스 함수 | REST | MCP 도구 |
|---|---|---|
| `listCatalog(q)` | `GET /api/v1/catalog`, `/themes`, `/components` | `list_design_system` |
| `getSchema(q)` | `GET /api/v1/schema` | `get_design_schema` |
| `getComponentSpec(q)` | `GET /api/v1/components/{id}` | `get_component_spec` |
| `validateBlueprint(bp, opts)` | `POST /api/v1/validate` | `validate_blueprint` |
| `compileBlueprint(bp, opts)` | `POST /api/v1/compile` | `compile_design` |
| `explainDecisions(subject, opts)` | `POST /api/v1/explain` | `explain_design_decisions` |

`catalogSnapshot()`은 약 780KB인 레거시 정적 투영이므로 채널의 기본 응답으로 쓰지 않는다. 목록 조회는 kind별 요약, 허용 필터, AND 검색, 필드 선택과 cursor 페이지를 제공한다. 페이지 크기는 1~200, 기본 50이다. Blueprint 스키마는 `fields`로 최상위 속성을 좁힐 수 있다. `layoutSlots` 종류는 `filter.template`이 필요하다.

## REST API

OpenAPI 3.1 문서는 [`/api/v1/openapi.json`](http://localhost:3000/api/v1/openapi.json)에서 제공한다. `operations.mjs`의 작업 목록과 서비스 JSON Schema에서 실행 시 결정적으로 생성한다.

```sh
# 일부 카탈로그만 조회하고 다음 페이지는 응답의 nextCursor로 요청
curl 'http://localhost:3000/api/v1/catalog?kind=templates&filter.pageType=landing&fields=id,theme&limit=3'

# Blueprint 전체 JSON을 request.json에 넣은 뒤 검증
node -e "const fs=require('node:fs'); const blueprint=JSON.parse(fs.readFileSync('site/examples/saas-landing/blueprint.json')); fs.writeFileSync('request.json', JSON.stringify({blueprint}));"
curl -X POST 'http://localhost:3000/api/v1/validate' \
  -H 'content-type: application/json' \
  --data-binary @request.json

# HTML 전체 대신 요약을 받으며 manifest도 요청
node -e "const fs=require('node:fs'); const blueprint=JSON.parse(fs.readFileSync('site/examples/saas-landing/blueprint.json')); fs.writeFileSync('compile-request.json', JSON.stringify({blueprint, include:['html','manifest'], html:'summary'}));"
curl -X POST 'http://localhost:3000/api/v1/compile' \
  -H 'content-type: application/json' \
  --data-binary @compile-request.json
```

- GET 성공 응답은 본문 SHA-256 기반 ETag, `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`와 `Vary: Accept-Encoding`을 보낸다. `If-None-Match`가 일치하면 304다. 실패 응답과 모든 POST 응답은 `no-store`다.
- POST 요청은 JSON 객체만 받는다. Content-Length와 실제 스트림을 모두 세며 512 KiB 초과는 413 `PAYLOAD_TOO_LARGE`다. 검증기 입력 상한은 196,608바이트여서 전송 상한 아래의 큰 Blueprint는 422 `SIZE` 진단이 된다.
- 기본 호출 제한은 호출자별 분당 비용 120이다. 검증 1, 설명 2, 컴파일 3을 소비하고 초과 시 429 `RATE_LIMITED`와 `Retry-After`를 보낸다. 현재 버킷은 프로세스 메모리에 있어 서버리스 전체의 전역 제한이 아니며, 배포 방화벽의 제한을 대체하지 않는다.
- 상태 매핑: 400 입력·지원 버전 오류, 404 없는 부품 명세, 405 허용하지 않는 메서드, 413 크기 초과, 415 JSON 이외 미디어 형식, 422 규칙·카탈로그 버전 불일치, 429 제한 초과, 500 내부 오류. 오류 봉투에는 내부 스택이나 경로를 넣지 않는다.
- 컴파일의 서비스 기본값은 `include: [html, css, tokens, manifest]`, `html: full`이다. MCP는 큰 응답을 피하려 기본 `include: [html, manifest]`, `html: summary`를 지정한다. 양쪽 모두 `maxBytes`로 개별 본문을 제한할 수 있다.

## MCP Streamable HTTP

엔드포인트는 `/api/mcp`다. 원격 HTTP MCP를 지원하는 클라이언트에 이 URL을 등록하거나, 로컬 Node 프로그램에서 아래 예제를 실행한다. 예제는 Node.js 22 및 공식 SDK 2.4.0 기준이다.

```sh
npm install @modelcontextprotocol/client@2.4.0
```

`mcp-example.mjs`:

```js
import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const client = new Client({name: 'static-kit-example', version: '1.0.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp')));
try {
  const {tools} = await client.listTools();
  console.log(tools.map(tool => tool.name));
  const result = await client.callTool({
    name: 'list_design_system',
    arguments: {kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 5},
  });
  if (result.isError) console.error(result.structuredContent?.errors);
  else console.log(result.structuredContent?.value);
} finally {
  await client.close();
}
```

권장 호출 순서는 목록 조회 → 스키마 또는 부품 명세 → Blueprint 작성 → `validate_blueprint` → 실패한 `path`만 교정하고 재검증 → `compile_design` → 필요하면 `explain_design_decisions`다. 검사 도구의 출력 스키마는 공통 봉투다. 실패는 텍스트 JSON과 `structuredContent`를 함께 내며 `isError: true`로 표시한다.

- `list_design_system`: 허용 kind·필터·필드·limit·cursor로 부분 조회.
- `get_design_schema`: blueprint, component, chrome, diagnostic, edit-ops 스키마. 전체 blueprint 스키마는 크므로 `fields`를 권장.
- `get_component_spec`: 부품 한 개의 필수·선택 필드와 자식 규약.
- `validate_blueprint`: 구조화 진단. 입력을 자동 수정하지 않음.
- `compile_design`: 기본은 HTML 본문 없이 요약·크기·manifest. 본문 요청 때 `html: full`과 `include` 지정.
- `explain_design_decisions`: Blueprint 또는 컴파일 manifest의 근거를 조회.

MCP는 Origin을 검증하고, 같은 요청 본문 상한·호출 제한·도구 시간 상한을 쓴다. 이 공개 인터페이스는 임의 URL을 가져오거나 사용자가 준 HTML·CSS·스크립트를 실행하지 않는다. 인증을 설정하지 않은 배포에서는 엔드포인트 접근이 공개되므로, 외부 공개 전 배포 플랫폼의 접근 제어와 WAF 제한을 설정한다.

## Integrations 페이지

웹 앱의 `/integrations`, `/integrations/cli`, `/integrations/rest-api`, `/integrations/mcp`에서 실행 명령, 요청 경로, 대표 입력·오류·응답 흐름을 제공한다. 제품별 MCP 설정 모양은 공통 표준이 아니므로, 페이지는 HTTP URL을 직접 받는 클라이언트 설정란과 공식 TypeScript 클라이언트 예제를 안내한다.

## 검증 범위

`tests/channel-*.test.mjs`는 서비스 직접 호출·CLI·REST 실행기·공식 MCP SDK 클라이언트를 같은 입력으로 비교한다. REST 계약에는 GET/POST 경로, 스키마·카탈로그 부분 조회, 버전, 상태·오류, 요청 크기, ETag, 호출 제한, 생성 OpenAPI가 포함된다. MCP는 현대·구형 프로토콜 흐름의 initialize/discover, 도구 목록·스키마, 탐색·작성·검증 실패·입력 수정·컴파일, 정상적인 오류 도구 결과를 확인한다.

이 테스트는 API 실행기와 MCP route handler를 직접 호출한다. Next 빌드로 앱 번들 통합을 따로 검증한다. 외부 배포 환경·인증을 붙인 원격 MCP 연결은 이 테스트 범위가 아니다.
