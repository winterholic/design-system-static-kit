import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(ROOT, 'docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json');

/**
 * REQUEST §2.2 17개 정보 그룹 필드 매핑
 */
export const REQUIRED_INFO_GROUP_FIELDS = [
  'id',                          // 고유 ID
  'kind',                        // 재료 유형 및 카테고리 (category 필드도 존재)
  'supportedVersions',           // 지원 버전
  'definitionPath',              // 실제 정의 경로
  'rendererConnected',           // 렌더러 연결 여부
  'usesTokensAndCss',            // 실제 CSS 및 토큰 사용 여부
  'supportedVariantsAndStates',  // 지원 변형 및 상태
  'catalogVisible',              // 웹 카탈로그 노출 여부
  'detailPageExists',            // 상세 페이지 존재 여부
  'studioAssemblable',           // Studio 조립 가능 여부
  'restAndMcpAvailable',         // REST 및 MCP 사용 가능 여부
  'blueprintExpressible',        // Blueprint 표현 가능 여부
  'exportReflected',             // 내보내기 반영 여부
  'a11yAndResponsiveTested',     // 접근성 및 반응형 테스트 여부
  'qualityVerdict',              // 품질 검증 결과
  'rightsAndLicense',            // 권리 및 라이선스 상태
  'legacyDuplicateRelation',     // 기존 시스템과 신규 시스템의 중복 여부
];

/**
 * REQUEST §2.2 및 CONTRACTS §8.2 7개 재료 상태 사다리
 */
export const ALLOWED_STATUSES = new Set([
  'missing',
  'metadata-only',
  'defined',
  'renderable',
  'catalog-visible',
  'assemblable',
  'verified',
]);

/**
 * CONTRACTS §8.3 요구 항목 커버리지 분류
 */
export const ALLOWED_COVERAGE_TYPES = new Set([
  'direct',
  'variant',
  'schema',
  'part-of',
  'missing',
]);

/**
 * 파일 라인 캐시
 */
const lineCountCache = new Map();
function getLineCount(filePath, rootDir = ROOT) {
  const fullPath = resolve(rootDir, filePath);
  if (!lineCountCache.has(fullPath)) {
    if (!existsSync(fullPath)) return -1;
    const content = readFileSync(fullPath, 'utf8');
    lineCountCache.set(fullPath, content.split('\n').length);
  }
  return lineCountCache.get(fullPath);
}

