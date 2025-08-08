import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { db, syncDatabase } from "./db.mjs";

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
    if (!email || !name || !source) {
      return res.status(400).json({
        status: "error",
        message:
          "Missing required fields: email, name, and source are required",
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
    const existingSubscriber = db.subscribers.find(
      (sub) => sub.email === email
    );
    if (existingSubscriber) {
      return res.status(409).json({
        status: "error",
        message: "Email already subscribed",
      });
    }

    // Create new subscriber
    const newSubscriber = {
      id: Date.now().toString(),
      email,
      name,
      source,
      meta: meta || {},
      subscribedAt: new Date().toISOString(),
      active: true,
    };

    // Add to database
    db.subscribers.push(newSubscriber);
    syncDatabase();
    console.log(new Date().toISOString(), "Subscribed new user", email);

    res.status(201).json({
      status: "success",
      message: "Successfully subscribed",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Unsubscribe endpoint
app.get("/unsubscribe/:email", (req, res) => {
  const { email } = req.params;

  console.log(new Date().toISOString(), "Unsubscribing", email);

  try {
    // Find subscriber by email
    const subscriberIndex = db.subscribers.findIndex(
      (sub) => sub.email === email
    );

    // If found, mark as inactive
    if (subscriberIndex !== -1) {
      db.subscribers[subscriberIndex].active = false;
      db.subscribers[subscriberIndex].unsubscribedAt = new Date().toISOString();
      syncDatabase();
    }
  } catch (error) {
    console.error("Unsubscribe error:", error);
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Heartbeat endpoint: http://localhost:${PORT}/heartbeat`);
});
