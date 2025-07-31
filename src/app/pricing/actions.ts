'use server';

import { createClient } from "@/lib/supabase/server"
import { Price } from "@/types";
import { stripe } from "@/lib/stripe/server";
import { createOrRetrieveCustomer } from "@/lib/supabase/db";
import { getURL } from "@/lib/helpers";

export const createCheckoutSession = async (price: Price) => {
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
            trial_from_plan: true,
            metadata: {
                userId: user.id,
            }
        },
        success_url: `${getURL()}/dashboard`,
        cancel_url: `${getURL()}/`
    });

    if (!session) {
        throw new Error('Could not create checkout session.');
    }

    return { sessionId: session.id };
}

export const stripeRedirect = async (path: string) => {
    const supabase = await createClient()

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (user) {
        const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();

        if (data && !error) {
            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: (await createOrRetrieveCustomer({
                    uuid: user.id || '',
                    email: user.email || ''
                })),
                return_url: `${getURL()}${path}`
            })

            if (!stripeSession) {
                throw new Error('Could not create stripe session.');
            }

            return { url: stripeSession.url };
        }
    }

    return { url: `${getURL()}${path}` };
} 