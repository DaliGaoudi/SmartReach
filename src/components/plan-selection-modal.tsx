'use client';

import { useState, useTransition } from 'react';
import { ProductWithPrice, Price } from '@/types';
import { createCheckoutSession } from '@/app/pricing/actions';
import { getStripe } from '@/lib/stripe/client';
import { X, Check, Zap } from 'lucide-react';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithPrice[];
  currentSubscription: any;
}

export default function PlanSelectionModal({ 
  isOpen, 
  onClose, 
  products, 
  currentSubscription 
}: PlanSelectionModalProps) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleCheckout = async (price: Price) => {
    setPriceIdLoading(price.id);
    
    try {
      const { sessionId } = await createCheckoutSession(price);
      const stripe = await getStripe();
      stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      alert((error as Error)?.message);
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  const formatPrice = (price: Price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 0
    }).format((price?.unit_amount || 0) / 100);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-black border border-zinc-700/50 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
            <div>
              <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
              <p className="text-zinc-400 mt-1">Select the perfect plan for your outreach needs</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="p-6 border-b border-zinc-700/50">
            <div className="flex justify-center">
              <div className="bg-zinc-900 rounded-lg p-1 flex border border-zinc-800">
                <button
                  onClick={() => setBillingInterval('month')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                    billingInterval === 'month'
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('year')}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                    billingInterval === 'year'
                      ? 'bg-zinc-700 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="ml-2 px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white">Free Plan</h3>
                  <p className="text-zinc-400 mt-1">Perfect for getting started</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white">$0</span>
                    <span className="text-zinc-400">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                    <span className="text-zinc-300">25 AI Emails per month</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                    <span className="text-zinc-300">Contact Management</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                    <span className="text-zinc-300">Gmail Integration</span>
                  </li>
                </ul>

                <button
                  disabled
                  className="w-full py-3 px-4 bg-zinc-700 text-zinc-400 rounded-lg font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>

              {/* Pro Plans */}
              {products.map((product) => {
                const price = product.prices?.find(
                  (price) => price.interval === billingInterval
                );
                if (!price) return null;

                const isCurrentPlan = currentSubscription && 
                  product.name === currentSubscription?.prices?.products?.name;

                return (
                  <div 
                    key={product.id}
                    className={`relative bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-2 rounded-xl p-6 ${
                      isCurrentPlan ? 'border-pink-500' : 'border-pink-500/50'
                    }`}
                  >
                    {/* Popular Badge */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>

                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center mb-2">
                        <Zap className="w-5 h-5 text-pink-400 mr-2" />
                        <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                      </div>
                      <p className="text-zinc-400 mt-1">{product.description}</p>
                      <div className="mt-4">
                        <span className="text-3xl font-bold text-white">
                          {formatPrice(price)}
                        </span>
                        <span className="text-zinc-400">/{billingInterval}</span>
                        {billingInterval === 'year' && (
                          <div className="text-sm text-pink-400 mt-1">
                            Save {Math.round(((price.unit_amount || 0) * 12 - (price.unit_amount || 0) * 10) / ((price.unit_amount || 0) * 12) * 100)}% annually
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center text-sm">
                        <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">Unlimited AI Emails</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">Advanced Contact Management</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">Direct Gmail Sending</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">Priority Support</span>
                      </li>
                      <li className="flex items-center text-sm">
                        <Check className="w-4 h-4 mr-3 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">Advanced Analytics</span>
                      </li>
                    </ul>

                    <button
                      onClick={() => handleCheckout(price)}
                      disabled={!!priceIdLoading || isCurrentPlan}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                        isCurrentPlan
                          ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-pink-500/25'
                      }`}
                    >
                      {priceIdLoading === price.id ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processing...
                        </div>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : (
                        `Upgrade to ${product.name}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-700/50 bg-zinc-900/30">
            <div className="text-center text-sm text-zinc-400">
              <p>All plans include a 14-day free trial. Cancel anytime.</p>
              <p className="mt-1">Questions? <a href="mailto:support@smartsendr.org" className="text-pink-400 hover:text-pink-300">Contact our support team</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

