import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { StripeService } from '@/lib/stripe'
// import { RazorpayService } from '@/lib/razorpay'
// Removed prisma import — no longer needed here

const checkoutSchema = z.object({
  tier: z.enum(['basic', 'premium', 'elite']),
  provider: z.enum(['stripe', 'razorpay']).default('stripe'),
  billing: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tier, provider, billing } = checkoutSchema.parse(body)

    // ✅ Use Supabase session directly — no Prisma/DB lookup needed
    // This avoids the "users.firstName does not exist" error entirely
    const userEmail = session.user.email!
    const userMeta = session.user.user_metadata ?? {}
    const userName = (
      userMeta.full_name ||
      `${userMeta.first_name || ''} ${userMeta.last_name || ''}`.trim() ||
      userEmail
    )

    // Try to get an existing Stripe customerId from Supabase profile (non-blocking)
    let existingCustomerId: string | null = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()
      existingCustomerId = (profile as any)?.customerId ?? null
    } catch {
      // Profile lookup failed — continue without it, a new customer will be created
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/dashboard?payment=success&tier=${tier}`
    const cancelUrl = `${baseUrl}/pricing?payment=cancelled`

    try {
      if (provider === 'stripe') {
        // Create Stripe customer if we don't have one
        let customerId = existingCustomerId
        if (!customerId) {
          const customer = await StripeService.createCustomer(userEmail, userName)
          customerId = customer.id

          // Save customerId back to profile — non-critical if it fails
          try {
            await supabase
              .from('profiles')
              .update({ customerId } as any)
              .eq('id', session.user.id)
          } catch {
            // Ignore — checkout still works without saving
          }
        }

        // Inline price config — no pre-created Stripe products needed
        const PLANS: Record<string, { amount: number; interval: 'month' | 'year'; intervalCount?: number; name: string }> = {
          basic_monthly:    { amount: 99900,  interval: 'month', name: 'Basic Plan (Monthly)' },
          basic_annual:     { amount: 999900, interval: 'year',  name: 'Basic Plan (Annual)' },
          premium_monthly:  { amount: 199900, interval: 'month', name: 'Premium Plan (Monthly)' },
          premium_annual:   { amount: 1999900,interval: 'year',  name: 'Premium Plan (Annual)' },
          elite_quarterly:  { amount: 999900, interval: 'month', intervalCount: 3, name: 'Elite Plan (Quarterly)' },
        }

        const planKey = tier === 'elite' ? 'elite_quarterly' : `${tier}_${billing === 'annual' ? 'annual' : 'monthly'}`
        const plan = PLANS[planKey]

        if (!plan) {
          return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
        }

        const checkoutSession = await StripeService.createCheckoutSessionInline(
          customerId,
          plan,
          successUrl,
          cancelUrl
        )

        return NextResponse.json({
          provider: 'stripe',
          sessionId: checkoutSession.id,
          url: checkoutSession.url
        })

      } else if (provider === 'razorpay') {
        // Razorpay integration temporarily disabled
        return NextResponse.json({
          error: 'Razorpay payments are temporarily unavailable. Please use Stripe.'
        }, { status: 503 })
      }

    } catch (paymentError) {
      console.error('Payment provider error:', paymentError)
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creating checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}