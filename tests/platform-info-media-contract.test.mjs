import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/examples/minimal.mjs';
import {validatePurposeFamily} from '../src/platform/families/kit.mjs';
import {validateComponentContracts, ALL_COMPONENT_CONTRACTS} from '../src/platform/families/contracts.mjs';
import {getPurposeFamily, renderPurposeFamily, listPurposeFamilies} from '../src/platform/families/index.mjs';
import {INFO_MEDIA_FAMILIES, INFO_FAMILIES, MEDIA_FAMILIES} from '../src/platform/families/info-media.mjs';

const env = createPlatform();

const EXPECTED_INFO_IDS = [
  'purpose:info.status-badge',
  'purpose:info.avatar',
  'purpose:info.avatar-group',
  'purpose:info.accordion',
  'purpose:info.collapsible',
  'purpose:info.counter',
  'purpose:info.notification-indicator',
  'purpose:info.keyboard-shortcut',
  'purpose:info.metadata-row',
  'purpose:info.stat-comparison',
];

const EXPECTED_MEDIA_IDS = [
  'purpose:media.responsive-image',
  'purpose:media.carousel',
  'purpose:media.audio-player',
  'purpose:media.file-preview',
  'purpose:media.image-comparison',
  'purpose:media.figure-caption',
];

test('info-media: exports all 16 expected purpose families', () => {
  assert.equal(INFO_FAMILIES.length, 10);
  assert.equal(MEDIA_FAMILIES.length, 6);
  assert.equal(INFO_MEDIA_FAMILIES.length, 16);
  assert.deepEqual(INFO_FAMILIES.map(f => f.id).sort(), EXPECTED_INFO_IDS.sort());
  assert.deepEqual(MEDIA_FAMILIES.map(f => f.id).sort(), EXPECTED_MEDIA_IDS.sort());
});

test('info-media: every family passes validatePurposeFamily', () => {
  const baseIds = env.registry.list('base-component').map(b => b.id);
  for (const f of INFO_MEDIA_FAMILIES) {
    const errors = validatePurposeFamily(f, {baseIds});
    assert.deepEqual(errors, [], `${f.id} should have no validation errors`);
    assert.ok(f.purpose && f.purpose.length > 5, `${f.id} needs a descriptive purpose`);
    assert.ok(f.bases.length >= 1, `${f.id} needs at least one base component`);
  }
});

test('info-media: all families are registered and retrievable via getPurposeFamily', () => {
  for (const id of [...EXPECTED_INFO_IDS, ...EXPECTED_MEDIA_IDS]) {
    const f = getPurposeFamily(id);
    assert.ok(f, `getPurposeFamily('${id}') must return a definition`);
    assert.equal(f.id, id);
  }
});

test('info-media: renderPurposeFamily renders valid markup with expected semantics', () => {
  for (const f of INFO_MEDIA_FAMILIES) {
    const r = renderPurposeFamily(env, f.id, {
      visual: 'family:soft',
      variant: f.example.variant,
      props: f.example.props,
      content: f.example.content,
    });
    assert.equal(r.ok, true, `${f.id} render error: ${JSON.stringify(r.errors)}`);
    assert.ok(r.html.includes(`data-purpose="${f.id.slice('purpose:'.length)}"`), `${f.id} markup must have data-purpose`);
    assert.ok(r.html.length > 50, `${f.id} markup should not be empty`);
  }
});

test('info-media: variants and content changes alter the output', () => {
  // Accordion layout change
  const accStack = renderPurposeFamily(env, 'purpose:info.accordion', {
    visual: 'family:soft',
    variant: {layout: 'stack'},
    content: {items: [{title: 'A', content: '1'}, {title: 'B', content: '2'}]},
  });
  const accSep = renderPurposeFamily(env, 'purpose:info.accordion', {
    visual: 'family:soft',
    variant: {layout: 'separated'},
    content: {items: [{title: 'A', content: '1'}, {title: 'B', content: '2'}]},
  });
  assert.equal(accStack.ok, true);
  assert.equal(accSep.ok, true);
  assert.notEqual(accStack.html, accSep.html, 'accordion layout change must alter output');

  // Status badge tone change
  const badgeInfo = renderPurposeFamily(env, 'purpose:info.status-badge', {
    visual: 'family:soft',
    variant: {tone: 'info'},
    content: {label: '진행 중'},
  });
  const badgeDanger = renderPurposeFamily(env, 'purpose:info.status-badge', {
    visual: 'family:soft',
    variant: {tone: 'danger'},
    content: {label: '오류'},
  });
  assert.equal(badgeInfo.ok, true);
  assert.equal(badgeDanger.ok, true);
  assert.notEqual(badgeInfo.html, badgeDanger.html);
  assert.ok(badgeInfo.html.includes('data-tone="info"'));
  assert.ok(badgeDanger.html.includes('data-tone="danger"'));
});

test('info-media: missing required content is refused with diagnostic (RED-GREEN test)', () => {
  // Collapsible missing triggerLabel
  const collBad = renderPurposeFamily(env, 'purpose:info.collapsible', {
    visual: 'family:soft',
    content: {content: '본문만 있음'},
  });
  assert.equal(collBad.ok, false);
  assert.ok(collBad.errors.some(e => e.code === 'P_PURPOSE_CONTENT'));

  // Carousel items missing
  const carBad = renderPurposeFamily(env, 'purpose:media.carousel', {
    visual: 'family:soft',
    content: {label: '캐러셀'},
  });
  assert.equal(carBad.ok, false);
  assert.ok(carBad.errors.some(e => e.code === 'P_PURPOSE_CONTENT'));
});

test('info-media: component contracts include info-media families and pass validateComponentContracts', () => {
  const errors = validateComponentContracts(ALL_COMPONENT_CONTRACTS);
  assert.deepEqual(errors, [], `contracts must be valid: ${JSON.stringify(errors)}`);
  for (const id of [...EXPECTED_INFO_IDS, ...EXPECTED_MEDIA_IDS]) {
    const c = ALL_COMPONENT_CONTRACTS.find(x => x.id === id);
    assert.ok(c, `contract for ${id} must exist in ALL_COMPONENT_CONTRACTS`);
    assert.equal(c.layer, 'Purpose');
  }
});