/**
 * Material Coverage Manifest 계약 검증 함수
 *
 * @param {object} manifest - 파싱된 Material Coverage Manifest 객체
 * @param {object} options - 옵션 { rootDir, checkFileSystem }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMaterialCoverageManifest(manifest, options = {}) {
  const {rootDir = ROOT, checkFileSystem = true} = options;
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return {valid: false, errors: ['Manifest must be a non-null object']};
  }

  // 1. Top-level 계약 확인
  if (manifest.manifestVersion !== '2.0.0') {
    errors.push(`Invalid manifestVersion: expected "2.0.0", got "${manifest.manifestVersion}"`);
  }
  if (!manifest.summary || typeof manifest.summary !== 'object') {
    errors.push('Manifest missing required top-level summary object');
  }
  if (!Array.isArray(manifest.requirements)) {
    errors.push('Manifest missing required requirements array');
  }
  if (!Array.isArray(manifest.materials)) {
    errors.push('Manifest missing required materials array');
  }
  if (errors.length > 0) {
    return {valid: false, errors};
  }

  const materials = manifest.materials;
  const requirements = manifest.requirements;

  const materialIdMap = new Map();
  const reqIdMap = new Map();

  // 2. 재료(materials[]) 검사: 17개 필드, 7개 상태, ID 고유성, 정의/증거 위치
  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    const prefix = `materials[${i}] (${mat?.id ?? 'no-id'})`;

    if (!mat || typeof mat !== 'object') {
      errors.push(`${prefix}: material record must be an object`);
      continue;
    }

    if (typeof mat.id !== 'string' || mat.id.trim() === '') {
      errors.push(`${prefix}: missing or empty id`);
      continue;
    }

    if (materialIdMap.has(mat.id)) {
      errors.push(`Duplicate material id detected: "${mat.id}" (first at index ${materialIdMap.get(mat.id)})`);
    } else {
      materialIdMap.set(mat.id, i);
    }

    // 17개 정보 그룹 필수 필드 존재 여부 검사 (현재 기록의 추가 필드는 깨뜨리지 않고 허용)
    for (const field of REQUIRED_INFO_GROUP_FIELDS) {
      if (!(field in mat)) {
        errors.push(`${prefix}: missing required field "${field}"`);
      }
    }

    // 7개 상태 검사
    if (!ALLOWED_STATUSES.has(mat.status)) {
      errors.push(`${prefix}: invalid material status "${mat.status}". Must be one of: ${[...ALLOWED_STATUSES].join(', ')}`);
    }

    // 필드별 세부 타입 검증
    if (typeof mat.kind !== 'string' || mat.kind.trim() === '') {
      errors.push(`${prefix}: kind must be a non-empty string`);
    }
    if (typeof mat.rendererConnected !== 'boolean') {
      errors.push(`${prefix}: rendererConnected must be a boolean`);
    }
    if (typeof mat.usesTokensAndCss !== 'boolean') {
      errors.push(`${prefix}: usesTokensAndCss must be a boolean`);
    }
    if (typeof mat.catalogVisible !== 'boolean') {
      errors.push(`${prefix}: catalogVisible must be a boolean`);
    }
    if (typeof mat.detailPageExists !== 'boolean') {
      errors.push(`${prefix}: detailPageExists must be a boolean`);
    }
    if (typeof mat.studioAssemblable !== 'boolean') {
      errors.push(`${prefix}: studioAssemblable must be a boolean`);
    }
    if (typeof mat.restAndMcpAvailable !== 'boolean') {
      errors.push(`${prefix}: restAndMcpAvailable must be a boolean`);
    }
    if (typeof mat.blueprintExpressible !== 'boolean') {
      errors.push(`${prefix}: blueprintExpressible must be a boolean`);
    }
    if (typeof mat.exportReflected !== 'boolean') {
      errors.push(`${prefix}: exportReflected must be a boolean`);
    }
    if (typeof mat.a11yAndResponsiveTested !== 'boolean') {
      errors.push(`${prefix}: a11yAndResponsiveTested must be a boolean`);
    }
    if (typeof mat.rightsAndLicense !== 'string') {
      errors.push(`${prefix}: rightsAndLicense must be a string`);
    }
    if (!Array.isArray(mat.legacyDuplicateRelation) && mat.legacyDuplicateRelation !== null) {
      errors.push(`${prefix}: legacyDuplicateRelation must be an array or null`);
    }
    if (!mat.supportedVariantsAndStates || typeof mat.supportedVariantsAndStates !== 'object') {
      errors.push(`${prefix}: supportedVariantsAndStates must be an object`);
    }
    if (!mat.qualityVerdict || typeof mat.qualityVerdict !== 'object') {
      errors.push(`${prefix}: qualityVerdict must be an object`);
    } else {
      if (!Array.isArray(mat.qualityVerdict.evidenceRefs)) {
        errors.push(`${prefix}: qualityVerdict.evidenceRefs must be an array`);
      }
      if (!Array.isArray(mat.qualityVerdict.invalidEvidenceRefs)) {
        errors.push(`${prefix}: qualityVerdict.invalidEvidenceRefs must be an array`);
      }
    }

    // 파일시스템 기반 실제 정의 경로 검증
    if (checkFileSystem && mat.definitionPath != null) {
      if (typeof mat.definitionPath !== 'string') {
        errors.push(`${prefix}: definitionPath must be a string or null`);
      } else {
        const filePath = mat.definitionPath.split('#')[0];
        const fullPath = resolve(rootDir, filePath);
        if (!existsSync(fullPath)) {
          errors.push(`${prefix}: definitionPath references non-existent file "${filePath}"`);
        }
      }
    }

    // 파일시스템 기반 유효 시험 위치(evidenceRefs) 검증
    if (checkFileSystem && Array.isArray(mat.qualityVerdict?.evidenceRefs)) {
      for (const ref of mat.qualityVerdict.evidenceRefs) {
        const m = String(ref).match(/^([\w./-]+):(\d+)$/);
        if (!m) {
          errors.push(`${prefix}: evidenceRef "${ref}" must match "path:line" format`);
          continue;
        }
        const [, filePath, lineStr] = m;
        const lineNo = Number(lineStr);
        const totalLines = getLineCount(filePath, rootDir);
        if (totalLines === -1) {
          errors.push(`${prefix}: evidenceRef references non-existent file "${filePath}"`);
        } else if (lineNo < 1 || lineNo > totalLines) {
          errors.push(`${prefix}: evidenceRef line ${lineNo} out of range (1..${totalLines}) in "${filePath}"`);
        }
      }
    }
    // 주의: qualityVerdict.invalidEvidenceRefs 는 generator가 의도적으로 기록한 무효 증거 보고 목록이므로
    // 검사기에서는 에러로 처리하지 않고 정상 수용한다.
  }

  // 3. 요구사항(requirements[]) 검사: 7개 상태, 커버리지 유형, ID 고유성
  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    const prefix = `requirements[${i}] (${req?.id ?? 'no-id'})`;

    if (!req || typeof req !== 'object') {
      errors.push(`${prefix}: requirement record must be an object`);
      continue;
    }

    if (typeof req.id !== 'string' || req.id.trim() === '') {
      errors.push(`${prefix}: missing or empty id`);
      continue;
    }

    if (reqIdMap.has(req.id)) {
      errors.push(`Duplicate requirement id detected: "${req.id}" (first at index ${reqIdMap.get(req.id)})`);
    } else {
      reqIdMap.set(req.id, i);
    }

    if (!ALLOWED_STATUSES.has(req.status)) {
      errors.push(`${prefix}: invalid requirement status "${req.status}". Must be one of: ${[...ALLOWED_STATUSES].join(', ')}`);
    }

    if (!ALLOWED_COVERAGE_TYPES.has(req.coverage)) {
      errors.push(`${prefix}: invalid requirement coverage "${req.coverage}". Must be one of: ${[...ALLOWED_COVERAGE_TYPES].join(', ')}`);
    }

    if (!Array.isArray(req.materialIds)) {
      errors.push(`${prefix}: materialIds must be an array`);
    }
  }

  // 4. 요구-재료 상호 참조 정합성 검사
  // 4a. requirements -> materials 참조 검사
  for (const req of requirements) {
    if (!Array.isArray(req.materialIds)) continue;
    for (const matId of req.materialIds) {
      if (!materialIdMap.has(matId)) {
        errors.push(`Requirement "${req.id}" references unknown material "${matId}"`);
      } else {
        const mat = materials[materialIdMap.get(matId)];
        if (Array.isArray(mat.requirementIds) && !mat.requirementIds.includes(req.id)) {
          errors.push(`Material "${matId}" missing reciprocal reference to requirement "${req.id}"`);
        }
      }
    }
  }

  // 4b. materials -> requirements 참조 검사
  for (const mat of materials) {
    if (!Array.isArray(mat.requirementIds)) continue;
    for (const reqId of mat.requirementIds) {
      if (!reqIdMap.has(reqId)) {
        errors.push(`Material "${mat.id}" references unknown requirement "${reqId}"`);
      } else {
        const req = requirements[reqIdMap.get(reqId)];
        if (Array.isArray(req.materialIds) && !req.materialIds.includes(mat.id)) {
          errors.push(`Requirement "${reqId}" missing reciprocal reference to material "${mat.id}"`);
        }
      }
    }
  }

  return {valid: errors.length === 0, errors};
}

/**
 * 저장본 신선도 검사 함수 (바이트 일치 확인)
 *
 * @param {string} savedText - 디스크에 저장된 manifest JSON 문자열
 * @param {string} currentText - 새로 생성된 manifest JSON 문자열
 * @returns {{ match: boolean, message: string }}
 */
