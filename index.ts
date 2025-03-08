import express, { Request, Response } from "express";
import * as firebase from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaClient } from '@prisma/client'

const firebaseApp = firebase.initializeApp({
  credential: firebase.applicationDefault(),
});

const prisma = new PrismaClient();
// Create a new express application instance
const app = express();

// Set the network port
const port = process.env.PORT || 3000;

// Define the root path with a greeting message
app.get("/status", (req: Request, res: Response) => {
    res.json({ status: "ok" });
});

app.get("/register", async (req: Request, res: Response) => {
  // Log request headers
  console.log(req.headers);

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
    // Create a new device
    console.log("Creating new device with token", token);
    const newDevice = await prisma.device.create({
      data: {
        token: token
      }
    });
  } else {
    console.log("Device already exists with token", token);
  }

  res.json({ message: "Device registered" });
});

app.get("/testNotification", async (req: Request, res: Response) => {
  const message = {
    data: {
      title: 'Test Notification',
      name: 'A',
      description: 'B',
      body: 'C',
      data: 'D',
    },
    notification: {
      title: 'Countdown "Nora\'s Birthday" is 1 day away!',
      // body: 'E',
    },
    token: process.env.DEVICE_TOKEN!
  };

  getMessaging().send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });

  res.json({ message: 'Notification sent' });
});

// Start the Express server
app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});
