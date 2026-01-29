// PM2 ecosystem file for process management
// Install PM2: npm install -g pm2
// Start: pm2 start ecosystem.config.js
// Stop: pm2 stop ecosystem.config.js
// Logs: pm2 logs

module.exports = {
  apps: [{
    name: 'buckydrop-proxy',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};


