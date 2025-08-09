import { log } from "./log.mjs";
import { db } from "./db.mjs";
import { sendMailout } from "./mail.mjs";

/**
 * Express middleware that checks the Authorization header for a matching password
 * in process.env.ADMIN_PASSWORD
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
export function adminAuthMiddleware(req, res, next) {
  console.log(req.headers);
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no admin password is configured, deny access
  if (!adminPassword) {
    log("Admin password not configured");
    return res.status(401).json({ error: "Admin password not configured" });
  }

  // If no Authorization header is provided, deny access
  if (!authHeader || authHeader !== adminPassword) {
    log("No Authorization header provided");
    return res.status(401).json({ error: "Authorization header required" });
  }

  // If we get here, the password is valid
  next();
}

/**
 * Admin route to get database content
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export function adminGetDb(req, res) {
  res.send(db);
}

/**
 * Admin route to send a test email to a subscriber
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export async function adminSendTestEmail(req, res) {
  const { email } = req.params;

  const subscriber = db.subscribers.find((sub) => sub.email === email);

  if (!subscriber) {
    return res.status(404).send({ error: "Subscriber not found" });
  }

  try {
    await sendMailout({
      subscribers: [subscriber],
      newPosts: [{ link: "https://example.org/", title: "Test email" }],
    });

    res.send({ status: "ok", message: "Test email sent successfully" });
  } catch (error) {
    log("Error sending test email:", error);
    res.status(500).send({ error: "Failed to send test email" });
  }
}
