import dbConnect from './lib/mongodb';
import Message from './models/Message';
import User from './models/User';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  const testUserId = '69e1cb89ac58954c5681dc05'; // From terminal
  const messages = await Message.find({
    $or: [
      { senderId: testUserId },
      { receiverId: testUserId }
    ]
  }).limit(5).lean();

  console.log('--- DIAGNOSTIC RESULTS ---');
  console.log(`Found ${messages.length} messages for user ${testUserId}`);
  
  if (messages.length > 0) {
    messages.forEach((m, i) => {
      console.log(`Msg ${i}: ID=${m._id}, senderId=${m.senderId}, receiverId=${m.receiverId}, text="${m.text}", conversationId=${m.conversationId}`);
    });
  } else {
    console.log('No messages found for this user ID in DB!');
    // Let's find ANY message to see format
    const anyMsg = await Message.findOne().lean();
    if (anyMsg) {
      console.log('Sample message in DB:');
      console.log(JSON.stringify(anyMsg, null, 2));
    }
  }
  
  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
