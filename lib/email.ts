// Resend (https://resend.com) — free tier: 3,000 emails/month, 100/day
// Set RESEND_API_KEY in .env.local to enable.
// Set EMAIL_FROM to a verified sending address once your domain is confirmed in Resend.
// During development you can use: "Esee Property Services <onboarding@resend.dev>"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'Esee Property Services <noreply@eseepropertyservices.com>'

const BUSINESS_PHONE = '(706) 877-1026'
const BUSINESS_CITY  = 'Augusta, GA &amp; the CSRA'

export interface LeadConfirmationParams {
  name: string
  email: string
  service: string
  address: string
}

function serviceLabel(s: string) {
  if (s === 'junk-removal') return 'Junk Removal'
  if (s === 'landscaping') return 'Landscaping'
  return s
}

function buildHtml(p: LeadConfirmationParams): string {
  const svc = serviceLabel(p.service)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Request Received — Esee Property Services</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f5f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#14532d;border-radius:12px 12px 0 0;
                       padding:36px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;
                        color:#ffffff;letter-spacing:-0.2px;">
                Esee Property Services
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#86efac;">
                ${BUSINESS_CITY}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;
                         color:#14532d;letter-spacing:-0.3px;">
                Request Received
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#78716c;">
                Hi ${p.name},
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#44403c;line-height:1.65;">
                We've received your <strong style="color:#14532d;">${svc}</strong>
                request. A team member will review it and reach out shortly
                with a quote.
              </p>

              <!-- Request details box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#f5f5f4;border-radius:8px;
                            margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:600;
                               color:#a8a29e;text-transform:uppercase;
                               letter-spacing:0.8px;">
                      Request Details
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:3px 0;font-size:13px;color:#78716c;
                                   width:80px;vertical-align:top;">
                          Service
                        </td>
                        <td style="padding:3px 0;font-size:13px;
                                   font-weight:600;color:#1c1917;">
                          ${svc}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;font-size:13px;color:#78716c;
                                   vertical-align:top;">
                          Location
                        </td>
                        <td style="padding:3px 0;font-size:13px;
                                   font-weight:600;color:#1c1917;">
                          ${p.address}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What happens next -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:600;
                         color:#a8a29e;text-transform:uppercase;
                         letter-spacing:0.8px;">
                What Happens Next
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:24px;font-size:13px;font-weight:700;
                                   color:#14532d;vertical-align:top;
                                   padding-top:1px;">
                          1.
                        </td>
                        <td style="font-size:14px;color:#57534e;line-height:1.55;">
                          We review your request and match you with a local pro
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:24px;font-size:13px;font-weight:700;
                                   color:#14532d;vertical-align:top;
                                   padding-top:1px;">
                          2.
                        </td>
                        <td style="font-size:14px;color:#57534e;line-height:1.55;">
                          A team member contacts you with a quote &mdash;
                          usually within a few hours
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:24px;font-size:13px;font-weight:700;
                                   color:#14532d;vertical-align:top;
                                   padding-top:1px;">
                          3.
                        </td>
                        <td style="font-size:14px;color:#57534e;line-height:1.55;">
                          You approve the quote and we schedule the job
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Contact line -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="border-top:1px solid #e7e5e4;padding-top:24px;">
                <tr>
                  <td style="font-size:14px;color:#78716c;line-height:1.6;">
                    Questions? Reply to this email or call us at
                    <strong style="color:#1c1917;">${BUSINESS_PHONE}</strong>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f5f4;border-radius:0 0 12px 12px;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
                Esee Property Services &nbsp;&middot;&nbsp; ${BUSINESS_CITY}<br />
                You received this because you submitted a service request.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendLeadConfirmation(params: LeadConfirmationParams): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('email: RESEND_API_KEY not set — skipping confirmation email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [params.email],
      subject: `We received your ${serviceLabel(params.service)} request — Esee Property Services`,
      html: buildHtml(params),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