export function checkCoverageManifestFreshness(savedText, currentText) {
  if (savedText === currentText) {
    return {match: true, message: 'MANIFEST MATCH'};
  }
  return {
    match: false,
    message: 'MANIFEST DRIFT: MATERIAL-COVERAGE.json 이 현재 코드와 다릅니다. npm run coverage:materials 로 다시 만드세요.',
  };
}

// -----------------------------------------------------------------------------
// 테스트 본문
// -----------------------------------------------------------------------------

test('checked-in MATERIAL-COVERAGE.json passes all contract invariants', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  const result = validateMaterialCoverageManifest(manifest, {rootDir: ROOT, checkFileSystem: true});
  assert.equal(result.errors.length, 0, `Manifest contract violations:\n${result.errors.slice(0, 10).join('\n')}`);
  assert.equal(result.valid, true);

  // 기본 규모 단언
  assert.ok(manifest.materials.length >= 1700, `Expected >= 1700 materials, got ${manifest.materials.length}`);
  assert.ok(manifest.requirements.length >= 400, `Expected >= 400 requirements, got ${manifest.requirements.length}`);
});

test('manifest correctly captures intentional invalidEvidenceRefs and missing statuses without false failure', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  // 1. 의도적으로 보고되는 invalidEvidenceRefs 확인
  const withInvalidRefs = manifest.materials.filter(m => m.qualityVerdict?.invalidEvidenceRefs?.length > 0);
  assert.ok(withInvalidRefs.length > 0, 'Expected manifest to contain materials with reported invalidEvidenceRefs');

  // 2. 의도적으로 보고되는 status: missing 요구사항 확인
  const missingReqs = manifest.requirements.filter(r => r.status === 'missing');
  assert.ok(missingReqs.length > 0, 'Expected manifest to contain missing requirements');
  assert.ok(missingReqs.every(r => r.coverage === 'missing' && r.materialIds.length === 0));

  // 3. 재료의 7개 상태 분포가 유효함을 확인
  const statuses = new Set(manifest.materials.map(m => m.status));
  for (const s of statuses) {
    assert.ok(ALLOWED_STATUSES.has(s), `Unknown status in manifest: ${s}`);
  }
});

