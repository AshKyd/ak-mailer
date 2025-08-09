# ak-mailer

An email subscription service that monitors RSS feeds and sends email notifications to subscribers when new posts are published.

- 🔄 Automatically checks RSS feeds for new content
- 📧 Sends personalized emails to subscribers when new posts are found
- 🌐 REST API for subscribing/unsubscribing users
- 🎉 Sends a welcome email to new subscribers
- 📮 Uses Mailgun API for reliable email delivery
- ⚙️ Fully configurable via environment variables

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd ak-mailer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables

## Usage

### Starting the Server

To start the production server:

```bash
npm start
```

### Admin endpoints

The admin endpoints can be enabled by setting the `ADMIN_PASSWORD` environment variable in your `.env` file.

Example usage with curl:

```bash
# Get database content
curl -H "Authorization: your-admin-password" http://localhost:3001/admin/db

# Send a test email to a subscriber
curl -H "Authorization: your-admin-password" http://localhost:3001/admin/test/user@example.com
```

Replace `your-admin-password` with the actual password set in your `ADMIN_PASSWORD` environment variable.
