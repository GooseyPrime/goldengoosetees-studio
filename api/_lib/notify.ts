/**
 * Admin Notification System
 * Sends alerts via email (Mailjet) and optionally SMS
 */

import { getAppConfig } from './config'

const MAILJET_API_KEY = process.env.MAILJET_API_KEY || ''
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || ''
const MAILJET_EMAIL_FROM = process.env.MAILJET_EMAIL_FROM || 'alerts@goldengoosetees.com'
const MAILJET_SMS_TOKEN = process.env.MAILJET_SMS_TOKEN || ''
const MAILJET_SMS_FROM = process.env.MAILJET_SMS_FROM || 'GoldenGoose'

export type AlertCategory =
  | 'system_errors'
  | 'rate_limiting'
  | 'ai_failures'
  | 'payment_orders'
  | 'external_services'

export interface NotifyOptions {
  category: AlertCategory
  subject: string
  shortMessage: string
  detail?: string
}

/**
 * Send notification to admin via email and optionally SMS
 */
export async function notifyAdmin(options: NotifyOptions): Promise<void> {
  const { category, subject, shortMessage, detail } = options

  try {
    const config = await getAppConfig()

    // Check if this category is enabled
    const categoryKey = `alert_${category}` as keyof typeof config
    if (!config[categoryKey]) {
      console.log(`Notifications disabled for category: ${category}`)
      return
    }

    const alertEmail = config.alert_email as string
    const alertPhone = config.alert_phone as string

    // Send email notification
    if (alertEmail && MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      await sendEmail(alertEmail, subject, shortMessage, detail)
    }

    // Send SMS notification for critical categories
    if (alertPhone && MAILJET_SMS_TOKEN && isCriticalCategory(category)) {
      await sendSMS(alertPhone, shortMessage)
    }
  } catch (error: any) {
    console.error('Failed to send notification:', error.message)
    // Don't throw - notifications should not break the main flow
  }
}

/**
 * Send email via Mailjet API v3.1
 */
async function sendEmail(
  to: string,
  subject: string,
  shortMessage: string,
  detail?: string
): Promise<void> {
  const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64')

  const emailBody = detail
    ? `${shortMessage}\n\nDetails:\n${detail}`
    : shortMessage

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: MAILJET_EMAIL_FROM,
            Name: 'Golden Goose Tees Alerts',
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          TextPart: emailBody,
          HTMLPart: `<html><body><p>${emailBody.replace(/\n/g, '<br>')}</p></body></html>`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Mailjet email error: ${error?.ErrorMessage || response.statusText}`)
  }
}

/**
 * Send SMS via Mailjet SMS API
 */
async function sendSMS(to: string, message: string): Promise<void> {
  // Truncate message to SMS length limit (160 chars)
  const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message

  const response = await fetch('https://api.mailjet.com/v4/sms-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MAILJET_SMS_TOKEN}`,
    },
    body: JSON.stringify({
      From: MAILJET_SMS_FROM,
      To: to,
      Text: truncatedMessage,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Mailjet SMS error: ${error?.ErrorMessage || response.statusText}`)
  }
}

/**
 * Determine if a category is critical enough for SMS alerts
 */
function isCriticalCategory(category: AlertCategory): boolean {
  return ['system_errors', 'payment_orders'].includes(category)
}


