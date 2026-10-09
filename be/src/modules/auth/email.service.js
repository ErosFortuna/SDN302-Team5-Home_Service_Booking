import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export function isEmailDeliveryConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPassword && env.smtpFrom);
}

export async function sendEmailVerificationCode(email, code) {
  if (!isEmailDeliveryConfigured()) {
    const error = new Error("Email delivery is not configured");
    error.statusCode = 503;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: "Your Home Service Booking verification code",
    text: `Your verification code is ${code}. It expires in 15 minutes. If you did not request this code, you can ignore this email.`,
  });
}