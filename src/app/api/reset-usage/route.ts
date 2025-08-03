import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetMonthlyUsage } from '@/lib/subscription-limits';

export async function POST(request: NextRequest) {
  try {
    // Check for authorization (you might want to add a secret key check)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.USAGE_RESET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset monthly usage for all users
    await resetMonthlyUsage();

    return NextResponse.json({ 
      message: 'Monthly usage reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error resetting monthly usage:', error);
    return NextResponse.json({ 
      error: 'Failed to reset monthly usage',
      details: error.message 
    }, { status: 500 });
  }
} 