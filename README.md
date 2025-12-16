# GoldenGooseTees - AI T-Shirt Design Kiosk

A sophisticated AI-powered T-shirt design kiosk that enables users to create custom designs with conversational AI guidance, then seamlessly transitions to authenticated checkout with real Stripe payment processing and Printful fulfillment.

## 🚀 Features

### ✅ Completed Integrations

- **✅ Real Stripe Payment Processing** - Fully integrated with live validation, test mode support, and admin configuration
- **✅ Real Printful API Integration** - Production-ready order fulfillment with automatic file upload and status sync
- **✅ Admin Dashboard** - Comprehensive management interface for products, orders, and integrations
- **✅ Conversational AI Design Assistant** - LLM-powered chat to guide design creation
- **✅ Multi-Area Design Support** - Front, back, and sleeve designs per product
- **✅ Guest Design Sessions** - Start designing without authentication

### 🔄 Integration Points

- **Google OAuth** - User authentication (ready to integrate)
- **Age Verification** - NSFW content gating (ready to integrate)
- **Supabase Database** - Data persistence (ready to integrate)
- **Email Notifications** - Order confirmations (ready to integrate)

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Components**: shadcn/ui v4
- **Icons**: Phosphor Icons
- **Animations**: Framer Motion
- **State Management**: React Hooks + Spark KV
- **Payments**: Stripe API
- **Fulfillment**: Printful API
- **AI**: Spark LLM integration

## 🛠️ Setup

### 1. Stripe Configuration

See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for detailed instructions.

Quick start:
1. Get API keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Login as admin → Settings → Stripe Configuration
3. Enter your keys and save
4. Test with card: `4242 4242 4242 4242`

### 2. Printful Configuration

See [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) for detailed instructions.

Quick start:
1. Get API key from [Printful Settings](https://www.printful.com/dashboard/settings)
2. Login as admin → Settings → Printful Configuration
3. Enter your key and test connection
4. Map product SKUs to Printful variant IDs

### 3. Run the Application

The application is already running in your Spark environment. Just interact with it!

## 📚 Documentation

- [PRD.md](./PRD.md) - Product Requirements Document
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration guide for all services
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Detailed Stripe setup instructions
- [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) - Detailed Printful setup instructions
- [SECURITY.md](./SECURITY.md) - Security considerations

## 🎯 User Flow

1. **Browse Products** - View available T-shirt products
2. **Start Designing** - Select a product and chat with AI assistant
3. **Generate Designs** - AI creates designs based on conversation
4. **Iterate** - Request changes until design is perfect
5. **Authenticate** - Login with Google (or test account) when ready to checkout
6. **Checkout** - Enter shipping and payment details
7. **Order Placed** - Order submitted to Printful automatically
8. **Track Order** - Receive tracking info via email

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
- **Stripe Configuration**: API keys, test mode toggle, connection testing
- **Printful Configuration**: API key, store ID, connection testing

## 🧪 Testing

### Test Mode

Both Stripe and Printful support test modes:

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

**Printful:**
- Use test API key for development
- Orders won't actually be fulfilled
- Check Printful dashboard for test orders

### Test Account

Login with the mock authentication to get an admin account for testing.

## 🚧 Future Enhancements

- [ ] Google OAuth integration
- [ ] Age verification API integration
- [ ] Supabase database connection
- [ ] Email notification service
- [ ] Enhanced AI design generation
- [ ] Catalog browsing and shopping
- [ ] Order history for users
- [ ] Design templates library
- [ ] Social sharing features

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.

## 🆘 Support

- **Stripe Issues**: Check [STRIPE_SETUP.md](./STRIPE_SETUP.md) or Stripe Dashboard logs
- **Printful Issues**: Check [PRINTFUL_SETUP.md](./PRINTFUL_SETUP.md) or Printful Dashboard
- **General Integration**: See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

---

**Ready to go live?** Follow the setup guides for Stripe and Printful, then start taking real orders! 🎉
