import dbConnect from './lib/mongodb';
import Message from './models/Message';
import User from './models/User';
import Group from './models/Group';

async function listAll() {
  await dbConnect();
  
  const users = await User.find({}).select('name _id').lean();
  const groups = await Group.find({}).select('name _id').lean();

  console.log('--- USERS ---');
  users.forEach(u => console.log(`${u.name}: ${u._id}`));
  
  console.log('--- GROUPS ---');
  groups.forEach(g => console.log(`${g.name}: ${g._id}`));
  
  process.exit(0);
}

listAll().catch(err => {
  console.error(err);
  process.exit(1);
});
