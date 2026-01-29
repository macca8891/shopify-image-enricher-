require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const FollowUpService = require('./services/FollowUpService');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hubspot-followup', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/followup', require('./routes/followup'));
app.use('/api/sales-process', require('./routes/sales-process'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Daily cron job - runs at 9 AM every day
const followUpService = new FollowUpService();

cron.schedule('0 9 * * *', async () => {
  console.log('🔄 Running daily follow-up check...');
  try {
    const result = await followUpService.checkContactsAndCreateTasks();
    
    // Save tasks to database
    for (const task of result.tasks) {
      try {
        await Task.findOneAndUpdate(
          { hubspotTaskId: task.id },
          {
            hubspotTaskId: task.id,
            hubspotContactId: task.associations?.[0]?.to?.id || 'unknown',
            type: task.type || 'email',
            subject: task.properties?.hs_task_subject || 'Follow up',
            body: task.properties?.hs_task_body || '',
            priority: task.properties?.hs_task_priority || 'HIGH',
            status: task.properties?.hs_task_status || 'NOT_STARTED',
            emailDraft: task.draft || null
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error(`Error saving task ${task.id}:`, error);
      }
    }

    console.log(`✅ Daily check completed: ${result.tasksCreated} tasks created`);
  } catch (error) {
    console.error('❌ Error in daily cron job:', error);
  }
}, {
  timezone: 'America/New_York' // Adjust to your timezone
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HubSpot Follow-Up Assistant running on port ${PORT}`);
  console.log(`📅 Daily check scheduled for 9:00 AM`);
  console.log(`🌐 Access the app at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;


