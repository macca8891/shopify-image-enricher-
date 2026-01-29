# PM2 Commands for BuckyDrop Shipping

## Basic Commands

### Check Status
```bash
pm2 status
```

### View Logs
```bash
# All logs (real-time)
pm2 logs buckydrop-shipping

# Last 50 lines
pm2 logs buckydrop-shipping --lines 50

# Error logs only
pm2 logs buckydrop-shipping --err --lines 50
```

### Restart Server
```bash
pm2 restart buckydrop-shipping
```

### Stop Server
```bash
pm2 stop buckydrop-shipping
```

### Start Server
```bash
pm2 start buckydrop-shipping
```

### Delete from PM2
```bash
pm2 delete buckydrop-shipping
```

## Monitoring

### Monitor (real-time dashboard)
```bash
pm2 monit
```

### Show Detailed Info
```bash
pm2 show buckydrop-shipping
```

## Auto-Restart

PM2 will automatically restart the server if it crashes. No action needed!

## Auto-Start on Boot

PM2 is configured to auto-start on system boot. The server will start automatically when your Mac restarts.

## Log Files

- **Standard output**: `/tmp/pm2-server.log`
- **Error output**: `/tmp/pm2-server-error.log`
- **PM2 logs**: `~/.pm2/logs/buckydrop-shipping-out.log` and `~/.pm2/logs/buckydrop-shipping-error.log`

## Quick Health Check

```bash
# Check if server is running
pm2 status | grep buckydrop-shipping

# Test if server responds
curl http://localhost:3001/api/shipping/carrier-service-status?shop=test.myshopify.com
```

