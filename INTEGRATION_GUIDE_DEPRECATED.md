# GoldenGooseTees - Integration Guide

> **⚠️ DEPRECATED**: This document contains outdated information and has been superseded by individual setup guides. For current, accurate documentation, see:
> - **[Documentation Library](./docs/README.md)** - Complete indexed documentation
> - **[Supabase Setup](./SUPABASE_SETUP.md)** - Authentication (Supabase Auth with Google OAuth, NOT Firebase)
> - **[AI System Guide](./AI_SYSTEM_GUIDE.md)** - AI providers (Gemini-first, NOT OpenRouter-first)
> - **[Stripe Setup](./STRIPE_SETUP.md)** - Payment processing
> - **[Printful Setup](./PRINTFUL_SETUP.md)** - Order fulfillment
>
> **Historical Context**: This document was created during early development and references Firebase Auth and different AI provider priorities. The actual implementation uses Supabase Auth and Gemini as the primary AI provider.

---

# GoldenGooseTees - Integration Guide (HISTORICAL)

This document outlines how to integrate the app with external services.

## 🔌 Integration Points

### 1. Google OAuth Authentication

**Location**: `src/lib/api.ts` - `api.auth.loginWithGoogle()`

**Current Implementation**: Mock authentication that returns a demo user

**Production Integration**:
```typescript
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

async loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  
  const user: User = {
    id: result.user.uid,
    email: result.user.email!,
    name: result.user.displayName!,
    avatar: result.user.photoURL || undefined,
    ageVerified: false,
    role: 'user',
    createdAt: new Date().toISOString()
  }
  
  // Store in Supabase
  await supabase.from('users').upsert(user)
  
  return user
}
```

### 2. Age Verification API

**Location**: `src/lib/api.ts` - `api.auth.verifyAge()`

**Current Implementation**: Mock verification that always returns true after delay

**Production Integration** (example with Veriff):
```typescript
async verifyAge(userId: string, verificationData: any): Promise<boolean> {
  const response = await fetch('https://api.veriff.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VERIFF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      verification: {
        person: {
          dateOfBirth: verificationData.dob
        }
      }
    })
  })
  
  const result = await response.json()
  const isVerified = result.verification.status === 'approved'
  
  // Update user in Supabase
  await supabase
    .from('users')
    .update({ ageVerified: isVerified })
    .eq('id', userId)
  
  return isVerified
}
```

### 3. Supabase Database

**Location**: `src/lib/api.ts` - all `designs` and `orders` methods

**Database Schema**:

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  age_verified BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Designs table
CREATE TABLE designs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  product_id TEXT NOT NULL,
  files JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_nsfw BOOLEAN DEFAULT FALSE,
  title TEXT NOT NULL,
  description TEXT,
  catalog_section TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  design_id TEXT REFERENCES designs(id) NOT NULL,
  product_id TEXT NOT NULL,
  stripe_payment_id TEXT,
  printful_order_id TEXT,
  status TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  tracking_number TEXT,
  estimated_delivery TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Catalog sections table
CREATE TABLE catalog_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating TEXT NOT NULL,
  design_type TEXT NOT NULL
);
```

**Production Integration**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

designs: {
  async save(design: Partial<Design>): Promise<Design> {
    const { data, error } = await supabase
      .from('designs')
      .insert({
        id: design.id || `design-${Date.now()}`,
        user_id: design.userId,
        product_id: design.productId,
        files: design.files,
        is_public: design.isPublic,
        is_nsfw: design.isNSFW,
        title: design.title,
        description: design.description,
        catalog_section: design.catalogSection
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Design
  }
}
```

### 4. Stripe Payment Processing

**Location**: `src/lib/stripe.ts` and `src/lib/api.ts` - `api.orders.processPayment()`

**Current Implementation**: ✅ **FULLY INTEGRATED** with real Stripe API

The Stripe integration is now production-ready and includes:

- **Real API Integration**: Full Stripe API client (`StripeService`) with secure authentication
- **Payment Intent Flow**: Proper payment intent creation and confirmation
- **Card Tokenization**: Secure card token creation (no raw card data stored)
- **Live Validation**: Real-time card number, expiry, and CVC validation
- **Admin Configuration**: UI for managing API keys with test/live mode toggle
- **Test Mode Support**: Visual indicators and test card suggestions
- **Error Handling**: Comprehensive error handling with user-friendly messages

