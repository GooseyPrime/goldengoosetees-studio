# GoldenGooseTees Kiosk - Product Requirements Document

A sophisticated AI-powered T-shirt design kiosk that enables guest users to create custom designs with conversational guidance, then seamlessly transitions to authenticated checkout with Printful fulfillment and catalog publication.

**Experience Qualities**:
1. **Effortless** - Users start designing immediately without barriers, with AI guidance removing complexity from the creative process
2. **Professional** - Enterprise-grade integrations (Printful, Stripe, age verification) create trust and reliability throughout the journey
3. **Delightful** - Conversational AI makes design creation feel like collaborating with an expert designer rather than fighting with software

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a multi-phase application with guest sessions, authentication gating, payment processing, external API integrations (Printful, Stripe, Supabase, age verification), admin interfaces, catalog management, and sophisticated state management across design iterations.

## Essential Features

### 1. Guest Design Session
- **Functionality**: Anonymous users can immediately start designing with AI conversation, iterate on designs, see live previews
- **Purpose**: Removes friction from creative exploration, maximizes conversion by letting users invest time before authentication
- **Trigger**: Landing on kiosk homepage
- **Progression**: View product catalog → Select product → AI conversation begins → Describe desired design → AI generates design → Preview on mockup → Request iterations → Approve final design → Trigger publish/checkout
- **Success criteria**: User can complete full design iteration cycle without authentication; design state persists through auth flow

### 2. Conversational AI Design Assistant
- **Functionality**: LLM-powered chat interface guides users through design creation, understands product constraints, generates appropriate designs
- **Purpose**: Democratizes design by removing technical expertise requirement; ensures designs meet print specifications
- **Trigger**: User selects product to customize
- **Progression**: AI greets user → Asks design preferences → Validates against product constraints → Generates design → Shows mockup preview → Accepts iteration requests → Guides to final approval
- **Success criteria**: AI successfully enforces DPI/format/area constraints; generates print-ready files; handles iteration requests intelligently

### 3. Authentication Gate at Publish
- **Functionality**: System requires Google OAuth login when user attempts to publish design or proceed to checkout
- **Purpose**: Balances frictionless exploration with account management for orders/catalog
- **Trigger**: User clicks "Publish to Catalog" or "Proceed to Checkout"
- **Progression**: User approves design → Clicks publish/checkout → Auth modal appears → Google OAuth flow → Age verification (if NSFW) → Return to design with authenticated context → Continue to selected action
- **Success criteria**: Design state preserved through auth; age verification blocks NSFW for unverified users; seamless return to flow

### 4. Age Verification System
- **Functionality**: Third-party API validates user is 18+ before allowing NSFW content publishing or ordering
- **Purpose**: Legal compliance and content moderation
- **Trigger**: Authenticated user with NSFW-flagged design attempts to publish or checkout
- **Progression**: Auth complete → System detects NSFW content → Age verification modal → User provides verification data → API validates → Result stored in Supabase → Access granted or design blocked
- **Success criteria**: NSFW designs blocked for unverified users; verification status persists; clear messaging on requirements

### 5. Multi-Area Design Support
- **Functionality**: Products support multiple print areas (front, back, sleeve) with independent designs per area
- **Purpose**: Enables complex products matching Printful capabilities
- **Trigger**: User selects product with multiple print areas
- **Progression**: Select product → AI asks "Design front first or back?" → User specifies → Design area 1 → Approve → "Add design to [other area]?" → Design area 2 → Approve all areas → Proceed to publish/checkout
- **Success criteria**: Each area stored separately in Supabase; all required areas must be completed; preview shows all areas on mockup

### 6. Stripe Checkout Integration
- **Functionality**: Secure payment processing with immediate capture; no refunds/cancellations after completion
- **Purpose**: Revenue collection with clear transaction finality
- **Trigger**: User proceeds from authenticated design approval to checkout
- **Progression**: Review order → See final price → Stripe payment form → Enter card details → Submit → Payment captured → Order confirmed → Printful API called
- **Success criteria**: Payment processed securely; Stripe payment ID stored in Supabase; clear "no refunds" messaging displayed pre-payment

### 7. Printful Order Fulfillment
- **Functionality**: Automated order submission to Printful with design files, product SKU, shipping details
- **Purpose**: Hands-free fulfillment and shipping
- **Trigger**: Successful Stripe payment
- **Progression**: Payment complete → System calls Printful API → Submits design files + product SKU + shipping address → Printful confirms order → Tracking info returned → Email sent to user → Order status tracked in Supabase
- **Success criteria**: Design files correctly formatted for Printful; order successfully created; tracking info captured; delivery estimate displayed

