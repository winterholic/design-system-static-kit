import {CATALOG_VERSION,BLUEPRINT_VERSION,rules} from './catalog.mjs';
import {validateBlueprint} from './validate.mjs';
import {resolveTokens,contrast} from './tokens.mjs';
import {stylesheet} from './styles.mjs';
import {renderTree,escapeHTML,formRuntime} from './render.mjs';
export {validateBlueprint,resolveTokens,contrast};
export function compile(input){
  const result=validateBlueprint(input);
  if(!result.valid){const error=new Error('Invalid blueprint:\n'+result.errors.map(x=>`${x.path} [${x.code}] ${x.message}`).join('\n'));error.errors=result.errors;throw error;}
  const b=structuredClone(input);
  const {tokens,report,provenance}=resolveTokens(b);
  if(report.some(x=>x.ratio<x.minimum))throw new Error('Contrast gate failed');
  const css=stylesheet(b,tokens);
  const csp="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'";
  const html=`<!doctype html>\n<html lang="ko" data-theme="${b.mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="generator" content="Static Kit ${CATALOG_VERSION}"><title>${escapeHTML(b.name)}</title><style>\n${css}</style></head><body>${renderTree(b)}<script>${formRuntime}</script></body></html>\n`;
  const manifest={blueprintVersion:BLUEPRINT_VERSION,catalogVersion:CATALOG_VERSION,theme:b.theme,palette:b.palette,mode:b.mode,axes:{shell:b.shell,typography:b.typography,density:b.density,radius:b.radius},rules:rules.map(x=>x.id),paletteProvenance:provenance,contrast:report,blueprint:b};
  return {html,css,tokens,manifest};
}
