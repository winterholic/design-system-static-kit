# Static Kit

Static Kit는 카탈로그가 허용한 값만 골라 Blueprint(JSON)를 쓰면, 검증을 통과한 정적 HTML·CSS·토큰을 만들어 주는 디자인 컴파일러입니다.

## 핵심 개념

- **Blueprint**: 페이지를 설명하는 JSON 문서입니다. 자유 CSS나 HTML 대신 허용된 노드 트리와 디자인 선택값만 씁니다.
- **카탈로그**: 쓸 수 있는 템플릿, 테마, 팔레트, 부품, 페이지 유형, 스타일 축과 금지 조합의 목록입니다.
- **컴파일러**: Blueprint를 검증하고 HTML·CSS·토큰·manifest로 바꿉니다. 모르는 속성, 잘못된 부모와 자식, 금지된 축 조합, 접근성 대비 미달은 조용히 넘기지 않고 오류로 거부합니다.

규약은 프롬프트가 아니라 코드가 강제합니다. 같은 입력이면 같은 출력이 나옵니다.

Core(`src/`)는 React나 Next.js에 의존하지 않습니다. 웹 앱, CLI, REST API v1, MCP 서버는 모두 Core의 같은 서비스 함수(`src/service/`)를 호출합니다. 그래서 어느 채널로 검증해도 결과가 같습니다.

| 구성 | 위치 | 하는 일 |
|---|---|---|
| Core | `src/` | 카탈로그, 검증, 컴파일, 서비스 계층(`./service`), 편집 연산(`./edit`) |
| 웹 앱 | `apps/web` | Next.js 앱. Studio, Explore, Components, Docs, Integrations 화면과 REST·MCP 엔드포인트 |
| Studio | `/studio` | 디자인을 고르고 고친 내용이 규칙을 통과하는지 바로 확인한 뒤 내려받는 화면 |
| Explore | `/explore` | 컴파일된 대표 디자인을 페이지 유형과 테마로 걸러 보고 Blueprint를 확인하는 화면 |
| REST v1 | `/api/v1/*` | 카탈로그 조회, 검증, 컴파일, 설명. OpenAPI 3.1 문서는 `/api/v1/openapi.json` |
| MCP | `/api/mcp` | Streamable HTTP 방식의 MCP 서버. 도구 6개 |
| CLI | `scripts/kit.mjs` | `npm run kit --`로 실행하는 템플릿 생성, 검증, 빌드, 검사 |

## 빠른 시작

Node.js 22가 필요합니다. 저장소 루트에서 실행합니다.

```sh
npm ci
npm run kit -- templates
npm run kit -- themes
npm run kit -- init saas-landing ./my-blueprint.json
npm run kit -- validate ./my-blueprint.json
npm run kit -- build ./my-blueprint.json --out ./my-output
npm run kit -- check ./my-output
```

각 단계는 다음과 같이 끝납니다.

```text
Created ./my-blueprint.json
VALID ./my-blueprint.json
BUILT /절대/경로/my-output
VERIFIED ./my-output
```

`my-output/`에는 `index.html`, `tokens.css`, `tokens.json`, `blueprint.json`, `manifest.json`이 생깁니다. `index.html`을 브라우저로 열면 결과를 볼 수 있습니다. `check`는 생성 파일을 손으로 고치거나 지우거나 더한 경우를 거부합니다.

테마를 정해 시작하려면 템플릿 뒤에 테마를 붙입니다.

```sh
npm run kit -- init saas-landing ./my-blueprint.json trust
```

그 밖의 명령은 `catalog`, `schema`, `migrate`가 있습니다. 인자 없이 `node scripts/kit.mjs`를 실행하면 사용법이 나옵니다.

## 웹 개발 서버

```sh
npm run web:dev
```

http://localhost:3000 을 엽니다. 처음 실행할 때 정적 자산을 동기화합니다. 포트를 바꾸려면 `PORT=3001 npm run web:dev`처럼 실행합니다.

주요 주소입니다.

| 주소 | 내용 |
|---|---|
| `/studio` | Studio |
| `/explore` | Explore |
| `/components` | 부품 목록과 명세 |
| `/docs` | 시작 가이드와 Core 레퍼런스 |
| `/integrations` | CLI, REST, MCP 연결 안내 |

운영 빌드는 다음과 같이 만들고 실행합니다.

```sh
npm run web:build
PORT=3000 npm --workspace apps/web run start
```

## REST API v1

서버는 위 개발 서버를 http://localhost:3000 에서 띄운 상태라고 가정합니다. 운영 주소는 아직 정해지지 않았습니다. 배포 뒤에는 `http://localhost:3000`을 `<배포 주소>`로 바꿔 쓰면 됩니다.

모든 응답은 같은 봉투입니다. 성공은 `{"ok":true,"value":...}`, 실패는 `{"ok":false,"errors":[...]}`이고, 둘 다 `warnings`, `catalogVersion`, `contractVersion`을 가집니다.

카탈로그 일부만 조회합니다. 다음 쪽은 응답의 `nextCursor`를 `cursor` 인자로 보냅니다.