### 8. Public Catalog System
- **Functionality**: Users can publish approved designs to public catalog, sectioned by rating and design type
- **Purpose**: Community showcase and potential template marketplace
- **Trigger**: User selects "Publish to Catalog" instead of "Order Now"
- **Progression**: Approve design → Click "Publish to Catalog" → Auth/verify → Select public/private flag → Rate design (SFW/NSFW) → AI analyzes design type → Design saved to catalog table → Routed to appropriate section → Visible in catalog browser
- **Success criteria**: Designs correctly categorized; rating-based sections enforced; private designs hidden from catalog; public designs browsable

### 9. Order History & Design Management
- **Functionality**: Authenticated users can view past orders, saved designs, and re-order or remix previous designs
- **Purpose**: Encourages repeat purchases and design iteration
- **Trigger**: User navigates to "My Account" section
- **Progression**: Login → View account → See order history with tracking → See saved designs → Click design to view → Option to "Reorder" or "Remix Design" → Enters design flow with prefilled data
- **Success criteria**: All user orders displayed with current status; designs retrievable; reorder creates new Printful order; remix loads design into AI session

### 10. Admin Dashboard
- **Functionality**: Comprehensive admin interface for managing products, orders, and design approvals with real-time statistics and bulk operations
- **Purpose**: Centralized control panel for store operators to manage inventory, fulfill orders, and moderate community designs
- **Trigger**: Admin user clicks "Admin" button in header navigation
- **Progression**: Click Admin → Dashboard overview with key metrics → Switch between Products/Orders/Design Approvals tabs → Manage individual items → Update status → Save changes → Changes reflected immediately
- **Success criteria**: 
  - **Statistics Dashboard**: Real-time metrics showing total revenue, active products, pending orders, and pending design approvals with trend indicators
  - **Product Management**: Full CRUD operations on products including SKU mapping, print area configuration, DPI constraints, and availability toggling
  - **Order Management**: Search and filter orders by status, view detailed order information, update order status (pending → processing → fulfilled → shipped → delivered), add tracking numbers
  - **Design Approvals**: Review designs submitted for catalog publication, preview all print areas, flag NSFW content, approve for catalog sections, or reject with reason

## Edge Case Handling

- **Session Timeout During Design** - Design state auto-saved to localStorage; restored on return
- **Payment Failure** - Clear error messaging; retry option; design preserved for retry
- **Printful API Failure** - Order marked as pending; retry mechanism; admin notification
- **Age Verification Failure** - Clear requirements displayed; design saved but unpublishable until verified
- **Trademark/IP Infringement Detection** - AI pre-screens designs; flags suspicious content for manual review before Printful submission
- **Multiple Browser Sessions** - Design state tied to session ID; warning if opening in multiple tabs
- **Incomplete Multi-Area Designs** - Checkout disabled until all required areas completed; clear indicator of completion status
- **Network Interruption** - Design drafts auto-saved every 30s; recovery modal on reconnection

## Design Direction

The design should evoke a sense of creative empowerment mixed with professional reliability. It's a high-tech vending machine experience—playful and approachable in the AI conversation, but serious and trustworthy when handling payments and fulfillment. The interface should feel like a boutique design studio condensed into a kiosk, with bold product imagery and a clean, focused workflow that keeps users moving forward.

## Color Selection

A vibrant, confident palette that balances creative energy with professional trust:

- **Primary Color**: Bold Electric Blue (oklch(0.55 0.18 250)) - Represents innovation and the AI-powered core; commands attention for CTAs like "Generate Design" and "Proceed to Checkout"
- **Secondary Colors**: 
  - Deep Charcoal (oklch(0.25 0.01 280)) - Grounding color for text and structural elements; conveys sophistication
  - Warm Slate (oklch(0.45 0.02 260)) - Mid-tone for secondary UI elements and borders
- **Accent Color**: Energetic Coral (oklch(0.68 0.17 25)) - Pops against blue for important actions, warnings about NSFW, and "No Refunds" messaging
- **Foreground/Background Pairings**:
  - Background White (oklch(0.98 0 0)): Deep Charcoal text (oklch(0.25 0.01 280)) - Ratio 11.8:1 ✓
  - Primary Blue (oklch(0.55 0.18 250)): White text (oklch(0.98 0 0)) - Ratio 6.2:1 ✓
  - Accent Coral (oklch(0.68 0.17 25)): White text (oklch(0.98 0 0)) - Ratio 4.5:1 ✓
  - Muted Light Gray (oklch(0.94 0.005 280)): Warm Slate text (oklch(0.45 0.02 260)) - Ratio 5.1:1 ✓

## Font Selection

Typefaces should convey modern tech sophistication while remaining approachable for a consumer-facing kiosk:

