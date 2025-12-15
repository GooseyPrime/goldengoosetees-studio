# GoldenGooseTees Kiosk - Integration Guide

This document outlines how to integrate the kiosk with external services.

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

**Location**: `src/lib/api.ts` - `api.orders.processPayment()`

**Current Implementation**: Mock payment that returns a fake payment ID

**Production Integration**:
```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async processPayment(orderId: string, paymentMethodId: string): Promise<string> {
  const order = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.total_amount * 100), // Convert to cents
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    metadata: {
      orderId: orderId
    }
  })
  
  // Update order with payment ID
  await supabase
    .from('orders')
    .update({ 
      stripe_payment_id: paymentIntent.id,
      status: 'processing'
    })
    .eq('id', orderId)
  
  return paymentIntent.id
}
```

**Frontend Integration** (using Stripe Elements):
```typescript
// In CheckoutFlow.tsx, replace the mock card inputs with:
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY!)

// Inside payment form:
const stripe = useStripe()
const elements = useElements()

const handlePaymentSubmit = async (e) => {
  e.preventDefault()
  
  const cardElement = elements!.getElement(CardElement)!
  const { paymentMethod, error } = await stripe!.createPaymentMethod({
    type: 'card',
    card: cardElement
  })
  
  if (error) {
    toast.error(error.message)
    return
  }
  
  await api.orders.processPayment(order.id, paymentMethod.id)
}
```

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

2. **Configure in the Kiosk**:
   - Log in as an admin user
   - Click **Admin** in the header
   - Go to the **Settings** tab
   - Paste your API key
   - (Optional) Enter Store ID for multiple stores
   - Click **Test Connection**
   - Click **Save Configuration**

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
- **API Key Management**: Secure storage in Spark KV
- **Connection Testing**: Verify API key before saving
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

# Printful (configured via Admin Settings UI)
PRINTFUL_API_KEY=your_printful_api_key  # Set in Admin → Settings tab
PRINTFUL_STORE_ID=your_store_id  # Optional, set in Admin → Settings tab

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
- [ ] Set up Stripe account and get API keys
- [x] **Create Printful account and configure product catalog** ✅ INTEGRATED
- [x] **Configure Printful API key via Admin Settings** ✅ INTEGRATED
- [ ] Integrate age verification service (Veriff, IDology, etc.)
- [ ] Set up email service (SendGrid, AWS SES, etc.)
- [ ] Configure OpenAI API for design generation
- [ ] Update all API functions in `src/lib/api.ts` with production code
- [ ] Add Stripe Elements to checkout flow
- [ ] Implement webhook handlers for Stripe and Printful status updates
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CDN for design file storage
- [ ] Implement trademark/IP screening logic
- [ ] Add admin authentication and authorization
- [x] **Create admin dashboard for order management** ✅ COMPLETE
- [x] **Add Printful order sync functionality** ✅ COMPLETE
- [ ] Set up automated testing for payment flow
- [ ] Configure production deployment
