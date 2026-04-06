import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateRetailPrice, getProductConfig } from '../../src/lib/config/products.config';
import { getSupabaseAdmin } from '../../_lib/supabase-server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { designId, variantId, quantity = 1, shippingAddress } = req.body;

    if (!designId || !variantId) {
      return res.status(400).json({ success: false, error: 'Missing designId or variantId' });
    }

    const admin = getSupabaseAdmin();

    const { data: design, error: designError } = await admin
      .from('designs')
      .select('*')
      .eq('id', designId)
      .single();

    if (designError) throw designError;

    // Validate placements and mockup status
    if (design.mockup_status !== 'complete') {
      return res.status(400).json({ success: false, error: 'Mockups pending. Cannot checkout yet.' });
    }
    
    if (design.selected_placements.some((p: string) => !design.placement_file_ids?.[p])) {
       return res.status(400).json({ success: false, error: 'Missing design files for some placements' });
    }

    // Determine Size based on variant info (this would require fetching variant info from Printful or DB cache)
    // For now, we will assume a generic 'L' if we don't have it explicitly stored, 
    // but ideally you'd look it up from the products_catalog variants cache.
    // Let's assume size is 'L' as a fallback to demonstrate price calculation.
    let size = 'L'; // TODO: lookup from variantId

    // Calculate Price Server Side
    const retailPrice = calculateRetailPrice(design.selected_product_id, design.selected_placements, size);
    
    const config = getProductConfig(design.selected_product_id);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Custom ${config?.displayName || 'Product'}`,
            },
            unit_amount: Math.round(retailPrice * 100), // Stripe uses cents
          },
          quantity,
        },
      ],
      metadata: {
        designId,
        variantId: variantId.toString(),
        quantity: quantity.toString(),
        userId: design.user_id || null,
        sessionId: design.session_id || null
      },
      success_url: `${process.env.VITE_APP_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL}/studio?design_id=${designId}`,
    });

    // Create pending order record
    const { error: orderError } = await admin.from('orders').insert({
        user_id: design.user_id,
        session_id: design.session_id,
        design_id: designId,
        product_id: design.selected_product_id,
        status: 'pending_payment',
        stripe_session_id: session.id,
        shipping_address: shippingAddress || {},
        total_amount: retailPrice * quantity
    });
    
    if (orderError) console.error("Failed to insert pending order:", orderError);

    return res.status(200).json({ success: true, data: { checkoutUrl: session.url } });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
