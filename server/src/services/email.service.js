import nodemailer from 'nodemailer';

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });
}

export async function sendJobNotification(user, job) {
  const transport = getTransport();
  if (!transport || !user.email) return;
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: `New matched job: ${job.role} at ${job.company}`,
    text: `${job.company} is hiring for ${job.role}.\nApply: ${job.applyLink}`
  });
}
