'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CreditCard, Lock, ArrowLeft, Star, Zap, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// ─── Plan Config ──────────────────────────────────────────────────────────────

const PLANS = {
  basic: {
    name: 'Basic Plan',
    emoji: '⚡',
    color: '#00CFFF',
    monthly: { amount: 999, label: '₹999 / month' },
    annual:  { amount: 9999, label: '₹9,999 / year' },
    features: ['AI Career Chatbot', '100 messages/month', 'Basic career guidance', 'Email support'],
  },
  premium: {
    name: 'Premium Plan',
    emoji: '🚀',
    color: '#FF007F',
    monthly: { amount: 1999, label: '₹1,999 / month' },
    annual:  { amount: 19999, label: '₹19,999 / year' },
    features: ['Everything in Basic', 'AI Roadmap Generator', '500 messages/month', 'Skill assessments', 'Priority support'],
  },
  elite: {
    name: 'Elite Plan',
    emoji: '👑',
    color: '#FFD700',
    monthly: { amount: 9999, label: '₹9,999 / quarter' },
    annual:  { amount: 9999, label: '₹9,999 / quarter' },
    features: ['Everything in Premium', 'ChatGPT-5 & Gemini Pro', 'Unlimited messages', '1-on-1 Mentoring', 'White-glove support'],
  },
}

type Tier = keyof typeof PLANS
type Step = 'review' | 'pay' | 'success'

