import { Request, Response } from "express";
import axios from "axios";

const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "phone number is required",
        success: false,
      });
    }

    // Validate phone number format for multiple countries
    const validatePhoneNumber = (phone: string): boolean => {
      // Remove any spaces, dashes, or brackets
      const cleanPhone = phone.replace(/[\s\-()]/g, "");

      // Check for international format with + and country code
      const internationalRegex = /^\+\d{1,4}\d{6,14}$/;

      // Specific patterns for common countries
      const patterns = {
        india: /^\+91[6-9]\d{9}$/, // India: +91XXXXXXXXXX
        usa: /^\+1[2-9]\d{9}$/, // USA: +1XXXXXXXXXX
        uk: /^\+44[1-9]\d{8,9}$/, // UK: +44XXXXXXXXX
        canada: /^\+1[2-9]\d{9}$/, // Canada: +1XXXXXXXXXX
        australia: /^\+61[2-9]\d{8}$/, // Australia: +61XXXXXXXXX
        germany: /^\+49[1-9]\d{6,11}$/, // Germany: +49XXXXXXXXXXX
        france: /^\+33[1-9]\d{8}$/, // France: +33XXXXXXXXX
        japan: /^\+81[1-9]\d{8,9}$/, // Japan: +81XXXXXXXXXX
        brazil: /^\+55[1-9]\d{8,10}$/, // Brazil: +55XXXXXXXXXXX
        china: /^\+86[1-9]\d{9,10}$/, // China: +86XXXXXXXXXXX
      };

      // Check against specific patterns first
      for (const pattern of Object.values(patterns)) {
        if (pattern.test(cleanPhone)) {
          return true;
        }
      }

      // Fallback to general international format
      return internationalRegex.test(cleanPhone);
    };

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone number format. Use international format: +[country_code][number]",
        success: false,
        examples: [
          "+917676130360 (India)",
          "+12125551234 (USA/Canada)",
          "+447911123456 (UK)",
          "+61412345678 (Australia)",
        ],
      });
    }

    console.log(phone);
    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        message: "API key not configured",
        success: false,
      });
    }

    // Option 1: Standard AUTOGEN with template (recommended for SMS)
    const apiUrl = `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN/`;

    // Option 2: AUTOGEN2 - includes OTP in response (for testing)
    // apiUrl = `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN2/OTP1`

    console.log("Using API URL:", apiUrl);
    const response = await axios.get(apiUrl);
    console.log(response.data);

    // Check the correct response structure from 2Factor API
    if (response.data.Status !== "Success") {
      return res.status(400).json({
        message: "Failed to send OTP. Please check phone number.",
        success: false,
        error: response.data,
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
      sessionId: response.data.Details,
    });
  } catch (error: any) {
    console.log("send otp error", error);

    // Handle specific axios errors
    if (error.response) {
      return res.status(error.response.status).json({
        message: "Failed to send OTP",
        success: false,
        error: error.response.data,
      });
    }

    return res.status(500).json({
      message: "Internal server error while sending otp",
      success: false,
    });
  }
};

const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({
        message: "sessionId and otp are required",
        success: false,
      });
    }

    const API_KEY = process.env.TWO_FACTOR_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        message: "API key not configured",
        success: false,
      });
    }

    console.log(`Verifying OTP: ${otp} for session: ${sessionId}`);

    // Add retry logic for 503 errors
    let attempts = 0;
    const maxAttempts = 3;
    let response;

    while (attempts < maxAttempts) {
      try {
        response = await axios.get(
          `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`,
          {
            timeout: 10000, // 10 second timeout
            headers: {
              Accept: "application/json",
            },
          },
        );
        break; // Success, exit retry loop
      } catch (error: any) {
        attempts++;
        console.log(`Attempt ${attempts} failed:`, error.response?.status);

        if (error.response?.status === 503 && attempts < maxAttempts) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
          continue;
        } else {
          throw error; // Re-throw if not 503 or max attempts reached
        }
      }
    }

    console.log("Verify response:", response?.data);

    // Check the response structure
    if (response?.data?.Status !== "Success") {
      return res.status(400).json({
        message: "Invalid OTP or OTP expired",
        success: false,
        error: response?.data,
      });
    }

    return res.status(200).json({
      message: "OTP verified successfully",
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.log("verify otp error", error);

    // Handle specific error cases
    if (error.response?.status === 503) {
      return res.status(503).json({
        message:
          "OTP verification service is temporarily unavailable. Please try again in a few moments.",
        success: false,
        retryAfter: 30, // seconds
      });
    }

    if (error.response?.status === 400) {
      return res.status(400).json({
        message: "Invalid OTP or session expired",
        success: false,
      });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(408).json({
        message: "Request timeout. Please try again.",
        success: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error while verifying otp",
      success: false,
    });
  }
};

export { sendOTP, verifyOTP };
