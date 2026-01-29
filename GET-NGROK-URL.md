# 🚀 Get Your ngrok URL

ngrok is now configured! Here's how to get your URL:

## Start ngrok

In a terminal, run:

```bash
ngrok http 3001
```

You'll see output like:

```
Session Status                online
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (the one starting with `https://`)

That's your ngrok URL! Use it in Shopify.

---

## Alternative: Check ngrok web interface

If ngrok is already running, visit:
```
http://127.0.0.1:4040
```

This shows your ngrok URL and request logs.

---

Once you have the URL, we'll use it to:
1. Create the app in Shopify Partners
2. Update your .env file
3. Install the app