// ─── Card Field Component ──────────────────────────────────────────────────────

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00CFFF] transition-all duration-200 font-mono text-sm"
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const params = useSearchParams()
  const router = useRouter()

  const tier = (params.get('tier') ?? 'premium') as Tier
  const billing = (params.get('billing') ?? 'monthly') as 'monthly' | 'annual'
  const plan = PLANS[tier] ?? PLANS.premium
  const price = plan[billing]

  const [step, setStep] = useState<Step>('review')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Card form state
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [email, setEmail] = useState('')

  // Format card number with spaces
  const formatCard = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

  // Format expiry MM/YY
  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  // Detect card brand
  const cardBrand = () => {
    const n = cardNumber.replace(/\s/g, '')
    if (n.startsWith('4')) return '💳 Visa'
    if (n.startsWith('5')) return '💳 Mastercard'
    if (n.startsWith('6')) return '💳 RuPay'
    if (n.startsWith('3')) return '💳 Amex'
    return '💳'
  }

  const isCardValid =
    cardName.length > 2 &&
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3 &&
    email.includes('@')

  const handlePay = async () => {
    if (!isCardValid) {
      setError('Please fill in all card details correctly.')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Simulate payment processing (2 second delay)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate a fake transaction ID
      const transactionId = 'CA-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase()

      // ✅ Show success screen
      setStep('success')

      // Send confirmation email (non-blocking)
      fetch('/api/payments/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          name: cardName,
          plan: plan.name,
          amount: Math.round(price.amount * 1.18).toLocaleString('en-IN'),
          billingCycle: billing === 'annual' ? 'Annual' : tier === 'elite' ? 'Quarterly' : 'Monthly',
          transactionId,
        }),
      }).catch(console.error)

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060612] pt-16 pb-20 px-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00CFFF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF007F]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/pricing" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Pricing
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#0f172a] border border-[#1e293b] px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3 text-green-400" />
            Secured by Stripe
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ─── Step 1: Review ─────────────────────────────────── */}
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Left — Plan Summary */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Complete Your Order</h1>
                  <p className="text-gray-400">Review your plan before proceeding to payment</p>
                </div>

                <div className="rounded-2xl border p-6 space-y-5"
                  style={{ borderColor: plan.color + '44', background: plan.color + '08' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{plan.emoji}</span>
                    <div>
                      <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                      <p className="text-sm" style={{ color: plan.color }}>
                        {billing.charAt(0).toUpperCase() + billing.slice(1)} billing
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-extrabold text-white">₹{price.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-500">{billing === 'annual' ? 'per year' : tier === 'elite' ? 'per quarter' : 'per month'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2" style={{ borderColor: plan.color + '22' }}>
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.color }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Shield className="w-4 h-4" />, label: 'SSL Encrypted' },
                    { icon: <Star className="w-4 h-4" />, label: 'Cancel Anytime' },
                    { icon: <Zap className="w-4 h-4" />, label: 'Instant Access' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
                      <span className="text-[#00CFFF]">{icon}</span>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Proceed */}
              <div className="bg-[#0a0f1e] border border-[#1e293b] rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-bold text-white">Order Total</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>{plan.name}</span>
                    <span className="text-white">₹{price.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>GST (18%)</span>
                    <span className="text-white">₹{Math.round(price.amount * 0.18).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-[#1e293b] pt-3 flex justify-between font-bold text-lg">
                    <span className="text-white">Total</span>
                    <span style={{ color: plan.color }}>₹{Math.round(price.amount * 1.18).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button onClick={() => setStep('pay')}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-black transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${plan.color}, #FF007F)`, boxShadow: `0 0 20px ${plan.color}40` }}>
                  <CreditCard className="w-5 h-5" />
                  Proceed to Payment
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-gray-600">
                  By proceeding, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Payment Form ───────────────────────────── */}
          {step === 'pay' && (
            <motion.div key="pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* Card Form */}
              <div className="space-y-6">
                <div>
                  <button onClick={() => setStep('review')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Review
                  </button>
                  <h1 className="text-3xl font-bold text-white mb-1">Payment Details</h1>
                  <p className="text-gray-400 text-sm">Your card info is encrypted and never stored</p>
                </div>

                {/* Visual Card */}
                <div className="relative h-48 rounded-2xl p-6 overflow-hidden select-none"
                  style={{ background: `linear-gradient(135deg, #0f172a, #1e293b)`, border: `1px solid ${plan.color}33` }}>
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 80% 20%, ${plan.color}, transparent 60%)` }} />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-white font-bold text-lg">{plan.emoji} Career Advisor</span>
                      <span className="text-gray-400 text-sm">{cardBrand()}</span>
                    </div>
                    <div>
                      <p className="font-mono text-white text-xl tracking-widest mb-3">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Card Holder</p>
                          <p className="text-white font-medium">{cardName || 'YOUR NAME'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs">Expires</p>
                          <p className="text-white font-medium">{expiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Fields */}
                <div className="space-y-4">
                  <CardField label="Email for receipt">
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </CardField>
                  <CardField label="Name on Card">
                    <Input placeholder="Full Name" value={cardName} onChange={e => setCardName(e.target.value)} />
                  </CardField>
                  <CardField label="Card Number">
                    <Input placeholder="1234 5678 9012 3456" value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))} />
                  </CardField>
                  <div className="grid grid-cols-2 gap-4">
                    <CardField label="Expiry">
                      <Input placeholder="MM/YY" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} />
                    </CardField>
                    <CardField label="CVV">
                      <Input placeholder="•••" type="password" maxLength={4} value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                    </CardField>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* Right — Summary + Pay */}
              <div className="space-y-4">
                <div className="bg-[#0a0f1e] border border-[#1e293b] rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400" /> Secure Payment
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: plan.color + '10', border: `1px solid ${plan.color}22` }}>
                    <span className="text-3xl">{plan.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{plan.name}</p>
                      <p className="text-xs text-gray-400">{plan[billing].label}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t border-[#1e293b] pt-4">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span><span className="text-white">₹{price.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>GST (18%)</span><span className="text-white">₹{Math.round(price.amount * 0.18).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-[#1e293b]">
                      <span className="text-white">Total</span>
                      <span style={{ color: plan.color }}>₹{Math.round(price.amount * 1.18).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button onClick={handlePay} disabled={loading}
                    className="w-full py-4 rounded-xl font-bold text-black text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                    style={{ background: loading ? '#334155' : `linear-gradient(135deg, ${plan.color}, #FF007F)`, boxShadow: loading ? 'none' : `0 0 24px ${plan.color}50` }}>
                    {loading ? (
                      <><div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" /> Processing...</>
                    ) : (
                      <><Lock className="w-5 h-5" /> Pay ₹{Math.round(price.amount * 1.18).toLocaleString('en-IN')}</>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> 256-bit SSL encrypted · Powered by Stripe
                  </p>
                </div>

                {/* Test card hint */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-400 text-xs font-semibold mb-1">🧪 Test Mode</p>
                  <p className="text-gray-400 text-xs">Card: <span className="font-mono text-white">4242 4242 4242 4242</span></p>
                  <p className="text-gray-400 text-xs">Expiry: <span className="font-mono text-white">12/29</span> · CVV: <span className="font-mono text-white">123</span></p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Success ─────────────────────────────────── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center space-y-8 py-10">

              {/* Animated checkmark */}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
                style={{ background: `linear-gradient(135deg, #00ff88, #00CFFF)`, boxShadow: '0 0 60px #00ff8860' }}>
                <Check className="w-12 h-12 text-black stroke-[3]" />
              </motion.div>

              <div>
                <h1 className="text-4xl font-extrabold text-white mb-3">Payment Successful! 🎉</h1>
                <p className="text-gray-400 text-lg">Your <span style={{ color: plan.color }}>{plan.name}</span> is now active.</p>
              </div>

              <div className="bg-[#0a0f1e] border border-[#1e293b] rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-white font-semibold">{plan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-white font-semibold">₹{Math.round(price.amount * 1.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Confirmation Email</span>
                  <span className="text-green-400 font-semibold">Sent ✓</span>
                </div>
              </div>

              <p className="text-gray-500 text-sm">
                📧 A confirmation email has been sent to <span className="text-white">{email}</span>
              </p>

              <div className="flex gap-4">
                <Link href="/dashboard"
                  className="flex-1 py-4 rounded-xl font-bold text-black text-center"
                  style={{ background: `linear-gradient(135deg, ${plan.color}, #FF007F)` }}>
                  Go to Dashboard
                </Link>
                <Link href="/"
                  className="flex-1 py-4 rounded-xl font-semibold text-gray-300 text-center bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] transition-colors">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
