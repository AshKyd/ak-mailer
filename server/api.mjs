import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db, syncDatabase } from "./db.mjs";
import { sendMailout, sendWelcomeMail } from "./mail.mjs";
import { log } from "./log.mjs";
import {
  adminAuthMiddleware,
  adminGetDb,
  adminSendTestEmail,
} from "./api.admin.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Heartbeat endpoint
app.get("/heartbeat", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "Server is running",
  });
});

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
  try {
    const { email, name, source, meta } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format",
      });
    }

    // Check if email already exists
    const existingSubscriber = db.subscribers.findIndex(
      (sub) => sub.email === email
    );
    if (existingSubscriber !== -1) {
      res.status(201).json({
        status: "success",
        message: "Successfully subscribed",
      });
      return;
    }

    // Create new subscriber
    const newSubscriber = {
      id: Date.now().toString(),
      email,
      name,
      source,
      meta: meta || {},
      subscribedAt: new Date().toISOString(),
    };

    // Add to database
    db.subscribers.push(newSubscriber);
    syncDatabase();
    log("Subscribed new user", email);

    sendWelcomeMail(newSubscriber);

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed",
    });
  } catch (error) {
    log("Subscribe error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Unsubscribe endpoint
app.get("/unsubscribe/:email", (req, res) => {
  const { email } = req.params;

  log("Unsubscribing", email);

  try {
    // Find subscriber by email
    const subscriberIndex = db.subscribers.findIndex(
      (sub) => sub.email === email
    );

    // If found, remove from subscribers list
    if (subscriberIndex !== -1) {
      db.subscribers.splice(subscriberIndex, 1);
      syncDatabase();
    }
  } catch (error) {
    log("Unsubscribe error:", error);
    // Continue to show success message even if there's an error
  }

  // Always show success message
  res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Unsubscribed</title>
        </head>
        <body>
            <div class="container">
                <h1 class="success">✓ You're unsubscribed</h1>
                <p>The email address <span class="email">${email}</span> has been removed from our mailing list.</p>
                <p>You will no longer receive emails from us.</p>
            </div>
        </body>
        </html>
    `);
});

app.get("/admin/db", adminAuthMiddleware, adminGetDb);
app.get("/admin/test/:email", adminAuthMiddleware, adminSendTestEmail);

// Start server
app.listen(PORT, () => {
  log(`🚀 Server running on http://localhost:${PORT}`);
  log(`📡 Heartbeat endpoint: http://localhost:${PORT}/heartbeat`);
});
