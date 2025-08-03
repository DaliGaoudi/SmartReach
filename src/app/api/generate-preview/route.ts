import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
import { checkEmailLimit } from '@/lib/subscription-limits';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

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
  const limitCheck = await checkEmailLimit(session.user.id, 1);
  
  if (!limitCheck.allowed) {
    return NextResponse.json({ 
      error: limitCheck.error,
      preview: 'Upgrade to send more emails.',
      upgradeRequired: true,
      usageStats: limitCheck.usageStats
    }, { status: 402 }); // Payment Required
  }

  // 1. Fetch user's profile to get resume path (optional)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('resume_path, email_count')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    // Continue without profile data
  }

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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  try {
    let prompt = '';
    
    if (hasResume && contact.company) {
      // Enhanced prompt with company research and resume-based personalization
      prompt = `
        You are an expert career assistant helping a job seeker write a personalized cold email TO a contact at a company.

        THE JOB SEEKER'S RESUME:
        ---
        ${resumeText}
        ---

        THE CONTACT: ${contact.name} at ${contact.company}

        TASK: Write a cold email FROM the job seeker TO ${contact.name} at ${contact.company}.

        INSTRUCTIONS:
        1. Research what ${contact.company} likely does based on their name
        2. Write a personalized email that:
           - Is written FROM the job seeker TO ${contact.name}
           - Shows understanding of ${contact.company}'s business
           - Connects the job seeker's skills/experience to what ${contact.company} likely needs
           - Is concise (under 150 words) but impactful
           - Has a clear, professional call to action
           - Avoids generic templates

        IMPORTANT: The email should be written FROM the job seeker TO ${contact.name}, not from a recruiter.

        Return only the email body text, no subject line or formatting.
      `;
    } else if (hasResume) {
      // Resume available but no company info
      prompt = `
        You are an expert career assistant helping a job seeker write a cold email.

        THE JOB SEEKER'S RESUME:
        ---
        ${resumeText}
        ---

        THE CONTACT: ${contact.name}

        TASK: Write a cold email FROM the job seeker TO ${contact.name}.

        INSTRUCTIONS:
        - Write FROM the job seeker's perspective TO ${contact.name}
        - Briefly introduce the job seeker and highlight 1-2 key skills from their resume
        - Keep the email concise (under 120 words)
        - End with a call to action, like asking for a brief chat
        - Do not include a subject line

        IMPORTANT: The email should be written FROM the job seeker TO ${contact.name}, not from a recruiter.

        Return only the email body text.
      `;
    } else if (contact.company) {
      // Company info available but no resume
      prompt = `
        You are an expert career assistant helping a job seeker write a cold email.

        THE CONTACT: ${contact.name} at ${contact.company}

        TASK: Write a cold email FROM the job seeker TO ${contact.name} at ${contact.company}.

        INSTRUCTIONS:
        1. Research what ${contact.company} likely does based on their name
        2. Write a personalized email that:
           - Is written FROM the job seeker TO ${contact.name}
           - Shows understanding of ${contact.company}'s business
           - Expresses genuine interest in the company
           - Is concise (under 150 words) but impactful
           - Has a clear, professional call to action

        IMPORTANT: The email should be written FROM the job seeker TO ${contact.name}, not from a recruiter.

        Return only the email body text, no subject line or formatting.
      `;
    } else {
      // Generic cold email without resume data or company info
      prompt = `
        You are an expert career assistant helping a job seeker write a cold email.

        THE CONTACT: ${contact.name}

        TASK: Write a cold email FROM the job seeker TO ${contact.name}.

        INSTRUCTIONS:
        - Write FROM the job seeker's perspective TO ${contact.name}
        - Briefly introduce the job seeker as a professional looking to connect
        - Keep the email concise (under 120 words)
        - End with a call to action, like asking for a brief chat or coffee
        - Do not include a subject line

        IMPORTANT: The email should be written FROM the job seeker TO ${contact.name}, not from a recruiter.

        Return only the email body text.
      `;
    }
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const messageBody = response.text();

    // Increment email count for free users
    if (!limitCheck.usageStats?.isPremium) {
      const currentEmailCount = profile?.email_count || 0;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_count: currentEmailCount + 1 })
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