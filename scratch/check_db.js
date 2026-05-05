import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

async function check() {
    await dbConnect();
    const users = await User.find({});
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
}

check();
