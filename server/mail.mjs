import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Mailgun from "mailgun.js";
import formData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the template file
const templateHtml = fs.readFileSync(
  path.join(__dirname, "mailTemplateHtml.njk"),
  "utf8"
);
const templatePlaintext = fs.readFileSync(
  path.join(__dirname, "mailTemplatePlaintext.njk"),
  "utf8"
);

export function sendMailout({ subscribers, newPosts }) {
  const mailoutsToSend = [];

  for (const subscriber of subscribers) {
    // Generate personalized unsubscribe URL
    const unsubscribeUrl = `${
      process.env.BASE_URL || "http://localhost:3001"
    }/unsubscribe/${subscriber.email}`;

    const newPostText = process.env.NEW_POST_TEXT || "There's a new post";

    const templateData = {
      posts: newPosts,
      subscriber: subscriber,
      unsubscribeUrl: unsubscribeUrl,
      newPostText,
      faviconUrl: process.env.FAVICON_URL,
    };
    // Render personalized email template for this subscriber
    const emailHtml = nunjucks.renderString(templateHtml, templateData);
    const emailText = nunjucks.renderString(templatePlaintext, templateData);

    // Add to mailouts to send
    mailoutsToSend.push({
      subscriber: subscriber,
      emailHtml,
      emailText,
      subject: newPostText,
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
        console.log(payload);
        return false;
      }
      return mg.messages
        .create(MAILGUN_DOMAIN, payload)
        .then(() => console.log("sent:", subscriber.email))
        .catch((err) =>
          console.error("error sending:", subscriber.email, err.message)
        );
    }
  );

  await Promise.all(messages);
}
