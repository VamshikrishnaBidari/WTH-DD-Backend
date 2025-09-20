import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient.ts";

// Define allowed types
// type UserType = "STUDENT" | "TEACHER";

const addMessage = async (req: Request, res: Response) => {
  try {
    const { message, senderId, receiverId, senderType, receiverType } =
      req.body;

    // Validate required fields
    if (!message || !senderId || !receiverId || !senderType || !receiverType) {
      return res
        .status(400)
        .json({ message: "Missing required fields", success: false });
    }

    // Validate senderType & receiverType
    if (
      !["STUDENT", "TEACHER"].includes(senderType) ||
      !["STUDENT", "TEACHER"].includes(receiverType)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid sender or receiver type", success: false });
    }

    // Check sender existence
    const sender =
      senderType === "STUDENT"
        ? await prisma.user.findUnique({ where: { id: senderId } })
        : await prisma.teacher.findUnique({ where: { id: senderId } });

    if (!sender) {
      return res
        .status(400)
        .json({ message: "Sender not found", success: false });
    }

    // Check receiver existence
    const receiver =
      receiverType === "STUDENT"
        ? await prisma.user.findUnique({ where: { id: receiverId } })
        : await prisma.teacher.findUnique({ where: { id: receiverId } });

    if (!receiver) {
      return res
        .status(400)
        .json({ message: "Receiver not found", success: false });
    }

    // Create message
    const chat = await prisma.chat.create({
      data: { senderId, receiverId, senderType, receiverType, message },
    });

    return res
      .status(201)
      .json({ message: "Message added successfully", success: true, chat });
  } catch (error) {
    console.error("Error adding message:", error);
    return res
      .status(500)
      .json({ message: "Failed to add message", success: false });
  }
};

const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id, message } = req.body;

    if (!id || !message) {
      return res
        .status(400)
        .json({ message: "Missing required fields", success: false });
    }

    // Update chat
    const chat = await prisma.chat.update({
      where: { id },
      data: { message },
    });

    return res
      .status(200)
      .json({ message: "Message updated successfully", success: true, chat });
  } catch {
    return res
      .status(500)
      .json({ message: "Failed to update message", success: false });
  }
};

const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing required fields", success: false });
    }

    // Delete chat
    const chat = await prisma.chat.delete({ where: { id } });

    return res
      .status(200)
      .json({ message: "Message deleted successfully", success: true, chat });
  } catch {
    return res
      .status(500)
      .json({ message: "Failed to delete message", success: false });
  }
};

const getMsgsOfChat = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, senderType, receiverType } = req.body;

    if (!senderId || !receiverId || !senderType || !receiverType) {
      return res
        .status(400)
        .json({ message: "Missing required fields", success: false });
    }

    // Fetch messages in both sender-receiver orders
    const chat = await prisma.chat.findMany({
      where: {
        OR: [
          { senderId, receiverId, senderType, receiverType },
          {
            senderId: receiverId,
            receiverId: senderId,
            senderType: receiverType,
            receiverType: senderType,
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    return res
      .status(200)
      .json({ message: "Messages fetched successfully", success: true, chat });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch messages",
      success: false,
      error: error,
    });
  }
};

export { addMessage, updateMessage, deleteMessage, getMsgsOfChat };
