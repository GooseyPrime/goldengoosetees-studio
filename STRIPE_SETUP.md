# Stripe Payment Integration Setup Guide

> **📚 Related Documentation**: [Documentation Library](./docs/README.md) | [README](./README.md) | [.env.example](./.env.example)

This guide will walk you through setting up Stripe payment processing for GoldenGooseTees.

## Prerequisites

- A Stripe account (sign up at [stripe.com](https://stripe.com))
- Admin access to the GoldenGooseTees admin console

## Step 1: Get Your Stripe API Keys

### For Testing (Recommended First)

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Click "Reveal test key" and copy your **Secret key** (starts with `sk_test_`)

### For Production

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Switch to **Live mode** (toggle in the top right)
3. Copy your **Publishable key** (starts with `pk_live_`)
4. Click "Reveal live key" and copy your **Secret key** (starts with `sk_live_`)

⚠️ **Important**: Never share your secret keys publicly or commit them to version control!

## Step 2: Configure Stripe in Admin Panel

1. Log in to GoldenGooseTees as an admin user
2. Click the **Admin** button in the header
3. Navigate to the **Settings** tab
4. Find the **Stripe Configuration** card
5. Toggle **Test Mode** on (for testing) or off (for production)
6. Paste your **Publishable Key**
7. Paste your **Secret Key**
8. Click **Save Configuration**
9. Click **Test Connection** to verify the keys work

## Step 3: Test the Integration

### Test Card Numbers

When in test mode, use these card numbers:

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| **Success** | `4242 4242 4242 4242` | Payment succeeds |
| **Declined** | `4000 0000 0000 0002` | Card is declined |
| **Insufficient Funds** | `4000 0000 0000 9995` | Insufficient funds error |
| **Expired Card** | `4000 0000 0000 0069` | Card expired error |
| **Incorrect CVC** | `4000 0000 0000 0127` | Incorrect CVC error |

For all test cards:
- Use any **future expiry date** (e.g., 12/25)
- Use any **3-digit CVC** (e.g., 123)
- Use any **billing ZIP code** (e.g., 12345)

### Testing a Purchase

1. Create a custom design in the app
2. Click **Proceed to Checkout**
3. Fill in shipping address
4. Use a test card number (e.g., `4242 4242 4242 4242`)
5. Enter any future expiry date and CVC
6. Submit the payment
7. Verify the order completes successfully

You can view all test payments in your [Stripe Dashboard](https://dashboard.stripe.com/test/payments).

## Step 4: Go Live

Once you've tested thoroughly:

1. Get your **live** Stripe keys (as described in Step 1)
2. Go back to Admin → Settings → Stripe Configuration
3. Toggle **Test Mode** OFF
4. Enter your live publishable and secret keys
5. Save the configuration
6. Test with a real card (small amount recommended)
7. Verify the payment appears in your [live Stripe dashboard](https://dashboard.stripe.com/payments)

## Features

### What's Included

✅ **Secure Payment Processing**
- All payments processed through Stripe's secure API
- Card details never stored on your server
- PCI-DSS compliant tokenization

✅ **Real-time Validation**
- Card number formatting (4-digit groups)
- Expiry date validation
- CVC validation
- Clear error messages for invalid cards

✅ **Test Mode Support**
- Safely test without processing real payments
- Visual indicators when in test mode
- Easy switching between test and live

✅ **Admin Configuration**
- Simple setup through admin panel
- Connection testing
- Secure key storage

✅ **Order Integration**
- Stripe Payment Intent ID saved with each order
- Automatic order status updates
- Full payment history

### Supported Features

- ✅ Credit and debit cards
- ✅ Immediate payment capture
- ✅ Automatic currency handling (USD)
- ✅ Payment metadata (order ID, user ID, design ID)

### Not Currently Supported

- ❌ Apple Pay / Google Pay
- ❌ 3D Secure authentication
- ❌ Subscription payments
- ❌ Refunds (by design - no refunds policy)
- ❌ Payment plans / installments

## Troubleshooting

### "Stripe not configured" Error

**Solution**: Make sure you've entered and saved your API keys in Admin → Settings.

### "Invalid publishable key format" Error

**Solution**: 
- Test mode keys should start with `pk_test_`
- Live mode keys should start with `pk_live_`
- Make sure test mode setting matches your keys

### "Payment failed" Error

**Possible causes**:
1. Using a test card in live mode (or vice versa)
2. Invalid card details
3. Network connectivity issues
4. Incorrect API keys

**Solution**: Check your Stripe dashboard logs for specific error details.

### Test Mode Keys in Production

**Problem**: You accidentally used test keys in production.

**Solution**: 
1. Go to Admin → Settings
2. Toggle Test Mode OFF
3. Enter your live keys
4. Save and test with a real card

## Security Best Practices

1. **Never commit keys to git**: Keys are stored in Vercel environment variables, not in code
2. **Use test mode for development**: Always test with test keys first
3. **Restrict API keys**: Use restricted keys when possible
4. **Monitor dashboard**: Regularly check your Stripe dashboard for unusual activity
5. **Keep keys private**: Don't share your secret keys with anyone

## Support

- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available through your Stripe dashboard
- **Test Cards**: [stripe.com/docs/testing](https://stripe.com/docs/testing)

## Next Steps

After setting up Stripe:
1. Configure Printful integration (see PRINTFUL_SETUP.md)
2. Test the complete order flow (design → payment → fulfillment)
3. Set up webhook handling for payment updates (optional)
4. Configure email notifications for successful orders

---

**Need help?** Check the Stripe Dashboard logs for detailed error information, or contact Stripe support through your dashboard.