- **Headings**: Space Grotesk - Geometric sans with distinctive character; perfect for "GoldenGooseTees" branding and product names
- **Body/UI**: Inter - Exceptional readability at all sizes; neutral enough for conversational AI text
- **Accent/Numbers**: JetBrains Mono - For order numbers, SKUs, pricing; adds technical credibility

- **Typographic Hierarchy**:
  - H1 (Kiosk Title): Space Grotesk Bold/48px/tight letter-spacing/-0.02em
  - H2 (Product Names): Space Grotesk SemiBold/32px/tight letter-spacing/-0.01em
  - H3 (Section Headers): Space Grotesk Medium/24px/normal letter-spacing
  - Body (AI Conversation): Inter Regular/16px/line-height 1.6
  - Button Labels: Inter SemiBold/14px/uppercase/letter-spacing/0.05em
  - Pricing: JetBrains Mono Medium/20px/tabular-nums

## Animations

Animations should reinforce the "smart machine" feel—purposeful, smooth, and subtly reactive:

- **AI Message Appearance**: Gentle fade-up with slight scale (0.97→1) over 200ms as each message arrives
- **Design Preview Loading**: Skeleton shimmer while generating; cross-fade transition when design loads (300ms)
- **Auth Modal**: Backdrop blur-in (150ms) + modal scale-up from 0.95 (250ms with spring easing)
- **Product Card Hover**: Subtle lift (translateY -4px) + shadow expansion over 200ms
- **Checkout Progress**: Smooth slide transitions between steps (300ms ease-in-out)
- **Success Confirmation**: Celebratory scale pulse (1→1.05→1) over 400ms with confetti-style particle effect
- **Error States**: Gentle shake animation (5px horizontal) over 400ms
- **Auto-save Indicator**: Fade in/out pulsing dot when saving design state

## Component Selection

- **Components**:
  - **Chat Interface**: Custom component with ScrollArea for AI conversation; Input for user messages; avatar badges for AI vs user
  - **Product Grid**: Card components with hover states; AspectRatio for consistent product image sizing
  - **Design Preview**: Custom 3D mockup component (Three.js) showing T-shirt with applied design; toggle views (front/back)
  - **Auth Flow**: Dialog with Google OAuth button; embedded age verification form when needed
  - **Checkout**: Multi-step wizard using Tabs; Stripe Elements integration; final review Card
  - **Order History**: Table component with expandable rows for order details; Badge for status indicators
  - **Admin Panel**: Sidebar navigation; Form components with validation; data tables for product management
  - **Catalog Browser**: Masonry grid layout with Card components; Select for filtering by rating/type
  - **Toast Notifications**: Sonner for success/error feedback throughout

- **Customizations**:
  - **T-Shirt Mockup Viewer**: Custom Three.js component that maps 2D designs onto 3D shirt model with lighting and rotation
  - **Conversational AI Bubble**: Custom message component with typing indicators and regenerate buttons
  - **Design Constraint Indicator**: Visual progress component showing DPI/format/size requirements met
  - **Multi-Area Design Manager**: Custom split-view component showing all print areas simultaneously

- **States**:
  - Buttons: Idle (solid color), Hover (slight brightness increase + lift), Active (pressed down), Disabled (reduced opacity + no pointer)
  - Inputs: Idle (subtle border), Focus (bright ring + border color shift), Error (red ring + error message below), Success (green checkmark)
  - Cards: Default (subtle shadow), Hover (shadow expansion + border highlight), Selected (bold border + background tint)

- **Icon Selection**:
  - Chat/AI: ChatsCircle, Sparkle, Robot for AI assistant
  - Design: PaintBrush, Palette, Image for design actions
  - Authentication: GoogleLogo, ShieldCheck, IdentificationCard
  - Checkout: CreditCard, ShoppingCart, Package
  - Product Areas: TShirt, ArrowsOutCardinal for multi-area management
  - Status: CheckCircle, Warning, Clock, Truck for order tracking
  - Navigation: List, Grid, MagnifyingGlass, User

- **Spacing**:
  - Page margins: px-6 md:px-12
  - Section gaps: space-y-8 md:space-y-12
  - Card padding: p-6
  - Button padding: px-6 py-3
  - Input padding: px-4 py-2.5
  - Grid gaps: gap-4 md:gap-6

- **Mobile**:
  - Stack product preview above chat on mobile; side-by-side on desktop
  - Collapse admin sidebar to hamburger menu on mobile
  - Single-column catalog grid on mobile; multi-column masonry on tablet+
  - Bottom sheet for checkout flow on mobile; centered modal on desktop
  - Fixed bottom CTA bar on mobile for primary actions
  - Touch-optimized controls for 3D mockup (pinch to zoom, swipe to rotate)
