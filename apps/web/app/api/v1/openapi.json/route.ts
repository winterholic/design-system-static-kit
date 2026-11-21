import {cachedJsonResponse} from '@/lib/api/http.mjs';
import {buildOpenApi} from '@/lib/api/openapi.mjs';

export const dynamic = 'force-dynamic';

export const GET = (request: Request) => cachedJsonResponse(buildOpenApi(), request);
