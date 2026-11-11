import {afterEach,describe,expect,it,vi} from 'vitest';
const jobs=vi.hoisted(()=>({deliver:vi.fn(),publish:vi.fn(),heartbeat:vi.fn()}));
vi.mock('../src/lib/notification-delivery',()=>({deliverNotifications:jobs.deliver}));
vi.mock('../src/lib/scheduling',()=>({runSchedules:jobs.publish}));
vi.mock('../src/lib/db',()=>({db:{setting:{upsert:jobs.heartbeat}}}));
const notificationModule=await import('../netlify/functions/notifications.mjs');
const publicationModule=await import('../netlify/functions/publications.mjs');
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('Netlify scheduled operations',()=>{
 it('does no business work in read-only preview mode',async()=>{
  vi.stubEnv('STERLYN_CLIENT_PREVIEW','true');
  await notificationModule.default();await publicationModule.default();
  expect(jobs.deliver).not.toHaveBeenCalled();expect(jobs.publish).not.toHaveBeenCalled();expect(jobs.heartbeat).not.toHaveBeenCalled();
 });
 it('runs bounded queue work and catalogue publication without claiming media readiness',async()=>{
  vi.stubEnv('STERLYN_CLIENT_PREVIEW','false');
  await notificationModule.default();await publicationModule.default();
  expect(jobs.deliver).toHaveBeenCalledWith(undefined,{batchSize:1,timeoutMs:5000});
  expect(jobs.publish).toHaveBeenCalledWith(1,false);
  expect(jobs.heartbeat).toHaveBeenCalledWith(expect.objectContaining({where:{key:'notificationHeartbeat'}}));
  expect(notificationModule.config.schedule).toBe('* * * * *');expect(publicationModule.config.schedule).toBe('* * * * *');
 });
 it('propagates queue failure instead of recording a healthy heartbeat',async()=>{
  vi.stubEnv('STERLYN_CLIENT_PREVIEW','false');jobs.deliver.mockRejectedValueOnce(new Error('Synthetic database failure'));
  await expect(notificationModule.default()).rejects.toThrow('Synthetic database failure');
  expect(jobs.heartbeat).not.toHaveBeenCalled();
 });
});
