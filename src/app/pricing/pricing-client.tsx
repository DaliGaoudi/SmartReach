'use client';

import { useState } from 'react';
import { ProductWithPrice, Subscription, Price } from '@/types';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCheckoutSession, stripeRedirect } from './actions';
import { getStripe } from '@/lib/stripe/client';

// Environment variable for soft launch mode
const isSoftLaunch = process.env.NEXT_PUBLIC_SOFT_LAUNCH === 'true';

type PricingProps = {
    user: User | null;
    products: ProductWithPrice[];
    subscription: Subscription | null;
};

export default function Pricing({
    user,
    products,
    subscription
}: PricingProps) {
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>(
        'month'
    );
    const [priceIdLoading, setPriceIdLoading] = useState<string>();

    const backUrl = subscription ? '/dashboard' : '/';

    const handleCheckout = async (price: Price) => {
        setPriceIdLoading(price.id);
        
        if (isSoftLaunch) {
            setPriceIdLoading(undefined);
            window.location.href = '/waitlist';
            return;
        }

        if (!user) {
            setPriceIdLoading(undefined);
            return stripeRedirect('/login');
        }
        if (subscription) {
            setPriceIdLoading(undefined);
            return stripeRedirect('/dashboard');
        }

        try {
            const { sessionId } = await createCheckoutSession(price);
            const stripe = await getStripe();
            stripe?.redirectToCheckout({ sessionId });
        } catch (error) {
            return alert((error as Error)?.message);
        } finally {
            setPriceIdLoading(undefined);
        }
    };

    if (!products.length)
        return (
            <section className="bg-black">
                <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
                    <div className="sm:flex sm:flex-col sm:align-center"></div>
                    <p className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                        No subscription plans found. Create them in your Stripe dashboard.
                    </p>
                </div>
            </section>
        );

    return (
        <section>
            <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <Link href={backUrl} className="flex items-center text-zinc-400 hover:text-zinc-200 transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to {subscription ? 'Dashboard' : 'Home'}
                    </Link>
                </div>
                <div className="sm:flex sm:flex-col sm:align-center">
                    <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                        Pricing Plans
                    </h1>
                    <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                        Power up your outreach. Start connecting for free, or go premium
                        for unlimited personalized emails.
                    </p>
                    <div className="relative self-center mt-6 bg-zinc-900 rounded-lg p-0.5 flex sm:mt-8 border border-zinc-800">
                        <button
                            onClick={() => setBillingInterval('month')}
                            type="button"
                            className={`${billingInterval === 'month'
                                ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                                : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                                } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                        >
                            Monthly billing
                        </button>
                        <button
                            onClick={() => setBillingInterval('year')}
                            type="button"
                            className={`${billingInterval === 'year'
                                ? 'relative w-1/2 bg-zinc-700 border-zinc-800 shadow-sm text-white'
                                : 'ml-0.5 relative w-1/2 border border-transparent text-zinc-400'
                                } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8`}
                        >
                            Yearly billing
                        </button>
                    </div>
                </div>
                <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                    <Card
                        className={cn(
                            'rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900',
                            { 'border border-pink-500': !subscription }
                        )}
                    >
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold">
                                Free
                            </CardTitle>
                            <CardDescription className="text-zinc-400">
                                For individuals getting started.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4">
                                <span className="text-4xl font-bold">$0</span>
                                <span className="text-base font-medium text-zinc-400">
                                    /month
                                </span>
                            </div>
                            <ul className="mt-8 space-y-4">
                                <li className="flex items-center">
                                    <Check className="w-5 h-5 mr-2 text-green-500" />
                                    <span>25 AI Emails/Month</span>
                                </li>
                                <li className="flex items-center">
                                    <Check className="w-5 h-5 mr-2 text-green-500" />
                                    <span>Contact Management</span>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                disabled={true}
                            >
                                Your Current Plan
                            </Button>
                        </CardFooter>
                    </Card>
                    {products.map((product) => {
                        const price = product.prices?.find(
                            (price) => price.interval === billingInterval
                        );
                        if (!price) return null;
                        const priceString = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: price.currency,
                            minimumFractionDigits: 0
                        }).format((price?.unit_amount || 0) / 100);
                        return (
                            <Card
                                key={product.id}
                                className={cn(
                                    'rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900',
                                    {
                                        'border border-pink-500': subscription
                                            ? product.name === subscription?.prices?.products?.name
                                            : false
                                    }
                                )}
                            >
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold">
                                        {product.name}
                                    </CardTitle>
                                    <CardDescription className="text-zinc-400">
                                        {product.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">{priceString}</span>
                                        <span className="text-base font-medium text-zinc-400">
                                            /{billingInterval}
                                        </span>
                                    </div>
                                    <ul className="mt-8 space-y-4">
                                        <li className="flex items-center">
                                            <Check className="w-5 h-5 mr-2 text-green-500" />
                                            <span>Unlimited AI Emails</span>
                                        </li>
                                        <li className="flex items-center">
                                            <Check className="w-5 h-5 mr-2 text-green-500" />
                                            <span>Contact Management</span>
                                        </li>
                                        <li className="flex items-center">
                                            <Check className="w-5 h-5 mr-2 text-green-500" />
                                            <span>Direct Gmail Sending</span>
                                        </li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        disabled={!!priceIdLoading}
                                        onClick={() => handleCheckout(price)}
                                    >
                                        {subscription ? 'Manage' : 'Subscribe'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
} 