import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

import prisma from '../prisma';
import { sendTestNotification } from '../utils/notify';
import countdownRouter from './countdown';
// Register middleware, will create a device object if needed for all requests from mobile apps
const registerMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const device = await prisma.device.findFirst({
    where: {
      token: token
    }
  });
  if (!device) {
    console.log("Creating new device with token", token);
    const newDevice = await prisma.device.create({
      data: {
        token: token
      }
    });
  }

  next();
};
router.use(registerMiddleware);

router.get('/', (req, res) => {
  // Do nothing. This endpoint just exists to allow devices to register via the middleware
  res.json({ message: 'Welcome to the API' });
});

router.get('/test_notify', async (req, res) => {
  const token = req.headers.authorization!;
  sendTestNotification(token);
  res.json({ message: `Test notification sent to device ${token}` });
});

router.use('/countdown', countdownRouter);

export default router;
