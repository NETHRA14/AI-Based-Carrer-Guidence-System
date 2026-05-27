import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// On Resend free plan, emails are delivered to your verified Resend email.
// To send to ANY email, add a custom domain at resend.com/domains.
const VERIFIED_EMAIL = 'nethrapudur@gmail.com'

export async function POST(request: NextRequest) {
  try {
    const { to, name, plan, amount, billingCycle, transactionId } = await request.json()

    if (!to || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    // On free plan, Resend only delivers to verified email.
    // We send to VERIFIED_EMAIL but show the user's entered email in the body.
    const sendTo = process.env.RESEND_VERIFIED_EMAIL || VERIFIED_EMAIL

    const { data, error } = await resend.emails.send({
      from: 'Career Advisor <onboarding@resend.dev>',
      to: [sendTo],
      subject: `🎉 Payment Confirmed — ${plan} Plan Activated!`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#060612;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060612;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#00CFFF15,#FF007F15);border:1px solid #1e293b;border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
              <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,#00CFFF,#FF007F);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#00CFFF;">
                🎓 Career Advisor
              </div>
              <div style="display:inline-block;background:rgba(0,255,136,0.15);border:1px solid rgba(0,255,136,0.4);border-radius:99px;padding:6px 20px;font-size:13px;color:#00ff88;margin-top:12px;font-weight:600;">
                ✅ PAYMENT CONFIRMED
              </div>
            </td>
          </tr>

          <!-- SUCCESS ICON + GREETING -->
          <tr>
            <td style="background:#0a0f1e;border-left:1px solid #1e293b;border-right:1px solid #1e293b;padding:40px 40px 20px;text-align:center;">
              <div style="width:80px;height:80px;background:linear-gradient(135deg,#00ff88,#00CFFF);border-radius:50%;margin:0 auto 24px;line-height:80px;font-size:40px;box-shadow:0 0 40px rgba(0,255,136,0.4);">🎉</div>
              <h1 style="color:#ffffff;font-size:28px;margin:0 0 10px;font-weight:800;">Payment Successful!</h1>
              <p style="color:#94a3b8;font-size:16px;margin:0;">Hi <strong style="color:#fff;">${name || 'there'}</strong>, your subscription is now <strong style="color:#00ff88;">active</strong>.</p>
            </td>
          </tr>

          <!-- ORDER SUMMARY CARD -->
          <tr>
            <td style="background:#0a0f1e;border-left:1px solid #1e293b;border-right:1px solid #1e293b;padding:0 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #1e293b;">
                    <h2 style="color:#00CFFF;font-size:16px;margin:0;font-weight:700;">📋 Order Summary</h2>
                  </td>
                </tr>

                <!-- Plan -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Plan</td>
                        <td align="right" style="color:#ffffff;font-size:14px;font-weight:600;">${plan}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Billing -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Billing Cycle</td>
                        <td align="right" style="color:#ffffff;font-size:14px;font-weight:600;">${billingCycle || 'Monthly'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Date -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Payment Date</td>
                        <td align="right" style="color:#ffffff;font-size:14px;font-weight:600;">${dateStr} at ${timeStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Emails -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Receipt Email</td>
                        <td align="right" style="color:#ffffff;font-size:14px;font-weight:600;">${to}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Transaction ID -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Transaction ID</td>
                        <td align="right" style="color:#94a3b8;font-size:12px;font-family:monospace;">${transactionId || 'N/A'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Status -->
                <tr>
                  <td style="padding:14px 24px;border-bottom:1px solid #1e293b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:14px;">Status</td>
                        <td align="right">
                          <span style="background:rgba(0,255,136,0.15);color:#00ff88;font-size:13px;font-weight:700;padding:4px 12px;border-radius:99px;border:1px solid rgba(0,255,136,0.3);">✓ PAID</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Amount -->
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <div style="font-size:42px;font-weight:900;color:#00CFFF;">₹${amount}</div>
                    <div style="color:#64748b;font-size:13px;margin-top:4px;">Total charged (incl. 18% GST)</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHAT'S INCLUDED -->
          <tr>
            <td style="background:#0a0f1e;border-left:1px solid #1e293b;border-right:1px solid #1e293b;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #1e293b;">
                    <h2 style="color:#FF007F;font-size:16px;margin:0;font-weight:700;">🚀 You Now Have Access To</h2>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${['🤖 AI Career Advisor Chatbot', '🗺️ Personalized Career Roadmaps', '🏫 College Recommendations', '📊 Skills Progress Tracking', '📝 Career Quiz & Assessments', '💼 Job Hunting Assistant'].map(f => `
                      <tr>
                        <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">
                          <span style="color:#00CFFF;margin-right:8px;">✓</span>${f}
                        </td>
                      </tr>`).join('')}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="background:#0a0f1e;border-left:1px solid #1e293b;border-right:1px solid #1e293b;padding:30px 40px;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#00CFFF,#FF007F);color:#000000;font-weight:800;font-size:16px;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 0 30px rgba(0,207,255,0.4);">
                Go to Dashboard →
              </a>
              <p style="color:#475569;font-size:13px;margin-top:16px;">
                You can manage your subscription anytime from your profile.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#060612;border:1px solid #1e293b;border-radius:0 0 20px 20px;padding:28px 40px;text-align:center;">
              <p style="color:#334155;font-size:12px;margin:0 0 8px;">
                Questions? Email us at <a href="mailto:support@careeradvisor.in" style="color:#00CFFF;">support@careeradvisor.in</a>
              </p>
              <p style="color:#1e293b;font-size:11px;margin:0;">
                © 2026 Career Advisor Platform · This email was sent to ${to}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Confirmation email sent. ID:', data?.id)
    return NextResponse.json({ success: true, id: data?.id, sentTo: sendTo })

  } catch (err: any) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
