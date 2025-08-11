import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Mailgun from "mailgun.js";
import formData from "form-data";
import { log } from "./log.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure nunjucks with the templates directory
nunjucks.configure(path.join(__dirname, "./templates"), { autoescape: true });

export function sendLog(message) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    log("ADMIN_EMAIL not configured, skipping log email");
    return;
  }

  const payload = {
    subscriber: { email: adminEmail },
    emailHtml: `<p>${message}</p>`,
    emailText: message,
    subject: "Mailer message",
  };

  sendToMailgun([payload]);
}

export function sendWelcomeMail(subscriber) {
  const emailTitle = process.env.WELCOME_TITLE || "Thanks for subscribing";
  const emailContent =
    process.env.WELCOME_TEXT ||
    `You'll an email whenever there' i's a new post`;
  const templateData = {
    faviconUrl: process.env.FAVICON_URL,
    emailTitle,
    content: `<p>${emailContent}</p>`,
    subscriber: subscriber,
    unsubscribeUrl: `${
      process.env.BASE_URL || "http://localhost:3001"
    }/unsubscribe/${subscriber.email}`,
  };

  const emailHtml = nunjucks.render("mailTemplateHtml.njk", templateData);
  const emailText = [emailTitle, emailContent].join("\n\n");

  log("Sending welcome email to", subscriber.email);

  sendToMailgun([
    {
      subscriber,
      emailHtml,
      emailText,
      subject: emailTitle,
    },
  ]);
}

export function sendMailout({ subscribers, newPosts }) {
  const mailoutsToSend = [];

  for (const subscriber of subscribers) {
    const templateData = {
      faviconUrl: process.env.FAVICON_URL,
      emailTitle: process.env.NEW_POST_TEXT || "There's a new post",
      content: nunjucks.render("newPosts.njk", { posts: newPosts }),
      subscriber: subscriber,
      unsubscribeUrl: `${
        process.env.BASE_URL || "http://localhost:3001"
      }/unsubscribe/${subscriber.email}`,
    };
    // Render personalized email template for this subscriber
    const emailHtml = nunjucks.render("mailTemplateHtml.njk", templateData);
    const emailText = nunjucks.renderString(
      "mailTemplatePlaintext.njk",
      templateData
    );

    // Add to mailouts to send
    mailoutsToSend.push({
      subscriber: subscriber,
      emailHtml,
      emailText,
      subject: newPosts[0].title || "Untitled",
    });
  }

  sendToMailgun(mailoutsToSend);
}

export async function sendToMailgun(mailoutsToSend) {
  const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
  const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
  const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL;

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: "api",
    key: MAILGUN_API_KEY || "-",
    url: "https://api.eu.mailgun.net",
  });

  const messages = mailoutsToSend.map(
    ({ subscriber, emailHtml, emailText, subject }) => {
      const payload = {
        from: MAILGUN_FROM_EMAIL,
        to: [subscriber.email],
        subject: subject,
        text: emailText,
        html: emailHtml,
      };
      if (!MAILGUN_API_KEY) {
        log(payload);
        return false;
      }
      return mg.messages
        .create(MAILGUN_DOMAIN, payload)
        .then(() => log("sent:", subject, subscriber.email))
        .catch((err) => log("error sending:", subscriber.email, err.message));
    }
  );

  await Promise.all(messages);
}
