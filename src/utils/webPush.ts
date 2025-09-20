// webpush.ts
import webpush from "web-push";
import { prisma } from "./prismaClient.ts";

webpush.setVapidDetails(
  "mailto:ashlesh.prabhu5@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default webpush;

// Add this missing function
export const sendUserPushNotification = async (
  userId: string,
  payload: { title: string; message: string; url?: string },
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true },
    });

    if (!user?.pushSubscription) {
      console.log(`No push subscription found for user ${userId}`);
      return;
    }

    // Handle different types that Prisma JSON field can return
    let subscriptionString: string;
    if (typeof user.pushSubscription === "string") {
      subscriptionString = user.pushSubscription;
    } else {
      subscriptionString = JSON.stringify(user.pushSubscription);
    }

    // Parse the subscription
    const subscription = JSON.parse(subscriptionString);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
    });

    await webpush.sendNotification(subscription, notificationPayload);
    console.log(`Push notification sent to user ${userId}`);
  } catch (error: any) {
    console.error(`Failed to send push notification to user ${userId}:`, error);

    // If subscription is invalid, remove it from database
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscription: undefined },
      });
      console.log(`Removed invalid push subscription for user ${userId}`);
    }
  }
};
