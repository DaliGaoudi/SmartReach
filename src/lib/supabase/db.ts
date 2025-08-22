import { createClient } from '@/lib/supabase/server';
import { Price, Product, Subscription, UserDetails } from '@/types';
import { Stripe } from 'stripe';
import { stripe } from '../stripe/server';
import { toDateTime } from '../helpers';

export const getProducts = async (): Promise<Product[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('products')
        .select('*, prices(*)')
        .eq('active', true)
        .eq('prices.active', true)
        .order('metadata->index');

    if (error) {
        console.log(error.message);
    }
    return (data as any) || [];
}

export const getSubscription = async (): Promise<{ subscription: Subscription | null, user: any }> => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { subscription: null, user: null };
    }

    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, prices(*, products(*))')
        .in('status', ['trialing', 'active'])
        .maybeSingle();

    if (error) {
        console.log(error.message);
    }

    return { subscription: (data as Subscription | null), user };
}

export const getUserDetails = async (): Promise<UserDetails | null> => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.log(error.message);
    }

    return (data as any);
}

export const upsertProductRecord = async (product: Stripe.Product) => {
    const supabase = await createClient();
    const productData: Product = {
        id: product.id,
        active: product.active,
        name: product.name,
        description: product.description ?? undefined,
        image: product.images?.[0] ?? null,
        metadata: product.metadata
    };

    const { error } = await supabase.from('products').upsert([productData]);
    if (error) throw error;
    console.log(`Product inserted/updated: ${product.id}`);
};

export const upsertPriceRecord = async (price: Stripe.Price) => {
    const supabase = await createClient();
    const priceData: Price = {
        id: price.id,
        product_id: typeof price.product === 'string' ? price.product : '',
        active: price.active,
        currency: price.currency,
        description: price.nickname ?? undefined,
        type: price.type,
        unit_amount: price.unit_amount ?? undefined,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count,
        trial_period_days: price.recurring?.trial_period_days,
        metadata: price.metadata
    };

    const { error } = await supabase.from('prices').upsert([priceData]);
    if (error) throw error;
    console.log(`Price inserted/updated: ${price.id}`);
};

export const createOrRetrieveCustomer = async ({
    email,
    uuid
}: {
    email: string;
    uuid: string;
}) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', uuid)
        .single();
    if (error || !data?.stripe_customer_id) {
        // No customer record found, let's create one.
        const customerData: { metadata: { supabaseUUID: string }; email?: string } =
        {
            metadata: {
                supabaseUUID: uuid
            }
        };
        if (email) customerData.email = email;
        const customer = await stripe.customers.create(customerData);
        // Now insert the customer ID into our Supabase mapping table.
        const { error: supabaseError } = await supabase
            .from('customers')
            .insert([{ id: uuid, stripe_customer_id: customer.id }]);
        if (supabaseError) throw supabaseError;
        console.log(`New customer created and inserted for ${uuid}.`);
        return customer.id;
    }
    return data.stripe_customer_id;
};

export const copyBillingDetailsToCustomer = async (
    uuid: string,
    payment_method: Stripe.PaymentMethod
) => {
    //Todo: copy billing details to customer
    const customer = payment_method.customer as string;
    const { name, phone, address } = payment_method.billing_details;
    await stripe.customers.update(customer, {
      name: name || undefined,
      phone: phone || undefined,
      address: address
        ? {
            ...address,
            city: address.city || undefined,
            country: address.country || undefined,
            line1: address.line1 || undefined,
            line2: address.line2 || undefined,
            postal_code: address.postal_code || undefined,
            state: address.state || undefined,
          }
        : undefined,
    });
    const supabase = await createClient();
    const { error } = await supabase
        .from('users')
        .update({
            billing_address: { ...address },
            payment_method: { ...payment_method[payment_method.type] }
        })
        .eq('id', uuid);
    if (error) throw error;
};

export const manageSubscriptionStatusChange = async (
    subscriptionId: string,
    customerId: string,
    createAction = false
) => {
    // Get customer's UUID from mapping table.
    const supabase = await createClient();
    const { data: customerData, error: noCustomerError } = await supabase
        .from('customers')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
    if (noCustomerError) throw noCustomerError;

    const { id: uuid } = customerData!;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method']
    }) as Stripe.Subscription;
    // Upsert the latest status of the subscription object.
    const subscriptionData: Subscription = {
        id: subscription.id,
        user_id: uuid,
        metadata: subscription.metadata,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        //TODO check quantity on subscription
        quantity: subscription.items.data[0].quantity,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at
            ? toDateTime(subscription.cancel_at).toISOString()
            : undefined,
        canceled_at: subscription.canceled_at
            ? toDateTime(subscription.canceled_at).toISOString()
            : undefined,
        current_period_start: toDateTime(
            (subscription as any).current_period_start
        ).toISOString(),
        current_period_end: toDateTime(
            (subscription as any).current_period_end
        ).toISOString(),
        ended_at: subscription.ended_at
            ? toDateTime(subscription.ended_at).toISOString()
            : undefined,
        trial_start: subscription.trial_start
            ? toDateTime(subscription.trial_start).toISOString()
            : undefined,
        trial_end: subscription.trial_end
            ? toDateTime(subscription.trial_end).toISOString()
            : undefined,
        created: toDateTime(subscription.created).toISOString(),
    };

    const { error } = await supabase
        .from('subscriptions')
        .upsert([subscriptionData]);
    if (error) throw error;
    console.log(
        `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
    );

    // For a new subscription copy billing details to the customer object.
    // NOTE: This is a costly operation for every subscription created.
    // If you have many customers, you might want to remove this.
    if (createAction && subscription.default_payment_method && uuid)
        await copyBillingDetailsToCustomer(
            uuid,
            subscription.default_payment_method as Stripe.PaymentMethod
        );
}; 