import express, { Request, Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { scheduleJob } from '../services/at';

const router = express.Router();

export type CountdownMetadata = {
  title: string;
  emoji: string;
  color: string;
};

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
    z.object({
      id: z.number(),
      title: z.string(),
      date: z.date(),
      time: z.date().optional(),
      emoji: z.string(),
      color: z.string(),
    }).parse(countdown);
    return true;
  } catch (error) {
    return false;
  }
}

router.post('/', async (req: Request, res: Response) => {
  // Create a new countdown
  const token = req.headers.authorization!;

  const isValidCountdown = validateCountdown(req.body.countdown);
  if (!isValidCountdown) {
    return res.status(400).json({ error: "Invalid countdown" });
  }
  const countdown = req.body.countdown as Countdown;

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const expiresAt = new Date(countdown.date.getTime() + (countdown.time ? countdown.time.getTime() : 0));

  const newCountdown = await prisma.countdown.create({
    data: {
      deviceId: device.id,
      uuid: countdown.id.toString(),
      expiresAt,
      metadata: {
        title: countdown.title,
        emoji: countdown.emoji,
        color: countdown.color,
      }
    }
  });

  // Now that countdown is created, schedule a job to send a notification when it expires
  const jobNumber = await scheduleJob('notify', newCountdown.id.toString(), newCountdown.expiresAt.getTime());
  console.log('Notification job scheduled:', jobNumber);

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
