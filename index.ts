import express, { Request, Response } from "express";
import * as firebase from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import prisma from "./prisma";
import appRouter from "./routers/app";
import { sendTestNotification } from "./utils/notify";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { scheduleJob } from "./services/at";

firebase.initializeApp({
  credential: firebase.applicationDefault(),
});

// Create a new express application instance
const app = express();
app.use(express.json());

// Set the network port
const port = process.env.PORT || 3000;

// Define the root path with a greeting message
app.get("/status", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/test_notify_all", async (req: Request, res: Response) => {
  const devices = await prisma.device.findMany();
  for (const device of devices) {
    await sendTestNotification(device.token);
  }

  res.json({ message: `Test notification sent to all devices` });
});

app.get('/test_crash', async (req: Request, res: Response) => {
  throw new Error('Test crash');
});

app.get('/test_job', async (req: Request, res: Response) => {
  const date = new Date(Date.now() + 60000); // 1 minute from now

  const jobNumber = await scheduleJob('test', 'test_job', date.getTime());

  console.log('Job scheduled:', jobNumber);
  res.json({ message: 'Job scheduled' });
});

app.use('/app', appRouter);

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});
process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});
