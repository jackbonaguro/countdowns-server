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
