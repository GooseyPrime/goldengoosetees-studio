# GoldenGooseTees - AI T-Shirt Design Kiosk

A sophisticated AI-powered T-shirt design kiosk that enables users to create custom designs with conversational AI guidance (GPT-4), then seamlessly transitions to authenticated checkout with Google OAuth, Supabase database storage, real Stripe payment processing, and Printful fulfillment.

## 🚀 Features

### ✅ Completed Integrations

- **✅ Real Stripe Payment Processing** - Fully integrated with live validation, test mode support, and admin configuration
- **✅ Real Printful API Integration** - Production-ready order fulfillment with automatic file upload and status sync
- **✅ Supabase Database Integration** - User authentication, design storage, and order management with Google OAuth
- **✅ Dynamic LLM Chat Assistant** - GPT-4 powered conversational AI with sales script methodology (no hardcoded responses)
- **✅ Admin Dashboard** - Comprehensive management interface for products, orders, integrations, and Supabase configuration
- **✅ Multi-Area Design Support** - Front, back, and sleeve designs per product
- **✅ Guest Design Sessions** - Start designing without authentication

### 🔄 Integration Points

- **Google OAuth** - Integrated via Supabase for user authentication
- **Age Verification** - NSFW content gating (ready to integrate)
- **Email Notifications** - Order confirmations (ready to integrate)

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Components**: shadcn/ui v4
- **Icons**: Phosphor Icons
- **Animations**: Framer Motion
- **State Management**: React Hooks + Spark KV
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **Payments**: Stripe API
- **Fulfillment**: Printful API
- **AI**: Spark LLM (GPT-4) with dynamic sales script

## 🛠️ Setup

### 1. Supabase Configuration

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

Quick start:
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema setup for database tables
3. Configure Google OAuth in Google Cloud Console
4. Enable Google provider in Supabase Authentication
5. Login as admin → Settings → Supabase Configuration
6. Enter your Supabase URL and Anon Key
7. Test connection to verify setup

### 2. Stripe Configuration

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for detailed instructions.

Quick start:
1. Get API keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Login as admin → Settings → Stripe Configuration
3. Enter your keys and save
4. Test with card: `4242 4242 4242 4242`

### 3. Printful Configuration

See [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) for detailed instructions.

Quick start:
1. Get API key from [Printful Settings](https://www.printful.com/dashboard/settings)
2. Login as admin → Settings → Printful Configuration
3. Enter your key and test connection
4. Map product SKUs to Printful variant IDs

### 4. Run the Application

The application is already running in your Spark environment. Just interact with it!

## 📚 Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration guide for all services
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Detailed Supabase and Google OAuth setup
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Detailed Stripe setup instructions
- [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) - Detailed Printful setup instructions
- [SECURITY.md](./SECURITY.md) - Security considerations

## 🎯 User Flow

1. **Browse Products** - View available T-shirt products
2. **Start Designing** - Select a product and chat with AI assistant (GPT-4)
3. **AI Conversation** - Dynamic LLM guides you through design creation with sales script methodology
4. **Generate Designs** - AI creates designs based on natural conversation
5. **Iterate** - Request changes, AI adapts responses based on context
6. **Authenticate** - Login with Google OAuth via Supabase when ready to checkout
7. **Checkout** - Enter shipping and payment details with Stripe
8. **Order Placed** - Order submitted to Printful automatically, stored in Supabase
9. **Track Order** - Order status synced between Supabase and Printful

## 🔐 Admin Features

Access admin dashboard by logging in as an admin user and clicking "Admin" button.

### Overview Tab
- Real-time statistics (revenue, orders, products)
- Pending order and design approval counts

### Products Tab
- Full CRUD operations on products
- SKU mapping to Printful variants
- Print area configuration
- Availability toggling

### Orders Tab
- Search and filter orders
- View detailed order information
- Update order status
- Sync with Printful in real-time
- Add tracking numbers

### Design Approvals Tab
- Review designs submitted for catalog
- Preview all print areas
- Approve or reject designs
- Flag NSFW content

### Settings Tab
- **Supabase Configuration**: Project URL, Anon Key, connection testing, setup checklist
- **Stripe Configuration**: API keys, test mode toggle, connection testing
- **Printful Configuration**: API key, store ID, connection testing

## 🤖 AI Assistant Features

The conversational AI assistant uses GPT-4 with a structured sales script approach:

- **No Hardcoded Responses**: All responses dynamically generated by LLM
- **Sales Script Methodology**: Follows structured stages (greeting, discovery, exploration, refinement, generation, approval)
- **Context-Aware**: Understands product constraints, print areas, DPI requirements
- **Intent Detection**: Recognizes when to generate designs or show approval options
- **Natural Conversation**: Asks clarifying questions, validates ideas, suggests improvements
- **Product Knowledge**: Knows dimensions, constraints, and capabilities of each product

## 🧪 Testing

### Test Mode

All services support test modes:

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

**Printful:**
- Use test API key for development
- Orders won't actually be fulfilled
- Check Printful dashboard for test orders

**Supabase:**
- Use development project for testing
- Test Google OAuth flow in development environment
- Verify database tables are created correctly

### Test Account

Login with the mock authentication to get an admin account for testing before configuring Supabase.

## 🚧 Future Enhancements

- [ ] Age verification API integration (3rd party service)
- [ ] Email notification service (SendGrid/Postmark)
- [ ] Enhanced AI design generation (DALL-E/Midjourney integration)
- [ ] Catalog browsing and shopping from public designs
- [ ] Order history interface for end users
- [ ] Design templates library
- [ ] Social sharing features
- [ ] Batch order processing for admins

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.

## 🆘 Support

- **Supabase Issues**: Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) or Supabase Dashboard logs
- **Stripe Issues**: Check [STRIPE_SETUP.md](./STRIPE_SETUP.md) or Stripe Dashboard logs
- **Printful Issues**: Check [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) or Printful Dashboard
- **General Integration**: See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

---

**Ready to go live?** Follow the setup guides for Supabase, Stripe, and Printful, then start taking real orders! 🎉