test('isolated negative input: detects missing required info group field', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  // 복제 후 하나의 재료에서 17개 필드 중 qualityVerdict 제거
  const copy = JSON.parse(JSON.stringify(manifest));
  delete copy.materials[0].qualityVerdict;

  const result = validateMaterialCoverageManifest(copy, {checkFileSystem: false});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('missing required field "qualityVerdict"')));
});

test('isolated negative input: detects unknown material status', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  const copy = JSON.parse(JSON.stringify(manifest));
  copy.materials[0].status = 'pseudo-completed';

  const result = validateMaterialCoverageManifest(copy, {checkFileSystem: false});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('invalid material status "pseudo-completed"')));
});

test('isolated negative input: detects duplicate material and requirement IDs', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  const copy = JSON.parse(JSON.stringify(manifest));
  copy.materials[1].id = copy.materials[0].id;
  copy.requirements[1].id = copy.requirements[0].id;

  const result = validateMaterialCoverageManifest(copy, {checkFileSystem: false});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Duplicate material id detected')));
  assert.ok(result.errors.some(e => e.includes('Duplicate requirement id detected')));
});

test('isolated negative input: detects invalid requirement and material references', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  const copy = JSON.parse(JSON.stringify(manifest));
  // 알 수 없는 재료 id 참조
  copy.requirements[0].materialIds = ['non-existent:material-xyz'];

  const result = validateMaterialCoverageManifest(copy, {checkFileSystem: false});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('references unknown material "non-existent:material-xyz"')));
});

test('isolated negative input: detects non-existent definitionPath and out-of-range evidenceRefs', () => {
  const content = readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(content);

  const copy = JSON.parse(JSON.stringify(manifest));
  // 존재하지 않는 파일 정의 경로
  copy.materials[0].definitionPath = 'src/platform/non-existent-module-xyz.mjs#foo';
  // 범위를 벗어난 라인 번호
  copy.materials[0].qualityVerdict.evidenceRefs = ['tests/material-coverage.test.mjs:9999999'];

  const result = validateMaterialCoverageManifest(copy, {rootDir: ROOT, checkFileSystem: true});
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('references non-existent file "src/platform/non-existent-module-xyz.mjs"')));
  assert.ok(result.errors.some(e => e.includes('evidenceRef line 9999999 out of range')));
});

test('isolated negative input: detects stale stored manifest (drift check)', () => {
  const saved = '{"manifestVersion":"2.0.0","summary":{}}\n';
  const modified = '{"manifestVersion":"2.0.0","summary":{"drift":true}}\n';

  const matchResult = checkCoverageManifestFreshness(saved, saved);
  assert.equal(matchResult.match, true);
  assert.equal(matchResult.message, 'MANIFEST MATCH');

  const driftResult = checkCoverageManifestFreshness(saved, modified);
  assert.equal(driftResult.match, false);
  assert.ok(driftResult.message.includes('MANIFEST DRIFT'));
});
