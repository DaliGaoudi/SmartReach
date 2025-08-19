'use server';


import { createClient } from "@/lib/supabase/server"
import { Price } from "@/types";
import { stripe } from "@/lib/stripe/server";
import { createOrRetrieveCustomer } from "@/lib/supabase/db";
import { getURL } from "@/lib/helpers";

// SOFT_LAUNCH flag: set SOFT_LAUNCH=false to enable Stripe payments
const isSoftLaunch = process.env.SOFT_LAUNCH === 'true';

export const createCheckoutSession = async (price: Price) => {
    if (isSoftLaunch) {
        // During soft launch, Stripe checkout is disabled
        throw new Error('Soft launch: Stripe checkout is disabled.');
    }
    // ...existing code...
    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Could not get user session.');
    }
    const customer = await createOrRetrieveCustomer({
        uuid: user.id || '',
        email: user.email || ''
    });
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();
    if (data && !error) {
        throw new Error('User already has a subscription.');
    }
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        customer,
        line_items: [
            {
                price: price.id,
                quantity: 1
            }
        ],
        mode: 'subscription',
        allow_promotion_codes: true,
        subscription_data: {
            metadata: {
                userId: user.id,
            }
        },
        success_url: `${getURL()}/dashboard`,
        cancel_url: `${getURL()}/waitlist`
    });
    if (!session) {
        throw new Error('Could not create checkout session.');
    }
    return { sessionId: session.id };
}

export const stripeRedirect = async (path: string) => {
    if (isSoftLaunch) {
        // During soft launch, Stripe portal is disabled
        throw new Error('Soft launch: Stripe portal is disabled.');
    }
    // ...existing code...
    const supabase = await createClient()
    const {
        data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
        // No user - redirect to login page
        return { url: `${getURL()}/login` };
    }
    const customer = await createOrRetrieveCustomer({
        uuid: user.id || '',
        email: user.email || ''
    });
    // Always create a billing portal session, which will handle both managing existing subscriptions
    // and creating new ones through the Stripe Customer Portal
    const stripeSession = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${getURL()}${path}`
    });
    if (!stripeSession) {
        throw new Error('Could not create stripe session.');
    }
    return { url: stripeSession.url };
}