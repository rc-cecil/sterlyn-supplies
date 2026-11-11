import {deliverNotifications} from '../../src/lib/notification-delivery';
import {db} from '../../src/lib/db';

// Netlify scheduled functions cannot be invoked through their public URL.
// One bounded claim per minute keeps SMTP work inside the scheduled execution limit.
export default async function notifications() {
  if (process.env.STERLYN_CLIENT_PREVIEW === 'true') return;
  await deliverNotifications(undefined, {batchSize: 1, timeoutMs: 5000});
  await db.setting.upsert({
    where: {key: 'notificationHeartbeat'},
    create: {key: 'notificationHeartbeat', value: {at: new Date().toISOString(), runtime: 'netlify'}},
    update: {value: {at: new Date().toISOString(), runtime: 'netlify'}},
  });
}

export const config = {schedule: '* * * * *'};
