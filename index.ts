import express, { Request, Response } from "express";
import * as firebase from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const firebaseApp = firebase.initializeApp({
  credential: firebase.applicationDefault(),
});

// Create a new express application instance
const app = express();

// Set the network port
const port = process.env.PORT || 3000;

// Define the root path with a greeting message
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to the Express + TypeScript Server!" });
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
