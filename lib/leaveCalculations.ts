import User from '@/models/User';
import Holiday from '@/models/Holiday';
import LeaveRequest from '@/models/LeaveRequest';
import dayjs from 'dayjs';

export async function updateLeaveBalances(userId: string) {
  const user = await User.findById(userId);
  if (!user) return null;

  const now = dayjs();
  const joinedAt = dayjs(user.joinedAt);

  // --- Loyalty Leave Logic ---
  // 2 days per year completed.
  const fullYears = now.diff(joinedAt, 'year');
  
  // We need to track how many loyalty leaves have already been granted or use a persistent record.
  // A simple way: check if we've granted for the current 'year number'.
  // But wait, the user said "if you complement 1 year then you gate the 2 loyalitive... like you complement 2nd year then you get 2 leave".
  // This means at exactly 1.0 year, 2.0 years etc.
  
  // Let's store totalLoyaltyGranted in User model to be safe.
  // Or calculate based on taken leaves.
  const takenLoyaltyLeaves = await LeaveRequest.find({
    userId,
    leaveType: 'Loyalty',
    status: 'Approved'
  });
  
  // For simplicity, let's just use the current balance and track the last grant year.
  // We'll add a field `lastLoyaltyGrantYear` to the user.
  const userObj = user.toObject();
  let lastGrantYearNum = userObj.lastLoyaltyGrantYear || 0; // 0 means no grant yet

  if (fullYears > lastGrantYearNum) {
    const yearsToGrant = fullYears - lastGrantYearNum;
    const amountToAdd = yearsToGrant * 2;
    // Enforce the 10-day cap
    user.loyaltyLeaveBalance = Math.min(10, user.loyaltyLeaveBalance + amountToAdd);
    user.set('lastLoyaltyGrantYear', fullYears);
  }

  // --- Earned Leave Logic ---
  // 1 day for every 20 working days.
  // Exclude Sunday, Holidays, and taken Leaves.
  
  let lastUpdate = dayjs(user.lastEarnedLeaveUpdate || user.joinedAt);
  // Security: Never calculate leaves for days BEFORE the user joined the company
  if (lastUpdate.isBefore(dayjs(user.joinedAt))) {
    lastUpdate = dayjs(user.joinedAt);
  }
  const today = dayjs().startOf('day');
  
  if (today.isAfter(lastUpdate)) {
    let workingDays = user.workingDaysCounter || 0;
    
    // Get holidays and taken leaves in the range
    const holidays = await Holiday.find({
      date: { $gte: lastUpdate.toDate(), $lt: today.toDate() }
    });
    const holidayDates = holidays.map(h => dayjs(h.date).format('YYYY-MM-DD'));

    const takenLeaves = await LeaveRequest.find({
      userId,
      status: 'Approved',
      startDate: { $lt: today.toDate() },
      endDate: { $gte: lastUpdate.toDate() }
    });

    const takenLeaveMap = new Map<string, number>();
    takenLeaves.forEach(leave => {
      let curr = dayjs(leave.startDate);
      const end = dayjs(leave.endDate);
      const amount = leave.duration === 'Half Day' ? 0.5 : 1;
      while (curr.isBefore(end) || curr.isSame(end, 'day')) {
        const dStr = curr.format('YYYY-MM-DD');
        takenLeaveMap.set(dStr, Math.min(1, (takenLeaveMap.get(dStr) || 0) + amount));
        curr = curr.add(1, 'day');
      }
    });

    // Iterate through each day since last update
    let checkDate = lastUpdate;
    let resetOccurred = false;
    while (checkDate.isBefore(today, 'day')) {
      const dateStr = checkDate.format('YYYY-MM-DD');
      const isSunday = checkDate.day() === 0;
      const isHoliday = holidayDates.includes(dateStr);
      const leaveAmount = takenLeaveMap.get(dateStr) || 0;
      const isOnLeave = leaveAmount > 0;

      // Reset both working days progress AND the total Earned Leave balance to 0 on Jan 1st
      if (checkDate.month() === 0 && checkDate.date() === 1) {
        workingDays = 0;
        user.earnedLeaveBalance = 0;
        resetOccurred = true;
      }

      if (!isSunday && !isHoliday && !isOnLeave) {
        workingDays += 1;
      }
      checkDate = checkDate.add(1, 'day');
    }

    // Update balance based on working days
    while (workingDays >= 20) {
      user.earnedLeaveBalance += 1;
      workingDays -= 20;
    }

    const currentYear = dayjs().year();

    // If a reset occurred (Jan 1st or Forced Recalculate), 
    // ensure available balance = (Total Earned This Year) - (Total Used This Year)
    if (resetOccurred || user.lastEarnedLeaveUpdate?.getFullYear() !== currentYear) {
      const takenInCurrentYear = await LeaveRequest.find({
        userId: user._id.toString(),
        leaveType: 'Earned',
        status: 'Approved',
        startDate: { $gte: new Date(`${currentYear}-01-01`) }
      });
      
      const totalTaken = takenInCurrentYear.reduce((acc, curr) => acc + (curr.duration === 'Half Day' ? 0.5 : 1), 0);
      user.earnedLeaveBalance = Math.max(0, user.earnedLeaveBalance - totalTaken);
    }
    
    user.workingDaysCounter = workingDays;
    user.lastEarnedLeaveUpdate = today.toDate();
  }

  await user.save();
  return user;
}
