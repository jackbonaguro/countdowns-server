import { UTCDate } from "@date-fns/utc";
import { Countdown } from "@prisma/client";
import { formatDistance } from "date-fns";
import { getMessaging } from "firebase-admin/messaging";

const TEST_NOTIFICATION_DATA = {
  title: 'Test Notification',
  name: 'A',
  description: 'B',
  body: 'C',
  data: 'D',
};
  
const TEST_NOTIFICATION_METADATA = {
  title: 'Test Notification!',
  // body: 'E',
};

export const sendTestNotification = async (token: string) => {
  const message = {
    data: TEST_NOTIFICATION_DATA,
    notification: TEST_NOTIFICATION_METADATA,
    token,
  };
  
  try {
    const response = await getMessaging().send(message);

    // Response is a message ID string.
    console.log('Successfully sent message:', response);
  } catch (error) {
      console.log('Error sending message:', error);
  }
}

export const sendReminderNotification = async (
  token: string,
  countdown: Countdown,
) => {
  const dateStr = formatDistance(
    countdown.expiresAt,
    new UTCDate(),
  );
  const metadata = countdown.metadata as {
    title: string;
    emoji: string;
    color: string;
  };

  const message = {
    data: {
      title: `Countdown "${metadata.title}" expires in ${dateStr}`,
      name: '',
      description: '',
      body: JSON.stringify({
        countdownId: countdown.uuid,
      }),
      data: JSON.stringify({
        countdownId: countdown.uuid,
      }),
    },
    notification: {
      title: `Countdown "${metadata.title}" expires in ${dateStr}`,
      body: JSON.stringify({
        countdownId: countdown.uuid,
      }),
    },
    token,
  };
  
  try {
    const response = await getMessaging().send(message);

    // Response is a message ID string.
    console.log('Successfully sent message:', response);
  } catch (error) {
      console.log('Error sending message:', error);
  }
}
