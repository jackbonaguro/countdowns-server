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

const DEVICE_TOKEN_1 = 'fvgVYCa6QLmRQKA3FACWNm:APA91bEU9L83mAmrxVK6nkjHBEY6A1WNbu_mgbaTJzy-Vua4XSn9lIVoSlh46WFPm7P51uiR_T6RTpVRntllwBo2W7r9Qifn_rwKGZOQD-9HExXqmukb5H0';
const DEVICE_TOKEN_2 = 'enCq4RNYcUsFgA3hpqd79D:APA91bG_Dv-JnA9LiTh6xIvIi66UjHOSkCynECACJK_9sGeGasiTtFb6oTFvU3ujyeinwpjkdeGQDfvKRYix9Qz2c3eS1Aj1iiFrpTO2wUFW2pbIV1oMoeo';
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
    token: DEVICE_TOKEN_2
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
