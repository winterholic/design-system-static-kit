import {expect, test} from '@playwright/test';
import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {getComponentSpec} from '@winterholic/design-system-static-kit/service';

const tools = ['list_design_system', 'get_design_schema', 'get_component_spec', 'validate_blueprint', 'compile_design', 'explain_design_decisions', 'assemble_design', 'assemble_blueprint', 'list_materials', 'get_material', 'list_platform_materials', 'get_platform_material', 'recommend_materials', 'check_compatibility', 'list_edit_ops', 'apply_edit'];

test('REST Route Handlers serve OpenAPI, conditional reads, and validation diagnostics', async ({request}) => {
  const openapi = await request.get('/api/v1/openapi.json');
  expect(openapi.status()).toBe(200);
  expect(await openapi.json()).toMatchObject({openapi: '3.1.0', paths: {'/api/v1/compile': {post: expect.any(Object)}}});

  const url = '/api/v1/catalog?kind=templates&fields=id&limit=1';
  const list = await request.get(url);
  expect(list.status()).toBe(200);
  expect(await list.json()).toMatchObject({ok: true});
  const etag = list.headers().etag;
  expect(etag).toBeTruthy();
  expect((await request.get(url, {headers: {'if-none-match': etag}})).status()).toBe(304);

  const invalid = await request.post('/api/v1/validate', {data: {blueprint: {}}});
  expect(invalid.status()).toBe(422);
  expect(invalid.headers()['cache-control']).toBe('no-store');
  expect(await invalid.json()).toMatchObject({ok: false, errors: expect.arrayContaining([expect.objectContaining({code: 'REQUIRED', path: '$.version'})])});
});

test('production REST output can mount the 2.6.0 component runtimes', async ({page, request}) => {
  const fixture = await request.get('/examples/dashboard-overview/blueprint.json');
  expect(fixture.status()).toBe(200);
  const blueprint = await fixture.json();
  blueprint.catalogVersion = '2.6.0';
  const controls = [
    ['button-control', 'button'], ['input-control', 'input'], ['card-surface', 'card'], ['navigation-menu', 'navigation'],
    ['modal-dialog', 'modal'], ['tabs-control', 'tabs'], ['tooltip', 'tooltip'], ['feedback-message', 'feedback'],
  ];
  for (const [type] of controls) {
    const spec = getComponentSpec({type, catalogVersion: '2.6.0'});
    expect(spec.ok, type).toBe(true);
    blueprint.tree.children.push(spec.value.example);
  }
  const result = await request.post('/api/v1/compile', {data: {blueprint, include: ['html'], html: 'full'}});
  expect(result.status()).toBe(200);
  const {value} = await result.json();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(value.html);
  // NOTE: Modal·Tooltip 예시는 내부에 Button·Input 컨트롤을 품으므로 다른 컨트롤 밖에 있는 루트만 센다.
  const roots = await page.evaluate(ids => Object.fromEntries(ids.map(id => [id,
    [...document.querySelectorAll(`[data-ctl=${id}]`)].filter(el => !el.parentElement?.closest('[data-ctl]')).length])),
  controls.map(([, id]) => id));
  for (const [, id] of controls) expect(roots[id], id).toBe(1);
  expect(errors).toEqual([]);
  const modal = page.locator('[data-ctl=modal]');
  const trigger = modal.locator('.kit-ctl-modal-trigger button');
  await trigger.click();
  await expect(modal.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal.locator('dialog')).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

for (const mode of ['modern', 'legacy']) {
  test(`MCP ${mode} client connects to Next and compiles the same document as REST`, async ({baseURL, request}) => {
    const fixture = await request.get('/examples/saas-landing/blueprint.json');
    expect(fixture.status()).toBe(200);
    const blueprint = await fixture.json();
    const include = ['html', 'manifest'];
    const rest = await request.post('/api/v1/compile', {data: {blueprint, include}});
    expect(rest.status()).toBe(200);
    const restResult = await rest.json();
    expect(restResult).toMatchObject({ok: true, value: {html: expect.stringContaining('<!doctype html>')}});

    const client = new Client({name: 'web-channel-test', version: '1.0.0'}, mode === 'modern'
      ? {versionNegotiation: {mode: {pin: '2026-07-28'}}}
      : {});
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL('/api/mcp', baseURL)));
      expect(Boolean(client.getDiscoverResult())).toBe(mode === 'modern');
      expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(tools);

      const invalid = await client.callTool({name: 'validate_blueprint', arguments: {blueprint: {}}});
      expect(invalid).toMatchObject({isError: true, structuredContent: {ok: false, errors: expect.arrayContaining([expect.objectContaining({code: 'REQUIRED', path: '$.version'})])}});
      const compiled = await client.callTool({name: 'compile_design', arguments: {blueprint, include, html: 'full'}});
      expect(compiled.isError).toBe(false);
      expect(compiled.structuredContent).toEqual(restResult);
    } finally {
      await client.close();
    }
  });
}

test('REST and MCP accept explicit 2.5 Blueprints and describe the warning fields', async ({baseURL, request}) => {
  const fixture = await request.get('/examples/dashboard-overview/blueprint.json');
  expect(fixture.status()).toBe(200);
  const blueprint = await fixture.json();
  expect(blueprint.catalogVersion).toBe('2.4.0');
  const grid = blueprint.tree.children.find(node => node.type === 'grid');
  expect(grid).toBeDefined();
  blueprint.catalogVersion = '2.5.0';
  grid.columns = 'two';
  grid.children = [1, 2, 3, 4].map(n => ({type: 'metric', label: `지표 ${n}`, value: '10'}));

  const args = {blueprint, catalogVersion: '2.5.0'};
  const validation = await request.post('/api/v1/validate', {data: args});
  expect(validation.status()).toBe(200);
  const restResult = await validation.json();
  expect(restResult).toMatchObject({ok: true, catalogVersion: '2.4.0', warnings: expect.arrayContaining([
    expect.objectContaining({code: 'CONTRACT_V03', severity: 'warning', contract: 'V03'}),
  ])});
  const mismatch = await request.post('/api/v1/validate', {data: {...args, catalogVersion: '2.4.0'}});
  expect(mismatch.status()).toBe(422);

  const schema = await (await request.get('/api/v1/schema?target=blueprint')).json();
  expect(schema.value.properties.catalogVersion.enum).toContain('2.5.0');
  const openapi = await (await request.get('/api/v1/openapi.json')).json();
  expect(openapi['x-catalogVersion']).toBe('2.4.0');

  const client = new Client({name: 'web-version-test', version: '1.0.0'});
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('/api/mcp', baseURL)));
    const validated = await client.callTool({name: 'validate_blueprint', arguments: args});
    expect(validated.isError).toBe(false);
    expect(validated.structuredContent).toEqual(restResult);
    const include = ['html', 'manifest'];
    const rest = await request.post('/api/v1/compile', {data: {...args, include}});
    expect(rest.status()).toBe(200);
    const compiled = await client.callTool({name: 'compile_design', arguments: {...args, include, html: 'full'}});
    expect(compiled.structuredContent).toEqual(await rest.json());
    const {tools} = await client.listTools();
    const validate = tools.find(tool => tool.name === 'validate_blueprint');
    const expected = {severity: {enum: ['info', 'warning']}, contract: {type: 'string'}};
    expect(validate.outputSchema.properties.warnings.items.properties).toMatchObject(expected);
  } finally {
    await client.close();
  }
});
