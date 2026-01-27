import { Order } from './types'

// Environment variables (Vite)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY || import.meta.env.VITE_STRIPE_SECRET_KEY
const STRIPE_TEST_MODE = import.meta.env.VITE_STRIPE_TEST_MODE === 'true'

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

export interface CheckoutSession {
  id: string
  url: string
}

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

class StripeService {
  private publishableKey: string | null = STRIPE_PUBLISHABLE_KEY || null
  private secretKey: string | null = STRIPE_SECRET_KEY || null
  private isTestMode: boolean = STRIPE_TEST_MODE

  initialize() {
    // Keys are loaded from environment variables at module load time
    if (!this.publishableKey) {
      console.warn('Stripe publishable key not configured. Set VITE_STRIPE_PUBLISHABLE_KEY.')
    }
    if (!this.secretKey) {
      console.warn('Stripe secret key not configured. For production, use server-side functions.')
    }
  }

  isConfigured(): boolean {
    // Publishable key is required client-side; secret key should be server-side in production.
    return !!this.publishableKey
  }

  getPublishableKey(): string | null {
    return this.publishableKey
  }

  getIsTestMode(): boolean {
    return this.isTestMode
  }

  async createPaymentIntent(order: Order): Promise<PaymentIntent> {
    const amountInCents = Math.round(order.totalAmount * 100)

    const description = `GoldenGooseTees Order #${order.id.slice(-8).toUpperCase()}`

    // Prefer server-side Stripe secret key; fall back to direct calls if explicitly provided.
    let data: any
    if (!this.secretKey) {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInCents,
          currency: 'usd',
          description,
          metadata: {
            order_id: order.id,
            user_id: order.userId,
            design_id: order.designId,
          },
        }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to create payment intent')
      }
      data = json
    } else {
      const formData = new URLSearchParams()
      formData.append('amount', amountInCents.toString())
      formData.append('currency', 'usd')
      formData.append('automatic_payment_methods[enabled]', 'true')
      formData.append('metadata[order_id]', order.id)
      formData.append('metadata[user_id]', order.userId)
      formData.append('metadata[design_id]', order.designId)
      formData.append('description', description)

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

      data = await response.json()
    }

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

    let data: any
    if (!this.secretKey) {
      const response = await fetch('/api/stripe/confirm-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, tokenId }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { success: false, error: json?.error || 'Payment confirmation failed' }
      }
      data = json
    } else {
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

      data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Payment confirmation failed'
        }
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

  // ==========================================
  // Stripe Checkout Session
  // ==========================================

  async createCheckoutSession(options: {
    orderId: string
    productName: string
    productDescription?: string
    productImage?: string
    amount: number // in dollars
    customerEmail: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }): Promise<CheckoutSession> {
    let data: any
    if (!this.secretKey) {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to create checkout session')
      }
      data = json
    } else {
      const amountInCents = Math.round(options.amount * 100)

      const formData = new URLSearchParams()
      formData.append('mode', 'payment')
      formData.append('success_url', options.successUrl)
      formData.append('cancel_url', options.cancelUrl)
      formData.append('customer_email', options.customerEmail)

      // Line item
      formData.append('line_items[0][price_data][currency]', 'usd')
      formData.append('line_items[0][price_data][unit_amount]', amountInCents.toString())
      formData.append('line_items[0][price_data][product_data][name]', options.productName)
      if (options.productDescription) {
        formData.append('line_items[0][price_data][product_data][description]', options.productDescription)
      }
      if (options.productImage) {
        formData.append('line_items[0][price_data][product_data][images][0]', options.productImage)
      }
      formData.append('line_items[0][quantity]', '1')

      // Metadata
      formData.append('metadata[order_id]', options.orderId)
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([key, value]) => {
          formData.append(`metadata[${key}]`, value)
        })
      }

      // Shipping address collection
      formData.append('shipping_address_collection[allowed_countries][0]', 'US')
      formData.append('shipping_address_collection[allowed_countries][1]', 'CA')

      const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create checkout session')
      }

      data = await response.json()
    }

    return {
      id: data.id,
      url: data.url
    }
  }

  async getCheckoutSession(sessionId: string): Promise<any> {
    try {
      const response = this.secretKey
        ? await fetch(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${this.secretKey}` },
          })
        : await fetch(`/api/stripe/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`)

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get checkout session:', error)
      return null
    }
  }

  // Redirect to Stripe Checkout (client-side)
  redirectToCheckout(url: string): void {
    window.location.href = url
  }
}

export const stripeService = new StripeService()
