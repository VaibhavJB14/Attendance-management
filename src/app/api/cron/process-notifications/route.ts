export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const now = new Date();

    // Find pending notifications that are ready to be sent
    const pendingNotifications = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        sendAfter: { lte: now }
      },
      include: {
        student: true // To get parentPhone
      },
      take: 100 // Process in batches to prevent timeouts
    });

    if (pendingNotifications.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No pending notifications to process." });
    }

    let sentCount = 0;
    let cancelledCount = 0;
    let errorCount = 0;

    for (const notification of pendingNotifications) {
      try {
        let shouldSend = true;

        if (notification.sessionName !== 'General Message' && notification.sessionName !== 'Marks Update') {
          // Double check current attendance status for the student, date, and session
          const currentAttendance = await prisma.attendance.findFirst({
            where: {
              studentId: notification.studentId,
              date: notification.date,
              sessionName: notification.sessionName
            },
            orderBy: {
              id: 'desc'
            }
          });

          // If no attendance record exists, or it's no longer ABSENT, cancel the notification
          if (!currentAttendance || currentAttendance.status !== 'ABSENT') {
            shouldSend = false;
          }
        }

        if (!shouldSend) {
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: { status: 'CANCELLED' }
          });
          cancelledCount++;
          continue;
        }

        // If still ABSENT, send the SMS
        const { student } = notification;
        if (student.parentPhone) {
          // Construct the SMS exactly as requested by the user
          // In a real app, integrate Twilio/SNS here
          console.log(`[SMS DISPATCH] To: ${student.parentPhone} | Message: ${notification.message}`);
          
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: { status: 'SENT' }
          });
          sentCount++;
        } else {
          console.warn(`[SMS WARNING] Cannot send delayed SMS to ${student.firstName} ${student.lastName} - No parent phone.`);
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: { status: 'CANCELLED' }
          });
          cancelledCount++;
        }
      } catch (err) {
        console.error(`Failed to process notification ${notification.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingNotifications.length,
      sentCount,
      cancelledCount,
      errorCount
    });

  } catch (error: any) {
    console.error('Cron API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