**Setup Instructions**:

1. **Get Your Stripe API Keys**:
   - Log in to [Stripe Dashboard](https://dashboard.stripe.com)
   - Toggle between Test/Live mode
   - Copy your Publishable Key (pk_test_* or pk_live_*)
   - Reveal and copy your Secret Key (sk_test_* or sk_live_*)

2. **Configure in the Admin Console**:
   - Log in as an admin user
   - Click **Admin** in the header
   - Go to the **Settings** tab
   - Find **Stripe Configuration**
   - Toggle **Test Mode** (on for testing, off for production)
   - Paste your Publishable Key
   - Paste your Secret Key
   - Click **Save Configuration**
   - Click **Test Connection** to verify

3. **Test the Integration**:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/25)
   - Any 3-digit CVC (e.g., 123)
   - Complete a test order

4. **Go Live**:
   - Switch to live Stripe keys
   - Toggle Test Mode OFF
   - Save configuration
   - Test with a real card (small amount)

**Key Features**:
```typescript
// The StripeService class provides:
- createPaymentIntent(order) // Create payment intent
- confirmCardPayment(clientSecret, card, billing) // Process payment
- getPaymentIntent(id) // Check payment status
- refundPayment(id) // Process refunds (admin only)
```

**Admin Features**:
- **API Key Management**: Secure storage in Spark KV
- **Test/Live Mode Toggle**: Easy switching between environments
- **Connection Testing**: Verify API keys work
- **Test Card Reference**: Built-in test card numbers guide
- **Security**: Secret keys never exposed in UI

**Payment Flow**:
1. User completes shipping information
2. Enters card details with live validation
3. System creates Stripe Payment Intent
4. Card is tokenized securely
5. Payment is confirmed via Stripe API
6. Stripe Payment ID stored with order
7. Order submitted to Printful
8. Confirmation email sent

For detailed setup instructions, see [STRIPE_SETUP.md](./STRIPE_SETUP.md)

### 5. Printful Order Fulfillment

**Location**: `src/lib/printful.ts` and `src/lib/api.ts` - `api.orders.submitToPrintful()`

**Current Implementation**: ✅ **FULLY INTEGRATED** with real Printful API

The Printful integration is now production-ready and includes:

- **Real API Integration**: Full Printful API client (`PrintfulService`) with authentication
- **Automatic Order Submission**: Orders are submitted to Printful after payment
- **File Upload**: Design files are automatically uploaded to Printful
- **Status Synchronization**: Real-time order status sync from Printful
- **Admin Configuration**: UI for managing API keys and testing connection
- **Fallback Handling**: Graceful degradation if Printful is unavailable

**Setup Instructions**:

