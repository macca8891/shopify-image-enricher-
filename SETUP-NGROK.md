# 🔧 Setup ngrok Authentication

ngrok now requires an account. Here's how to set it up:

## Quick Setup (2 minutes)

### Step 1: Sign up for ngrok (free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with your email (or use Google/GitHub)
3. It's **free** - no credit card needed

### Step 2: Get your authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abc123def456ghi789jkl012mno345pq_6r7s8t9u0v1w2x3y4z5`)

### Step 3: Configure ngrok

Run this command (replace with your actual token):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 4: Start ngrok

```bash
ngrok http 3001
```

You should now see your HTTPS URL!

---

**That's it!** Once ngrok is authenticated, you can use it anytime.

