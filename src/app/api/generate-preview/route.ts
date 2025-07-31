import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';

export async function POST(request: Request) {
  const { contactId } = await request.json();

  if (!contactId) {
    return NextResponse.json({ error: 'No contact ID provided.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  
  // Check user's subscription and usage
  const [
    { data: subscription, error: subscriptionError },
    { data: profile, error: profileError }
  ] = await Promise.all([
    supabase.from('subscriptions').select('status').in('status', ['trialing', 'active']).single(),
    supabase.from('profiles').select('email_count, resume_path, full_name').eq('id', session.user.id).single()
  ]);

  if (subscriptionError && profileError) {
    return NextResponse.json({ error: 'Failed to retrieve user data.' }, { status: 500 });
  }

  const isPremium = subscription?.status === 'trialing' || subscription?.status === 'active';
  const usageCount = profile?.email_count || 0;

  if (!isPremium && usageCount >= 25) {
    return NextResponse.json({ 
      error: 'You have reached your limit of 25 free emails. Please upgrade to a premium plan to continue.',
      preview: 'Upgrade to send more emails.',
      upgradeRequired: true
    }, { status: 402 }); // Payment Required
  }

  // 1. Fetch user's profile to get resume path (optional)
  // 2. Download and parse resume from Supabase Storage (if available)
  let resumeText = '';
  let hasResume = false;
  
  if (profile?.resume_path) {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage.from('resumes').download(profile.resume_path);
      if (downloadError) throw downloadError;
      const pdfData = await pdf(Buffer.from(await fileData.arrayBuffer()));
      resumeText = pdfData.text;
      hasResume = true;
    } catch(e) {
      console.error('Failed to read resume file:', e);
      // Continue without resume - will generate generic email
    }
  }

  // 3. Fetch contact details
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('name, company')
    .eq('id', contactId)
    .eq('user_id', session.user.id)
    .single();
    
  if (contactError || !contact) {
    return NextResponse.json({ error: 'Failed to fetch contact or access denied.' }, { status: 500 });
  }

  // 4. Initialize Google Gemini and generate preview
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  try {
    let prompt = '';
    
    if (hasResume) {
      // Generate personalized email using resume data
      prompt = `
        You are an expert career assistant writing a cold email on behalf of a user.
        The user's resume is:
        ---
        ${resumeText}
        ---
        The email is for: ${contact.name} from ${contact.company}.
        
        Based on the user's resume, write a short, professional, and enthusiastic cold email. The goal is to build a network connection and inquire about potential opportunities.
        - Start with a greeting to ${contact.name}.
        - Briefly introduce the user and highlight 1-2 key skills or experiences from their resume that would be relevant to ${contact.company}.
        - Express interest in the company.
        - Keep the email concise (under 120 words).
        - End with a call to action, like asking for a brief chat.
        - Do not include a subject line. Just provide the raw email body text.
      `;
    } else {
      // Generate generic cold email without resume data
      prompt = `
        You are an expert career assistant writing a cold email on behalf of a user.
        The email is for: ${contact.name} from ${contact.company}.
        
        Write a short, professional, and enthusiastic cold email. The goal is to build a network connection and inquire about potential opportunities.
        - Start with a greeting to ${contact.name}.
        - Briefly introduce the sender as a professional looking to connect.
        - Express interest in ${contact.company} and mention something specific about the company if possible.
        - Keep the email concise (under 120 words).
        - End with a call to action, like asking for a brief chat or coffee.
        - Do not include a subject line. Just provide the raw email body text.
        - Keep it generic but professional since no specific background information is available.
      `;
    }
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const messageBody = response.text();

    // Increment email count for free users
    if (!isPremium) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_count: usageCount + 1 })
        .eq('id', session.user.id);
      
      if (updateError) {
        console.error('Failed to update email count:', updateError);
        // Don't block the response, but log the error
      }
    }

    return NextResponse.json({ 
      preview: messageBody,
      hasResume: hasResume 
    });

  } catch (error) {
    console.error('Failed to generate preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview.' }, { status: 500 });
  }
} 