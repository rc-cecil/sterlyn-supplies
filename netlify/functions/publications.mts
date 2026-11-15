import {runSchedules} from '../../src/lib/scheduling';

// UTC: each minute. Existing transactions deduplicate overlapping invocations.
// Media stays with the isolated worker: its scanner can exceed this function's limit.
export default async function publications() {
  await runSchedules(1, false);
}

export const config = {schedule: '* * * * *'};
