import express, { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { cancelJob, scheduleJob } from '../services/at';
import { UTCDate } from '@date-fns/utc';

const router = express.Router();

// Same as frontend
export type Countdown = {
  id: number;
  title: string;
  date: Date;
  time?: Date;
  emoji: string;
  color: string;
}
const validateCountdown = (countdown: object): Countdown | undefined => {
  try {
    return z.object({
      id: z.number(),
      title: z.string(),
      date: z.string().transform(str => new Date(str)),
      time: z.string().transform(str => new Date(str)).optional(),
      emoji: z.string(),
      color: z.string(),
    }).parse(countdown);
  } catch (error) {
    console.error('Error validating countdown', error);
    return;
  }
}

// Same as frontend
export enum ReminderPeriod {
  IMMEDIATE = 'immediate',
  ONE_MIN_BEFORE = '1_min_before',
  FIVE_MIN_BEFORE = '5_min_before',
  TEN_MIN_BEFORE = '10_min_before',
  FIFTEEN_MIN_BEFORE = '15_min_before',
  THIRTY_MIN_BEFORE = '30_min_before',
  ONE_HR_BEFORE = '1_hr_before',
  TWO_HR_BEFORE = '2_hr_before',
  ONE_DAY_BEFORE = '1_day_before',
  CUSTOM = 'custom'
};
export type Reminder = {
  period: Exclude<ReminderPeriod, ReminderPeriod.CUSTOM>
} | {
  period: ReminderPeriod.CUSTOM,
  customPeriod: number
};
const validateReminder = (reminder: object): Reminder | undefined => {
  try {
    const isValid = !!z.union([
      z.object({
        period: z.nativeEnum(ReminderPeriod).refine(arg => (arg !== ReminderPeriod.CUSTOM))
      }),
      z.object({
        period: z.nativeEnum(ReminderPeriod).refine(arg => (arg === ReminderPeriod.CUSTOM)),
        customPeriod: z.number(),
      })
    ]);
    if (isValid) return reminder as unknown as Reminder;
  } catch (error) {
    return;
  }
}

// Unstructured "metadata" JSON field type
export type CountdownMetadata = {
  title: string;
  emoji: string;
  color: string;
};

// Map of reminder periods to offsets
export const REMINDER_OFFSETS: Record<Exclude<ReminderPeriod, ReminderPeriod.CUSTOM>, number> = {
  [ReminderPeriod.IMMEDIATE]: 0,
  [ReminderPeriod.ONE_MIN_BEFORE]: 60_000,
  [ReminderPeriod.FIVE_MIN_BEFORE]: 300_000,
  [ReminderPeriod.TEN_MIN_BEFORE]: 600_000,
  [ReminderPeriod.FIFTEEN_MIN_BEFORE]: 900_000,
  [ReminderPeriod.THIRTY_MIN_BEFORE]: 1800_000,
  [ReminderPeriod.ONE_HR_BEFORE]: 60 * 60_000,
  [ReminderPeriod.TWO_HR_BEFORE]: 120 * 60_000,
  [ReminderPeriod.ONE_DAY_BEFORE]: 24 * 60 * 60_000,
}

router.post('/', async (req: Request, res: Response) => {
  // Create a new countdown
  const token = req.headers.authorization!;

  // Parse countdown data
  const validCountdown = validateCountdown(req.body.countdown);
  if (!validCountdown) {
    return res.status(400).json({ error: "Invalid countdown" });
  }

  // Parse reminders data
  // Using some to find if any element fails validation, then flipping back to false
  const validReminders: undefined | (Reminder | undefined)[] = Array.isArray(req.body.reminders) &&
    req.body.reminders.map((r: any) => (validateReminder(r)));

  if (!validReminders || validReminders.some(r => !r)) {
    return res.status(400).json({ error: "Invalid reminders" });
  }

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Similar to frontend
  const expiresAt = new Date(validCountdown.date.getTime() + (validCountdown.time ? validCountdown.time.getTime() : 0));

  const metadata: CountdownMetadata = {
    title: validCountdown.title,
    emoji: validCountdown.emoji,
    color: validCountdown.color,
  };
  const newCountdown = await prisma.countdown.create({
    data: {
      deviceId: device.id,
      uuid: validCountdown.id.toString(),
      expiresAt,
      metadata
    }
  });
  for (const reminder of validReminders as Reminder[]) {
    let offset: number;
    console.log('reminder', reminder);
    if (reminder.period === ReminderPeriod.CUSTOM) {
      offset = reminder.customPeriod;
    } else {
      offset = REMINDER_OFFSETS[reminder.period];
    }
    const notifyAt = new UTCDate(newCountdown.expiresAt.getTime() - offset);

    console.log('notifyAt', notifyAt, newCountdown.expiresAt, offset);

    // Schedule a job to send a notification when it expires
    const randomId = Math.floor(Math.random() * 1e8);
    const jobNumber = await scheduleJob('notify', randomId.toString(), newCountdown.expiresAt.getTime());

    // With countdown created and notification scheduled, create the row to track it
    await prisma.notification.create({
      data: {
        countdownId: newCountdown.id,
        notifyAt,
        jobNumber: randomId,
      }
    })
  }

  res.json({ countdown: newCountdown });
});

router.delete('/:uuid', async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const uuid = req.params.uuid;

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const countdown = await prisma.countdown.findFirst({
    where: {
      uuid,
    }
  });
  if (!countdown) {
    return res.status(404).json({ error: "Countdown not found" });
  }
  if (countdown.deviceId !== device.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await prisma.countdown.delete({
    where: { id: countdown.id }
  });

  // Cancel related notification jobs that haven't executed yet
  const notifications = await prisma.notification.findMany({
    where: {
      countdownId: countdown.id,
      jobNumber: { not: null },
      notifyAt: { gt: new UTCDate() }
    }
  });
  for (const notification of notifications) {
    if (notification.jobNumber) await cancelJob(notification.jobNumber);
  }

  res.json({ message: "Countdown deleted" });
});

router.get('/:uuid', async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const uuid = req.params.uuid;

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const countdown = await prisma.countdown.findFirst({
    where: {
      uuid,
    }
  });
  if (!countdown) {
    return res.status(404).json({ error: "Countdown not found" });
  }
  if (countdown.deviceId !== device.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json(countdown);
});

export default router;
