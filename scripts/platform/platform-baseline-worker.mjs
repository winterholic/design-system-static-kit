import {parentPort, workerData} from 'node:worker_threads';
import {platformSection} from './platform-baseline.mjs';

try {
  const result = platformSection({
    only: [workerData.pattern], verifiedShard: workerData.verifiedShard,
    verifiedSamplePlanByPattern: {[workerData.pattern]: workerData.verifiedSamplePlan}, includeMergeDetails: true,
  });
  parentPort.postMessage(result);
  parentPort.close();
} catch (error) {
  throw error;
}
