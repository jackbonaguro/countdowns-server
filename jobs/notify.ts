import * as firebase from 'firebase-admin/app';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prisma';
import { sendReminderNotification, sendTestNotification } from '../utils/notify';
import { UTCDate } from '@date-fns/utc';

const ref = process.argv && process.argv.length > 2 && process.argv[2];
if (!ref) {
  process.exit(1);
}
const outfile = path.join(dirname(fileURLToPath(import.meta.url)), `notification.${ref}.log`);

try {
  const workingDir = process.cwd();
  fs.appendFileSync(outfile, `test invoked with ref: "${ref}" in working dir: "${workingDir}"\n`);

  firebase.initializeApp({
    credential: firebase.applicationDefault(),
  });

  const notification = await prisma.notification.findFirst({
    where: {
      jobNumber: parseInt(ref),
    }
  });
  fs.appendFileSync(outfile, `found notification: ${JSON.stringify(notification, null, 2)}`);

  const countdown = await prisma.countdown.findFirst({
    where: {
      id: notification?.countdownId,
    }
  });
  fs.appendFileSync(outfile, `found countdown: ${JSON.stringify(countdown, null, 2)}`);

  const device = await prisma.device.findFirst({
    where: {
      id: countdown?.deviceId,
    }
  });
  fs.appendFileSync(outfile, `found device: ${JSON.stringify(device, null, 2)}`);

  // Got all required data, now send the notification!
  if (countdown && device) {
    await sendReminderNotification(device.token, countdown);
    await sendTestNotification(device.token);

    // Now clean up the notification
    await prisma.notification.updateMany({
      where: {
        jobNumber: parseInt(ref),
      },
      data: {
        did_attempt: true,
        did_succeed: true,
        attemptedAt: new UTCDate(),
      }
    });
  }

} catch (err) {
  fs.appendFileSync(outfile, `error in notification job: ${err}`);
}
