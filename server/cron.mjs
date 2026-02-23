import { db, syncDatabase } from "./db.mjs";
import Parser from "rss-parser";
import dotenv from "dotenv";
import { sendMailout } from "./mail.mjs";
import he from "he";
import { log } from "./log.mjs";

dotenv.config();

// Handle self-signed certificates if configured
if (process.env.ALLOW_INVALID_CERTS === "true") {
  log(
    "⚠️  ALLOW_INVALID_CERTS is set to true. SSL certificate verification is disabled.",
  );
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const parser = new Parser();

/**
 * Fetch a URL using the if-modified-since header to check if it has changed since the given timestamp.
 *
 * @param { string } url - The URL to fetch.
 * @param { number } since - The timestamp to check against.
 */
async function fetchIfChangedSince({ url, since }) {
  try {
    const headers = {
      "if-modified-since": new Date(since).toUTCString(),
    };
    const response = await fetch(url, { headers });
    if (response.status === 304) {
      return null;
    }
    if (!response.ok) {
      log(
        `⚠️  Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
      return null;
    }
    return response.text();
  } catch (error) {
    log(`❌ Error fetching ${url}:`, error.message);
    return null;
  }
}

async function getFeeds() {
  const rssFeeds = process.env.RSS_FEEDS;
  if (!rssFeeds) {
    log("No RSS_FEEDS configured");
    return [];
  }
  const feedUrls = rssFeeds
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url);
  return Promise.all(
    feedUrls.map((url) => fetchIfChangedSince({ url, since: 0 })),
  );
}

function getNewPosts({ feeds, since }) {
  const newPosts = [];
  for (const feed of feeds) {
    const posts = feed.items
      .filter((item) => {
        const sinceDate = new Date(since);
        const pubDate = new Date(item.pubDate);
        const isNewer = pubDate > sinceDate;
        console.log(he.decode(item.title), isNewer);
        return isNewer;
      })
      .map((item) => ({ ...item, title: he.decode(item.title) }));
    newPosts.push(...posts);
  }
  return newPosts;
}

async function checkSend() {
  log("Checking for new posts");
  const now = Date.now();
  const lastMailout = db.lastMailout;
  const feedSource = await getFeeds();
  const feeds = [];

  for (const source of feedSource) {
    if (!source) continue;
    try {
      const parsed = await parser.parseString(source);
      feeds.push(parsed);
    } catch (error) {
      log("❌ Failed to parse RSS feed:", error.message);
      // Log a bit of the source to help debug
      log("Source preview:", source.substring(0, 100));
    }
  }

  const newPosts = getNewPosts({ feeds, since: lastMailout });

  log(
    `Found ${newPosts.length} new posts since ${new Date(
      lastMailout,
    ).toISOString()}: ${newPosts.map((post) => post.title).join("/")}`,
  );

  if (!newPosts.length) {
    log("No new posts to send");
    return;
  }

  const subscribers = db.subscribers;
  log(`Found ${subscribers.length} active subscribers`);

  // TODO: Implement actual email sending logic here
  // For now, just update the lastMailout timestamp
  db.lastMailout = now;
  syncDatabase();

  // Generate personalized emails for each subscriber
  sendMailout({ subscribers, newPosts });

  log("Check completed");
}

checkSend();
setInterval(checkSend, 1000 * 60 * 10);
