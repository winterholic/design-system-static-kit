import {expect, test} from '@playwright/test';
import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const tools = ['list_design_system', 'get_design_schema', 'get_component_spec', 'validate_blueprint', 'compile_design', 'explain_design_decisions'];

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
