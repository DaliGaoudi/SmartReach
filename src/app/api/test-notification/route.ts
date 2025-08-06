import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create a test notification
    await createNotification({
      userId: user.id,
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      metadata: {
        test: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