```sh
curl 'http://localhost:3000/api/v1/catalog?kind=templates&filter.pageType=landing&fields=id,theme&limit=3'
```

```json
{"ok":true,"value":{"kind":"templates","items":[{"id":"saas-landing","theme":"trust"},{"id":"app-landing","theme":"pocket"},{"id":"product-landing","theme":"commerce"}],"total":22,"nextCursor":"o3"},"warnings":[],"catalogVersion":"2.4.0","contractVersion":"1.1.0"}
```

빠른 시작에서 만든 `my-blueprint.json`을 검증합니다. 요청 본문은 `{"blueprint": ...}`입니다.

```sh
node -e "const fs=require('node:fs');const blueprint=JSON.parse(fs.readFileSync('my-blueprint.json','utf8'));fs.writeFileSync('request.json',JSON.stringify({blueprint}))"
curl -X POST http://localhost:3000/api/v1/validate \
  -H 'content-type: application/json' \
  --data-binary @request.json
```

```json
{"ok":true,"value":{"valid":true},"warnings":[],"catalogVersion":"2.4.0","contractVersion":"1.1.0"}
```

컴파일합니다. 아래 요청은 HTML 본문 대신 요약과 manifest를 받습니다. 본문 전체가 필요하면 `html`을 `full`로 바꿉니다.

```sh
node -e "const fs=require('node:fs');const blueprint=JSON.parse(fs.readFileSync('my-blueprint.json','utf8'));fs.writeFileSync('compile-request.json',JSON.stringify({blueprint,include:['html','manifest'],html:'summary'}))"
curl -X POST http://localhost:3000/api/v1/compile \
  -H 'content-type: application/json' \
  --data-binary @compile-request.json
```

응답의 `value`에는 `sizes`, `htmlSummary`, `manifest`가 들어 있습니다.

규약을 어기면 거부됩니다. 허용되지 않은 `style` 속성을 넣어 보냅니다.

```sh
node -e "const fs=require('node:fs');const blueprint=JSON.parse(fs.readFileSync('my-blueprint.json','utf8'));blueprint.tree.children[0].style='color:red';fs.writeFileSync('bad-request.json',JSON.stringify({blueprint}))"
curl -X POST http://localhost:3000/api/v1/validate \
  -H 'content-type: application/json' \
  --data-binary @bad-request.json
```

HTTP 422와 함께 다음 오류가 돌아옵니다. `hint`와 `rule`의 값은 줄였습니다.

```json
{"ok":false,"errors":[{"code":"UNKNOWN_KEY","path":"$.tree.children[0].style","message":"허용되지 않은 속성: style","hint":"...","rule":"..."}],"warnings":[],"catalogVersion":"2.4.0","contractVersion":"1.1.0"}
```

오류에는 위치(`path`), 코드, 설명과 고치는 방법(`hint`)이 있습니다. 규칙 진단에는 `rule`과 기계가 읽는 `fix`가 붙을 수 있습니다.

`GET /api/v1/themes`, `/components`, `/components/{id}`, `/schema`와 `POST /api/v1/explain`도 있습니다. 요청 크기, 호출 제한, 캐시와 상태 코드는 [REST·MCP 기준 문서](docs/dev/platform/07-api-mcp.md)에 있습니다.

## MCP 연결

엔드포인트는 `/api/mcp`입니다. 로컬에서는 `http://localhost:3000/api/mcp`입니다. 전송 방식은 Streamable HTTP이고 세션 상태가 없습니다.

도구는 여섯 개입니다.

| 도구 | 하는 일 |
|---|---|
| `list_design_system` | 카탈로그를 종류별로 부분 조회 |
| `get_design_schema` | Blueprint 등 JSON 스키마 조회 |
| `get_component_spec` | 부품 하나의 명세 조회 |
| `validate_blueprint` | Blueprint 검증. 입력을 자동으로 고치지 않음 |
| `compile_design` | 컴파일. 기본은 HTML 요약과 manifest |
| `explain_design_decisions` | 컴파일 결정의 근거 조회 |

### Claude Code

```sh
claude mcp add --transport http static-kit http://localhost:3000/api/mcp
```

팀과 공유하려면 `--scope project`를 붙입니다. 이 옵션은 저장소에 `.mcp.json`을 만들고, 처음 쓸 때 Claude Code에서 승인해야 합니다.

연결한 뒤 Claude Code 안에서 "static-kit의 list_design_system으로 템플릿 개수를 알려 줘"처럼 요청하면 도구를 호출합니다.

### 그 밖의 Streamable HTTP 클라이언트

원격 HTTP MCP를 지원하는 클라이언트에는 서버 주소로 `http://localhost:3000/api/mcp`를 등록합니다. 설정 파일 모양은 제품마다 다릅니다.

공식 TypeScript SDK로 직접 연결할 수도 있습니다. 이 저장소에는 `@modelcontextprotocol/client`가 이미 설치되어 있습니다. 다른 프로젝트에서는 `npm install @modelcontextprotocol/client@2.4.0`을 먼저 실행합니다. 아래 코드를 `mcp-example.mjs`로 저장하고 `node mcp-example.mjs`로 실행합니다.

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

