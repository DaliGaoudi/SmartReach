import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: '2025-05-28.basil',
  appInfo: {
    name: 'smart-reach',
    version: '0.1.0'
  }
}); 