1. **Get Your Printful API Key**:
   - Log in to [Printful](https://www.printful.com)
   - Go to Settings → Stores
   - Select your store (or create one)
   - Click "Add API Access"
   - Copy your API key

2. **Configure in Vercel (Server-Side)**:
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Add `PRINTFUL_API_KEY` with your API key
   - (Optional) Add `PRINTFUL_STORE_ID` if you have multiple stores
   - **Redeploy** your application

3. **Verify in the Admin Console**:
   - Log in as an admin user
   - Click **Admin** in the header
   - Go to the **Settings** tab
   - Find **Printful Configuration**
   - Click **Refresh Status** to check configuration
   - Click **Test Connection** to verify

3. **Product SKU Mapping**:
   - Go to **Admin** → **Products**
   - Edit each product
   - Set the **Printful SKU** field to the Printful variant ID
   - Common variant IDs:
     - `71` - Bella + Canvas 3001 (Unisex Jersey Tee)
     - `146` - Gildan 5000 (Heavy Cotton Tee)
     - `163` - Gildan 2400 (Long Sleeve Tee)

4. **Order Flow**:
   - Customer completes checkout
   - Design files uploaded to Printful
   - Order created and confirmed automatically
   - Tracking info synced when available

**Key Features**:
```typescript
// The PrintfulService class provides:
- getProducts() // Fetch product catalog
- getVariant(id) // Get variant details
- createOrder(data) // Submit order
- confirmOrder(id) // Confirm for fulfillment
- getOrder(id) // Get order status
- uploadFile(file) // Upload design files
- syncOrder(orderId) // Sync status with Printful
```

**Admin Features**:
- **Server-Side Configuration**: API keys configured in Vercel environment variables (never exposed to browser)
- **Status Display**: Shows if Printful is configured on the server
- **Connection Testing**: Verify API key works (requires admin auth)
- **Order Syncing**: Manual sync button for each order
- **Status Tracking**: Real-time order status from Printful
- **Tracking Numbers**: Automatically fetched when available

For detailed setup instructions, see [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md)

### 6. AI Design Generation

**Location**: `src/lib/api.ts` - `api.ai.generateDesign()` and `api.ai.chat()`

**Current Implementation**: Mock AI that generates simple SVG designs and generic responses

**Production Integration** (using OpenAI DALL-E and GPT-4):
```typescript
async chat(messages: Array<{ role: string, content: string }>): Promise<string> {
  const prompt = spark.llmPrompt`
    You are an expert T-shirt design assistant. Help users create print-ready designs.
    Consider these constraints:
    - Designs must be 150-300 DPI
    - Formats: PNG or SVG
    - Must respect print area dimensions
    - Guide users on typography licensing
    
    Conversation history:
    ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
    
    Provide helpful, creative guidance.
  `
  
  return await spark.llm(prompt, 'gpt-4o')
}

async generateDesign(prompt: string, constraints: any): Promise<string> {
  // Option 1: Use DALL-E for image generation
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: `T-shirt design: ${prompt}. High quality, print-ready, ${constraints.widthInches}x${constraints.heightInches} inches`,
      size: '1024x1024',
      quality: 'hd'
    })
  })
  
  const result = await response.json()
  return result.data[0].url
  
  // Option 2: Use Spark's built-in LLM with image generation
  // (Implementation depends on Spark's image generation capabilities)
}
```

### 7. Email Notifications

**Location**: After order completion in `CheckoutFlow.tsx`

**Production Integration** (using SendGrid):
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

async function sendOrderConfirmation(order: Order, user: User) {
  const msg = {
    to: user.email,
    from: 'orders@goldengoosetees.com',
    subject: `Order Confirmation - ${order.id}`,
    html: `
      <h1>Thank you for your order!</h1>
      <p>Your custom T-shirt is being prepared for production.</p>
      <p><strong>Order Number:</strong> ${order.id}</p>
      <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery!).toLocaleDateString()}</p>
      <p><strong>Tracking Number:</strong> ${order.trackingNumber || 'Will be provided when shipped'}</p>
      <p>We'll send you updates as your order progresses.</p>
    `
  }
  
  await sgMail.send(msg)
}
```

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Printful (server-side only - set in Vercel Environment Variables)
PRINTFUL_API_KEY=your_printful_api_key  # Required, server-only
PRINTFUL_STORE_ID=your_store_id  # Optional, server-only
ALLOW_PRINTFUL_MOCK_ORDERS=false  # Optional, default: false (disables mock orders in production)

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Age Verification (e.g., Veriff)
VERIFF_API_KEY=your_veriff_api_key

# Email (e.g., SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key

# Firebase (for Google OAuth)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
```

## 📝 Implementation Checklist

- [ ] Set up Supabase project and create database tables
- [ ] Configure Google OAuth in Firebase
- [x] **Set up Stripe account and get API keys** ✅ INTEGRATED
- [x] **Configure Stripe API keys via Admin Settings** ✅ INTEGRATED
- [x] **Create Printful account and configure product catalog** ✅ INTEGRATED
- [x] **Configure Printful API key via Admin Settings** ✅ INTEGRATED
- [ ] Integrate age verification service (Veriff, IDology, etc.)
- [ ] Set up email service (SendGrid, AWS SES, etc.)
- [ ] Configure OpenAI API for design generation
- [ ] Update authentication API functions in `src/lib/api.ts` with production code
- [x] **Implement Stripe payment processing** ✅ COMPLETE
- [x] **Add card validation and formatting** ✅ COMPLETE
- [ ] Implement webhook handlers for Stripe and Printful status updates
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CDN for design file storage
- [ ] Implement trademark/IP screening logic
- [ ] Add admin authentication and authorization
- [x] **Create admin dashboard for order management** ✅ COMPLETE
- [x] **Add Printful order sync functionality** ✅ COMPLETE
- [x] **Add Stripe configuration UI** ✅ COMPLETE
- [ ] Set up automated testing for payment flow
- [ ] Configure production deployment
