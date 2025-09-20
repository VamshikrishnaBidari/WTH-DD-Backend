import { prisma } from "./prismaClient";
import webpush from "./webPush";

const sendUserPushNotification = async (userId: string, payload: any) => {
  try {
    if (!userId || !payload) {
      throw new Error("Invalid input");
    }
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        pushSubscription: true,
      },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.pushSubscription) {
      throw new Error("User does not have a push subscription");
    }
    // Parse the stored pushSubscription to match the expected type
    const pushSubscription: import("web-push").PushSubscription =
      typeof user.pushSubscription === "string"
        ? JSON.parse(user.pushSubscription)
        : user.pushSubscription;
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
  } catch {
    throw new Error("Error sending push notification");
  }
};
export default sendUserPushNotification;
