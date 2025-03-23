import express, { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { scheduleJob } from '../services/at';

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
const validateCountdown = (countdown: object): Boolean => {
  try {
    return !!z.object({
      id: z.number(),
      title: z.string(),
      date: z.date(),
      time: z.date().optional(),
      emoji: z.string(),
      color: z.string(),
    }).parse(countdown);
  } catch (error) {
    return false;
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
const validateReminder = (reminder: object): Boolean => {
  try {
    return !!z.union([
      z.object({
        period: z.nativeEnum(ReminderPeriod).refine(arg => (arg !== ReminderPeriod.CUSTOM))
      }),
      z.object({
        period: z.nativeEnum(ReminderPeriod).refine(arg => (arg === ReminderPeriod.CUSTOM)),
        customPeriod: z.number(),
      })
    ])
  } catch (error) {
    return false;
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
  const isValidCountdown = validateCountdown(req.body.countdown);
  if (!isValidCountdown) {
    return res.status(400).json({ error: "Invalid countdown" });
  }
  const countdown = req.body.countdown as Countdown;

  // Parse reminders data
  // Using some to find if any element fails validation, then flipping back to false
  const isValidReminders = Array.isArray(req.body.reminders) &&
    !req.body.reminders.some((r: any) => (!validateReminder(r)))
  if (!isValidReminders) {
    return res.status(400).json({ error: "Invalid reminders" });
  }
  const reminders = req.body.reminders as Reminder[];

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Similar to frontend
  const expiresAt = new Date(countdown.date.getTime() + (countdown.time ? countdown.time.getTime() : 0));

  const metadata: CountdownMetadata = {
    title: countdown.title,
    emoji: countdown.emoji,
    color: countdown.color,
  };
  const newCountdown = await prisma.countdown.create({
    data: {
      deviceId: device.id,
      uuid: countdown.id.toString(),
      expiresAt,
      metadata
    }
  });
  for (const reminder of reminders) {
    let offset: number;
    if (reminder.period === ReminderPeriod.CUSTOM) {
      offset = reminder.customPeriod;
    } else {
      offset = REMINDER_OFFSETS[reminder.period];
    }
    const notifyAt = new Date(newCountdown.expiresAt.getTime() - offset);

    // Schedule a job to send a notification when it expires
    const jobNumber = await scheduleJob('notify', newCountdown.id.toString(), newCountdown.expiresAt.getTime());

    // With countdown created and notification scheduled, create the row to track it
    const notification = await prisma.notification.create({
      data: {
        countdownId: newCountdown.id,
        notifyAt,
        jobNumber,
      }
    })
  }

  res.json({ countdown: newCountdown });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const token = req.headers.authorization!;
  const id = req.params.id;

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
      uuid: id
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

  // Cancel the job
  try {
    // TODO: store job number on new notifications schema in order to remove
  } catch (error) {
    console.error('Error cancelling job', error);
  }

  res.json({ message: "Countdown deleted" });
});
export default router;
