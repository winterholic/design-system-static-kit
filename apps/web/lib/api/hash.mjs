import {createHash} from 'node:crypto';

/** compileBlueprint 의 opts.hash. CLI(scripts/output.mjs)와 같은 sha256 이라 manifest.integrity 가 채널마다 같다. */
export const sha256 = {algorithm: 'sha256', digest: text => createHash('sha256').update(text).digest('hex')};
export const hashText = text => sha256.digest(text);
