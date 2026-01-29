require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const FollowUpService = require('../services/FollowUpService');
const Task = require('../models/Task');

async function runDailyCheck() {
  try {
    console.log('🔄 Starting manual daily contact check...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hubspot-followup', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Run follow-up check
    const followUpService = new FollowUpService();
    const result = await followUpService.checkContactsAndCreateTasks();

    console.log(`\n📊 Results:`);
    console.log(`   Total contacts checked: ${result.totalContacts}`);
    console.log(`   Tasks created: ${result.tasksCreated}`);
    console.log(`   Contacts skipped: ${result.contactsSkipped}`);

    // Save tasks to database
    let savedCount = 0;
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
        savedCount++;
      } catch (error) {
        console.error(`   ⚠️  Error saving task ${task.id}:`, error.message);
      }
    }

    console.log(`   Tasks saved to database: ${savedCount}`);

    if (result.skipped.length > 0) {
      console.log(`\n⏭️  Skipped contacts:`);
      result.skipped.slice(0, 10).forEach(skip => {
        console.log(`   - ${skip.contact}: ${skip.reason}`);
      });
      if (result.skipped.length > 10) {
        console.log(`   ... and ${result.skipped.length - 10} more`);
      }
    }

    console.log('\n✅ Daily check completed successfully!');

    // Close MongoDB connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running daily check:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runDailyCheck();


