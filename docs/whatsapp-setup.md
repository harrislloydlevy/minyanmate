# WhatsApp Cloud API Setup

MinyanMate uses Meta's WhatsApp Cloud API for phone-number OTP verification
and sending notifications (reminders, quorum alerts, event changes).

## Prerequisites

- A Meta (Facebook) account — personal or business
- A phone number that can receive WhatsApp messages (to verify the Business account)

---

## Step 1: Create a Meta Business Account

1. Go to **https://business.facebook.com/overview**
2. Click **Create Account** (or use an existing one)
3. Fill in your business name, name, and email

> You can use a personal account — you don't need to be a real business.

---

## Step 2: Create a Meta App with WhatsApp

1. Go to **https://developers.facebook.com**
2. Click **My Apps → Create App**
3. Choose **"Other"** as the use case → **Next**
4. Choose **"Business"** as the app type → **Next**
5. Name it something like `MinyanMate` and click **Create App**
6. In the dashboard, find **"Add Product"** → click **"Set up"** under **WhatsApp Cloud API**

---

## Step 3: Get Your Credentials

Once the WhatsApp product is added:

### WhatsApp Token & Phone Number ID

1. In the WhatsApp Cloud API section, go to **API Setup**
2. You'll see:
   - **`WHATSAPP_PHONE_NUMBER_ID`** — the sender phone number ID (starts with a number)
   - A **Temporary Access Token** (expires in 24h)
3. Click **"Generate Token"** → select your app → copy the **`WHATSAPP_TOKEN`**
   - This is a short-lived token. To get a **permanent token**:
     - Go to **App Dashboard → App Settings → Advanced → Generate Access Token**
     - Select your **System User** (create one if needed) with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
     - Copy the token and use that instead

### WhatsApp App Secret

1. Go to **App Dashboard → App Settings → Basic**
2. Copy the **`App Secret`** — this is your **`WHATSAPP_APP_SECRET`**

### Verify Token

Pick any random string — it's used only during webhook registration. Example: `minyanmate-webhook-v1`

---

## Step 4: Add the Test Number

1. In the WhatsApp Cloud API dashboard, under **"To" numbers**, you'll see a test number Meta provides
2. Note: **you** need to be able to receive WhatsApp messages on the number you test with
3. To add your own phone number:
   - Go to **"Phone Numbers"** in the WhatsApp sidebar
   - Click **"Add Phone Number"**
   - You'll receive a 6-digit code via SMS or voice call

---

## Step 5: Fill In Environment Variables

Edit `.env` in the repo root:

```env
# Switch to production so OTPs actually go through WhatsApp
APP_ENV=production

WHATSAPP_TOKEN=EAATxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_APP_SECRET=abc123def456...
WHATSAPP_VERIFY_TOKEN=minyanmate-webhook-v1
```

Then restart the app:

```bash
docker compose restart dev
# or, if running directly:
pnpm dev
```

---

## Step 6: Set Up the Webhook (for inbound messages)

Inbound webhooks let MinyanMate receive WhatsApp replies — people tapping
"Yes" / "No" buttons on notifications, or sending messages to the bot.

### You need a public HTTPS URL

Meta cannot call `localhost`. You have three options:

| Option | How | Cost |
|--------|-----|------|
| **Cloudflare Tunnel** | `cloudflared tunnel --url http://localhost:3100` | Free |
| **ngrok** | `ngrok http 3100` | Free tier (random URL) |
| **Deploy to VPS** | DigitalOcean, Hetzner, Railway, Fly.io | $5-15/mo |

### Register the Webhook

1. In the WhatsApp Cloud API dashboard, go to **Configuration → Webhook**
2. Set **Callback URL** to `https://your-public-url/api/webhooks/whatsapp`
3. Set **Verify Token** to the same value you put in `WHATSAPP_VERIFY_TOKEN`
4. Click **Verify and Save**
5. Under **Webhook Fields**, subscribe to:
   - `messages`
   - `message_template_status_update`

### Test the Webhook

1. Send a WhatsApp message to your test number
2. Check the app logs — you should see the inbound message logged
3. The app should process the message and respond

---

## Rate Limits & Pricing

| Tier | Limit | Cost |
|------|-------|------|
| **Free test** | 1,000 conversations/month + 1 test number | Free |
| **Production** | Depends on verification level | ~$0.005–0.08/conversation |

See: https://developers.facebook.com/docs/whatsapp/pricing

---

## Troubleshooting

### OTP not arriving

- Is `APP_ENV=production` set? Dev mode logs OTPs to the server console instead of sending.
- Check the app logs for `[dev-otp]` — if you see this, the app is in dev mode.
- Is the `WHATSAPP_TOKEN` expired? Temporary tokens last 24 hours.
- Is the recipient number registered in the WhatsApp API dashboard? Meta only sends to numbers you've added.

### Webhook verification fails

- The `WHATSAPP_VERIFY_TOKEN` in `.env` must exactly match what you type in the Meta dashboard.
- The public URL must be reachable from Meta's servers (no IP whitelisting, no firewalls blocking inbound).
- Check the app logs when Meta sends the verification request.

### Messages not being received

- The webhook must be **subscribed** to the `messages` field.
- The sender number must be registered as a "To" number in the WhatsApp API dashboard.
