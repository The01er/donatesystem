import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import prisma from '../plugins/prisma.js';

async function getPlatformName(): Promise<string> {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { brandName: true } });
    return settings?.brandName || 'DonatePlatform';
  } catch {
    return 'DonatePlatform';
  }
}

async function getPlatformUrl(): Promise<string> {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { platformUrl: true } });
    return settings?.platformUrl || process.env.BASE_URL || 'http://localhost:3000';
  } catch {
    return process.env.BASE_URL || 'http://localhost:3000';
  }
}

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[email] Ethereal test account:', testAccount.user);
    console.log('[email] Preview URL: https://ethereal.email/login');
  }

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = await getTransporter();
  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@donateplatform.com',
      to,
      subject,
      html,
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('[email] Preview:', previewUrl);
      }
    }
  } catch (err) {
    transporter = null;
    throw err;
  }
}

export async function sendVerificationEmail(user: { email: string }, token: string): Promise<void> {
  const [name, baseUrl] = await Promise.all([getPlatformName(), getPlatformUrl()]);
  const url = `${baseUrl}/api/auth/verify-email?token=${token}`;
  await sendEmail(
    user.email,
    `Подтверждение email — ${name}`,
    `
      <h2>Добро пожаловать в ${name}!</h2>
      <p>Для подтверждения вашего email перейдите по ссылке:</p>
      <p><a href="${url}">${url}</a></p>
      <p>Ссылка действительна в течение 24 часов.</p>
      <br>
      <p>Если вы не регистрировались на ${name}, проигнорируйте это письмо.</p>
    `,
  );
}

export async function sendPasswordResetEmail(user: { email: string }, token: string): Promise<void> {
  const [name, baseUrl] = await Promise.all([getPlatformName(), getPlatformUrl()]);
  const url = `${baseUrl}/reset-password?token=${token}`;
  await sendEmail(
    user.email,
    `Сброс пароля — ${name}`,
    `
      <h2>Сброс пароля</h2>
      <p>Для сброса пароля перейдите по ссылке:</p>
      <p><a href="${url}">${url}</a></p>
      <p>Ссылка действительна в течение 1 часа.</p>
      <br>
      <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
    `,
  );
}
