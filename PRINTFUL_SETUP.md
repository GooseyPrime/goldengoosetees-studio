# Printful Integration Setup Guide

> **📚 Related Documentation**: [Documentation Library](./docs/README.md) | [README](./README.md) | [.env.example](./.env.example)

This guide will help you configure the Printful API integration for automated order fulfillment in GoldenGooseTees.

## Overview

The Printful integration enables:
- Automatic order submission to Printful after successful payment
- Real-time order status synchronization
- Tracking number retrieval
- Estimated delivery dates
- Product catalog synchronization

## Prerequisites

1. A Printful account (sign up at https://www.printful.com)
2. At least one store configured in your Printful account
3. Admin access to the GoldenGooseTees admin console

## Getting Your Printful API Key

### Step 1: Log in to Printful
Visit https://www.printful.com and log in to your account.

### Step 2: Navigate to Stores
1. Click on **Settings** in the left sidebar
2. Select **Stores** from the menu
3. Choose your store or create a new one

### Step 3: Generate API Key
1. Scroll down to the **API** section
2. Click **"Add API Access"**
3. Give your API key a name (e.g., "GoldenGooseTees Web App")
4. Copy the generated API key immediately (you won't be able to see it again)

### Step 4: Configure in Vercel (Server-Side)
**Important:** Printful API keys are now configured server-side only for security. They are never stored in the browser.

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name:** `PRINTFUL_API_KEY`
   - **Value:** Your Printful API key (paste the key you copied)
   - **Environment:** Production, Preview, Development (select all that apply)
4. (Optional) If you have multiple stores, add:
   - **Name:** `PRINTFUL_STORE_ID`
   - **Value:** Your store ID
5. Click **Save**
6. **Redeploy your application** for the changes to take effect

### Step 5: Verify Configuration
1. Log in as an admin user
2. Click the **Admin** button in the header
3. Navigate to the **Settings** tab
4. Find the **Printful Configuration** section
5. Click **Refresh Status** to check if Printful is configured
6. Click **Test Connection** to verify the API key works

## Product SKU Mapping

The app uses Printful's product variant IDs for fulfillment. You need to ensure your products are mapped to the correct Printful SKUs.

### Common Printful Product IDs:
- **71** - Bella + Canvas 3001 (Unisex Jersey Short Sleeve Tee)
- **146** - Gildan 5000 (Unisex Heavy Cotton Tee)
- **163** - Gildan 2400 (Unisex Long Sleeve Tee)
- **72** - Gildan 5300 (Unisex Pocket Tee)

To find more product IDs:
1. Visit the [Printful Product Catalog](https://www.printful.com/product-catalog)
2. Click on a product to view its variants
3. Use the Printful API or their documentation to find variant IDs

### Updating Product SKUs
1. Go to **Admin** → **Products** tab
2. Edit a product
3. Update the **Printful SKU** field with the correct variant ID
4. Save your changes

## Order Flow

### 1. Customer Places Order
When a customer completes checkout:
1. Payment is processed through Stripe
2. Design files are uploaded to Printful
3. Order is created in Printful with customer shipping details
4. Order is automatically confirmed
5. Customer receives email confirmation with estimated delivery

### 2. Order Fulfillment (Printful)
1. Printful receives the order
2. Product is printed and prepared
3. Order is shipped
4. Tracking number is generated

### 3. Order Tracking
Admins can:
1. View all orders in **Admin** → **Orders** tab
2. Click the sync button to fetch latest status from Printful
3. View tracking numbers once available
4. Monitor order progress through status updates

## Design File Requirements

Printful has specific requirements for print files:

### File Formats
- **PNG**: Recommended for photos and complex designs
- **SVG**: Recommended for vector graphics and logos

### Resolution
- **Minimum DPI**: 150 (enforced by kiosk)
- **Recommended DPI**: 300 for best quality
- **Maximum file size**: 50MB per file

### Color Mode
- **RGB**: Required for all designs (CMYK will be converted)

### Print Areas
Different products have different print areas:
- **Front Print**: Typically 12" x 16"
- **Back Print**: Typically 12" x 16"
- **Sleeve Print**: Typically 3" x 4"

The app automatically enforces these constraints during design creation.

## Troubleshooting

### API Connection Fails
- **Verify API Key**: Make sure you copied the entire key without spaces
- **Check API Access**: Ensure API access is enabled in your Printful store settings
- **Test in Printful**: Try accessing the Printful API directly to rule out account issues

### Order Submission Fails
- **Check Design Files**: Ensure files meet Printful's format and size requirements
- **Verify Product SKU**: Make sure the product SKU matches a valid Printful variant ID
- **Review Error Logs**: Check browser console for detailed error messages
- **Fallback Mode**: The system will create a mock order if Printful submission fails, allowing you to manually process the order later

### Tracking Numbers Not Appearing
- **Wait for Shipment**: Tracking numbers are only available after Printful ships the order
- **Sync Manually**: Use the sync button in order details to fetch latest updates
- **Check Printful Dashboard**: Verify the order status in your Printful account

### Wrong Product Variant
- **Update SKU Mapping**: Go to Products tab and update the Printful SKU field
- **Check Variant Availability**: Some variants may be out of stock or discontinued
- **Use Printful Catalog API**: Query Printful's API to find correct variant IDs

## API Rate Limits

Printful has the following rate limits:
- **120 requests per minute** per API key
- **14,400 requests per day** per API key

The app automatically handles rate limiting and will retry failed requests.

## Costs and Pricing

### Printful Fees
- **Product Cost**: Base cost of the blank product
- **Printing Fee**: Cost to print the design
- **Fulfillment Fee**: Handling and packaging ($2.95 per item typically)
- **Shipping**: Calculated based on destination and shipping method

### Kiosk Pricing
You set the retail price in the Products tab. The difference between your retail price and Printful's costs is your profit margin.

**Example:**
- Your retail price: $24.99
- Printful product cost: $9.50
- Printful printing fee: $3.95
- Printful fulfillment fee: $2.95
- Estimated shipping: $4.99
- **Your profit**: $3.60 per sale

## Security Best Practices

1. **Never Share API Keys**: Keep your API key confidential
2. **Use Admin Role**: Only admin users can access Printful settings
3. **Regular Audits**: Periodically review orders and sync with Printful
4. **Monitor Costs**: Track Printful costs to ensure profitability
5. **Backup Data**: Export order data regularly from the kiosk

## Support Resources

- **Printful Help Center**: https://help.printful.com
- **Printful API Docs**: https://developers.printful.com
- **Printful Status**: https://status.printful.com
- **Contact Printful Support**: support@printful.com

## Testing

### Test Mode
Printful doesn't have a separate test environment, but you can:
1. Create test orders with your own shipping address
2. Cancel orders before they're fulfilled (within 24 hours typically)
3. Use small, inexpensive products for testing

### Sample Order Flow
1. Configure API key in Settings
2. Create a simple design (e.g., text only)
3. Complete checkout with your own address
4. Monitor order in Admin → Orders
5. Sync with Printful to see status updates
6. Cancel order in Printful dashboard if needed

## Advanced Configuration

### Multiple Stores
If you have multiple Printful stores:
1. Enter the specific Store ID in Settings
2. Each store can have different products and pricing

### Custom Shipping Rates
To get real-time shipping rates:
1. Use the Printful Shipping API endpoint
2. Integrate with the checkout flow
3. Display calculated shipping costs to customers

### Webhooks
For real-time order updates:
1. Set up webhooks in Printful dashboard
2. Create webhook endpoint in your backend
3. Update order status automatically when Printful ships

## Conclusion

The Printful integration automates the entire fulfillment process, from order submission to tracking. Once configured, orders flow seamlessly from your site to Printful without manual intervention.

For additional help, consult the Printful documentation or contact their support team.
