import 'server-only';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

type CatalogIndex = {
  categories: {id: string; itemCount: number}[];
  materials: {id: string; kind: string; label: string}[];
};

// sync-static copies the canonical generated site index into public/ before Next starts or builds.
export function readCatalogIndex(): CatalogIndex {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'public/catalog-index.json'), 'utf8')) as CatalogIndex;
}
