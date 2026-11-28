import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/examples/minimal.mjs';
import {assembleComponents} from '../src/service/index.mjs';
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

test('info-media: every declared multi-value variant and prop has a matching CSS rule', () => {
  const axisAttributes = {
    tone: 'tone', size: 'size', shape: 'shape', spacing: 'spacing', layout: 'layout', density: 'density',
    variant: 'variant', style: 'style', trend: 'trend', aspectRatio: 'ratio', fit: 'fit', orientation: 'orientation',
    placement: 'placement', align: 'align',
  };
  for (const family of INFO_MEDIA_FAMILIES) {
    const css = `${family.sharedCss}\n${family.css}`;
    for (const [axis, values] of Object.entries({...family.variants, ...family.props})) {
      if (values.length < 2 || axis === 'placement') continue; // placement changes markup order, not a visual selector.
      const attr = axisAttributes[axis];
      assert.ok(attr, `${family.id}.${axis} needs an explicit CSS attribute mapping`);
      for (const value of values) {
        assert.match(css, new RegExp(`\\[data-${attr}=["']${value}["']\\]`), `${family.id}.${axis}=${value} must affect styling`);
      }
    }
  }
});

test('info-media: every declared variant and prop value reaches the rendered markup', () => {
  const axisAttributes = {
    tone: 'tone', size: 'size', shape: 'shape', spacing: 'spacing', layout: 'layout', density: 'density',
    variant: 'variant', style: 'style', trend: 'trend', aspectRatio: 'ratio', fit: 'fit', orientation: 'orientation',
    placement: 'placement', align: 'align',
  };
  for (const family of INFO_MEDIA_FAMILIES) {
    for (const [kind, axes] of [['variant', family.variants], ['props', family.props]]) {
      for (const [axis, values] of Object.entries(axes)) {
        if (axis === 'placement') continue; // validated by the before/after caption-order assertion below.
        for (const value of values) {
          const rendered = renderPurposeFamily(env, family.id, {
            visual: 'family:soft',
            variant: {...family.example.variant, ...(kind === 'variant' ? {[axis]: value} : {})},
            props: {...family.example.props, ...(kind === 'props' ? {[axis]: value} : {})},
            content: family.example.content,
          });
          assert.equal(rendered.ok, true, `${family.id}.${kind}.${axis}=${value}: ${JSON.stringify(rendered.errors)}`);
          assert.ok(rendered.html.includes(`data-${axisAttributes[axis]}="${value}"`), `${family.id}.${kind}.${axis}=${value} reaches markup`);
        }
      }
    }
  }
});

test('info-media: Figure placement moves its caption around the image in rendered output', () => {
  const family = INFO_MEDIA_FAMILIES.find(f => f.id === 'purpose:media.figure-caption');
  const render = placement => renderPurposeFamily(env, family.id, {
    visual: 'family:soft', variant: {placement}, props: family.example.props, content: family.example.content,
  });
  const top = render('top'), bottom = render('bottom');
  assert.equal(top.ok, true);
  assert.equal(bottom.ok, true);
  assert.ok(top.html.indexOf('<figcaption') < top.html.indexOf('<img'));
  assert.ok(bottom.html.indexOf('<img') < bottom.html.indexOf('<figcaption'));
});

test('info-media: audio player is included in runtime shipping when its play control is rendered', () => {
  const result = assembleComponents({
    context: 'general', mode: 'light', density: 'comfortable',
    items: [{purpose: 'purpose:media.audio-player', visual: 'family:soft', content: {title: '재생 확인', duration: '02:00'}}],
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.value.html, /data-audio-play/);
  assert.match(result.value.script, /data-audio-play/);
});

test('info-media: duplicate component ids are rejected before they can produce duplicate ARIA targets', () => {
  const result = assembleComponents({
    context: 'general', mode: 'light', density: 'comfortable',
    items: [0, 1].map(() => ({purpose: 'purpose:info.accordion', visual: 'family:soft', id: 'duplicate-panel', content: {items: [{title: 'A', content: '1'}, {title: 'B', content: '2'}]}})),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /id가 겹칩니다/);
});

test('info-media: hostile user content is HTML-escaped in family output', () => {
  const hostile = '\"><img src=x onerror=alert(1)>';
  for (const family of INFO_MEDIA_FAMILIES) {
    const content = structuredClone(family.example.content);
    const replace = value => {
      if (typeof value === 'string') return hostile;
      if (Array.isArray(value)) return value.map(replace);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]));
      return value;
    };
    const rendered = renderPurposeFamily(env, family.id, {
      visual: 'family:soft', variant: family.example.variant, props: family.example.props,
      content: replace(content), id: `escape-${family.id.slice('purpose:'.length).replaceAll('.', '-')}`,
    });
    assert.equal(rendered.ok, true, `${family.id}: ${JSON.stringify(rendered.errors)}`);
    assert.doesNotMatch(rendered.html, /<img src=x onerror=/, `${family.id} user content must not create an image tag`);
    assert.ok(rendered.html.includes('&lt;img src=x onerror='), `${family.id} user HTML is escaped`);
  }
});

test('info-media: declared array content limits are enforced by their renderers', () => {
  const cases = [
    ['purpose:info.avatar-group', {items: Array.from({length: 11}, (_, i) => ({name: `Person ${i}`}))}],
    ['purpose:info.accordion', {items: Array.from({length: 11}, (_, i) => ({title: `T${i}`, content: `C${i}`}))}],
    ['purpose:info.keyboard-shortcut', {keys: ['1', '2', '3', '4', '5']}],
    ['purpose:info.metadata-row', {items: Array.from({length: 7}, (_, i) => ({label: `L${i}`, value: `V${i}`}))}],
    ['purpose:media.carousel', {label: 'Gallery', items: Array.from({length: 9}, (_, i) => ({title: `S${i}`, src: `${i}.jpg`, alt: `Slide ${i}`}))}],
  ];
  for (const [id, override] of cases) {
    const family = INFO_MEDIA_FAMILIES.find(f => f.id === id);
    const rendered = renderPurposeFamily(env, id, {
      visual: 'family:soft', variant: family.example.variant, props: family.example.props,
      content: {...family.example.content, ...override},
    });
    assert.equal(rendered.ok, false, `${id} must reject data outside its declared bounds`);
    assert.ok(rendered.errors.some(e => e.code === 'P_RENDER'), `${id} reports a renderer diagnostic`);
  }
});

test('info-media: avatar image errors reveal the initials fallback in shipped runtime', () => {
  const result = assembleComponents({
    context: 'general', mode: 'light', density: 'comfortable',
    items: [{purpose: 'purpose:info.avatar', visual: 'family:soft', content: {name: 'A Person', initials: 'AP', src: 'avatar.jpg'}}],
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.match(result.value.html, /class="pf-avatar-fallback"(?:\s|>)/);
  assert.match(result.value.script, /pf-avatar-fallback/);
});
