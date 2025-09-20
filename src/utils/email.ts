import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // true for port 465
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_PASSWORD,
  },
});
export default transporter;
