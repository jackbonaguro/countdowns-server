import express, { NextFunction, Request, Response } from 'express';
const router = express.Router();

import prisma from './prisma';

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
  res.json({ message: 'Welcome to the API' });
});

export default router;
