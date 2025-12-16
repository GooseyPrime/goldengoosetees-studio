import { Order } from './types'

export interface StripeConfig {
  publishableKey: string
  isTestMode: boolean
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled'
}

export interface PaymentResult {
  success: boolean
  paymentIntentId?: string
  error?: string
}

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

class StripeService {
  private publishableKey: string | null = null
  private secretKey: string | null = null
  private isTestMode: boolean = true

  async initialize() {
    const config = await window.spark.kv.get<{ publishableKey: string; secretKey: string; isTestMode: boolean }>('stripe-config')
    if (config) {
      this.publishableKey = config.publishableKey
      this.secretKey = config.secretKey
      this.isTestMode = config.isTestMode
    }
  }

  async saveConfig(publishableKey: string, secretKey: string, isTestMode: boolean) {
    await window.spark.kv.set('stripe-config', {
      publishableKey,
      secretKey,
      isTestMode
    })
    this.publishableKey = publishableKey
    this.secretKey = secretKey
    this.isTestMode = isTestMode
  }

  isConfigured(): boolean {
    return !!(this.publishableKey && this.secretKey)
  }

  getPublishableKey(): string | null {
    return this.publishableKey
  }

  async createPaymentIntent(order: Order): Promise<PaymentIntent> {
    if (!this.secretKey) {
      throw new Error('Stripe not configured. Please set up Stripe in Admin Settings.')
    }

    const amountInCents = Math.round(order.totalAmount * 100)

    const formData = new URLSearchParams()
    formData.append('amount', amountInCents.toString())
    formData.append('currency', 'usd')
    formData.append('automatic_payment_methods[enabled]', 'true')
    formData.append('metadata[order_id]', order.id)
    formData.append('metadata[user_id]', order.userId)
    formData.append('metadata[design_id]', order.designId)
    formData.append('description', `GoldenGooseTees Order #${order.id.slice(-8).toUpperCase()}`)

    const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to create payment intent')
    }

    const data = await response.json()

    return {
      id: data.id,
      clientSecret: data.client_secret,
      amount: data.amount,
      currency: data.currency,
      status: data.status
    }
  }

  async confirmCardPayment(
    clientSecret: string,
    cardDetails: {
      number: string
      exp_month: number
      exp_year: number
      cvc: string
    },
    billingDetails: {
      name: string
      email: string
      address?: {
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
        country: string
      }
    }
  ): Promise<PaymentResult> {
    if (!this.publishableKey) {
      throw new Error('Stripe not configured')
    }

    try {
      const tokenResponse = await this.createCardToken(cardDetails, billingDetails)
      
      if (!tokenResponse.success || !tokenResponse.tokenId) {
        return {
          success: false,
          error: tokenResponse.error || 'Failed to create card token'
        }
      }

      const confirmResponse = await this.confirmPaymentIntentWithToken(
        clientSecret,
        tokenResponse.tokenId
      )

      return confirmResponse
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      }
    }
  }

  private async createCardToken(
    cardDetails: {
      number: string
      exp_month: number
      exp_year: number
      cvc: string
    },
    billingDetails: {
      name: string
      email: string
      address?: {
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
        country: string
      }
    }
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
    const formData = new URLSearchParams()
    formData.append('card[number]', cardDetails.number.replace(/\s/g, ''))
    formData.append('card[exp_month]', cardDetails.exp_month.toString())
    formData.append('card[exp_year]', cardDetails.exp_year.toString())
    formData.append('card[cvc]', cardDetails.cvc)
    formData.append('card[name]', billingDetails.name)
    
    if (billingDetails.address) {
      formData.append('card[address_line1]', billingDetails.address.line1)
      if (billingDetails.address.line2) {
        formData.append('card[address_line2]', billingDetails.address.line2)
      }
      formData.append('card[address_city]', billingDetails.address.city)
      formData.append('card[address_state]', billingDetails.address.state)
      formData.append('card[address_zip]', billingDetails.address.postal_code)
      formData.append('card[address_country]', billingDetails.address.country)
    }

    const response = await fetch(`${STRIPE_API_BASE}/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.publishableKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to create card token'
      }
    }

    return {
      success: true,
      tokenId: data.id
    }
  }

  private async confirmPaymentIntentWithToken(
    clientSecret: string,
    tokenId: string
  ): Promise<PaymentResult> {
    const paymentIntentId = clientSecret.split('_secret_')[0]

    const formData = new URLSearchParams()
    formData.append('payment_method_data[type]', 'card')
    formData.append('payment_method_data[card][token]', tokenId)

    const response = await fetch(
      `${STRIPE_API_BASE}/payment_intents/${paymentIntentId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Payment confirmation failed'
      }
    }

    if (data.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: data.id
      }
    } else if (data.status === 'requires_action' || data.status === 'requires_confirmation') {
      return {
        success: false,
        error: 'Payment requires additional authentication'
      }
    } else {
      return {
        success: false,
        error: `Payment ${data.status}`
      }
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    if (!this.secretKey) {
      return null
    }

    try {
      const response = await fetch(
        `${STRIPE_API_BASE}/payment_intents/${paymentIntentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          }
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      return {
        id: data.id,
        clientSecret: data.client_secret,
        amount: data.amount,
        currency: data.currency,
        status: data.status
      }
    } catch (error) {
      console.error('Failed to get payment intent:', error)
      return null
    }
  }

  async refundPayment(paymentIntentId: string, reason?: string): Promise<boolean> {
    if (!this.secretKey) {
      throw new Error('Stripe not configured')
    }

    const formData = new URLSearchParams()
    formData.append('payment_intent', paymentIntentId)
    if (reason) {
      formData.append('reason', reason)
    }

    const response = await fetch(`${STRIPE_API_BASE}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    return response.ok
  }
}

export const stripeService = new StripeService()