먼저 도구 이름 여섯 개가, 이어서 템플릿 5개의 `id`와 `theme`이 출력됩니다.

```text
[
  'list_design_system',
  'get_design_schema',
  'get_component_spec',
  'validate_blueprint',
  'compile_design',
  'explain_design_decisions'
]
```

권장 순서는 목록 조회, 스키마나 부품 명세 확인, Blueprint 작성, `validate_blueprint`, 오류의 `path`만 고쳐 재검증, `compile_design`입니다. 이 서버는 임의 URL을 가져오거나 HTML·CSS·스크립트를 실행하지 않습니다. 인증이 없으므로 공개 배포 전에 접근 제어를 따로 설정하세요.

## 저장소 구조

```text
src/            Core. 카탈로그, 검증기, 컴파일기, 서비스 계층(service/), 편집 연산(edit/)
apps/web/       Next.js 웹 앱과 REST·MCP 라우트
scripts/        CLI(kit.mjs), 정적 사이트 빌드, 감사, 문서 생성
tests/          Core·서비스·채널 계약 테스트
e2e/            정적 사이트용 Playwright 테스트
site/           생성된 정적 산출물(조립기, 갤러리, 예제 85개). 손으로 고치지 않음
docs/           설계서, ADR, 개발 문서와 증거
```

`package.json`의 `exports`는 `./service`와 `./edit`뿐입니다. 웹 앱은 이 두 진입점으로만 Core를 씁니다. `site/`와 `docs/*.html`은 `npm run build`와 `npm run docs`가 만드는 산출물입니다.

## 버전과 호환

- **카탈로그 2.4.0**: 기본 버전입니다. 템플릿, CLI, 서비스, REST, MCP가 새로 만드는 문서는 모두 2.4.0입니다.
- **카탈로그 2.5.0**: 명시해서 고르는 버전입니다. 표현력 필드(히어로 비율, 강조 카드, 풀쿼트, 구역 리듬, 전폭 미디어)가 추가됩니다. 기본으로 승격하지 않았습니다. 기존 Blueprint를 올리려면 다음을 실행합니다.

  ```sh
  npm run kit -- migrate ./my-blueprint.json ./my-blueprint-2.5.json --to 2.5.0
  ```

  새 필드는 2.4.0 이하 문서에서 거부됩니다. REST와 MCP에서는 Blueprint의 `catalogVersion`을 `2.5.0`으로 올리면 됩니다.
- **계약 1.1.0**: 응답 봉투와 진단 형식의 버전(`contractVersion`)입니다. 카탈로그 버전과 따로 올라갑니다. 1.1.0은 1.0.0의 필수 필드를 그대로 두고 진단에 선택 필드 `severity`와 `contract`를 더했습니다.
- **고정 해시**: 2.4.0 출력은 기본 템플릿 85개와 직접 작성한 사례 15개를 SHA-256으로 고정했습니다. 2.5.0을 더해도 이 출력이 바이트 단위로 같은지 테스트가 대조합니다. 해시는 `docs/evidence/expression/legacy-2-4-hashes.json`에 있습니다.
- **Node.js**: 22를 씁니다. 웹 앱은 `22.x`를 지정합니다.

각 버전의 결정 배경은 [ADR 0009](docs/adr/0009-core-service-layer.md)와 [ADR 0010](docs/adr/0010-expression-grammar-2-5.md)에, 변경 내역은 [CHANGELOG](CHANGELOG.md)에 있습니다.

## 문서

- 실행 중인 앱의 `/docs`: 시작하기, Blueprint, Components, Composition, Tokens & Themes, CLI, REST API, MCP, Limitations
- 설계: [설계서](docs/design.md) · [아키텍처](docs/architecture.md) · [규칙 개정](docs/governance.md) · [출처](docs/sources.md)
- 결정 기록: [ADR 목록](docs/adr/)
- 개발 문서: [플랫폼 전환 문서와 진단·실험 기록](docs/dev/platform/README.md)

## 테스트

```sh
npm test                                   # Core·서비스·채널 계약 테스트
npm run verify                             # 테스트, 감사, 문서 생성, 정적 빌드, 재현성 검사
npm --workspace apps/web run test:boundary # 웹 앱의 Core 경계 검사
npm --workspace apps/web run test:unit     # Studio 단위 테스트
npm --workspace apps/web run typecheck     # 웹 앱 타입 검사
npm run web:build && npm --workspace apps/web run test:e2e   # 웹 앱 브라우저 테스트
```

웹 앱 브라우저 테스트는 빌드가 먼저 필요하고 4310번 포트를 씁니다. 포트를 바꾸려면 `WEB_PORT`를 지정합니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 보세요. 동료 저장소 design-system-kit(AGPL-3.0)의 코드·토큰·CSS·문구·아이콘은 복사하지 않았습니다. 자세한 출처는 [docs/sources.md](docs/sources.md)에 있습니다.
