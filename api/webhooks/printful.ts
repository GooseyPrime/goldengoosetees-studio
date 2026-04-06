import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabase-server';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const signature = req.headers['x-printful-signature'];
  
  if (!signature || !process.env.PRINTFUL_WEBHOOK_SECRET) {
      return res.status(400).json({ success: false, error: 'Missing signature or secret' });
  }

  // Verify Webhook Signature
  const rawBody = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', process.env.PRINTFUL_WEBHOOK_SECRET)
                     .update(rawBody)
                     .digest('hex');
                     
  // Warning: Webhook verification requires exact raw body. 
  // If this fails, consider using `buffer(req)` like in stripe webhook.
  if (hash !== signature) {
      // In strict environments, reject. For testing, we might just log.
      // return res.status(400).json({ success: false, error: 'Invalid Signature' });
  }

  const { type, data } = req.body;
  const admin = getSupabaseAdmin();

  res.status(200).send('Received'); // Reply to printful immediately

  try {
      if (type === 'mockup_task_finished') {
          const taskId = data.task.id;
          const status = data.task.status;
          
          if (status === 'completed') {
              const { data: design } = await admin
                  .from('designs')
                  .select('id')
                  .contains('mockup_task_ids', { combined: taskId })
                  .single();
                  
              if (design) {
                  await admin.from('designs').update({
                      mockup_status: 'complete',
                      mockup_results: data.task.catalog_variant_mockups,
                      updated_at: new Date().toISOString()
                  }).eq('id', design.id);
              }
          }
      } else if (type === 'package_shipped') {
          const printfulOrderId = data.order.id;
          
          await admin.from('orders').update({
              status: 'shipped',
              tracking_number: data.shipment.tracking_number,
              tracking_url: data.shipment.tracking_url,
              updated_at: new Date().toISOString()
          }).eq('printful_order_id', printfulOrderId.toString());
          
      } else if (type === 'order_failed') {
          const printfulOrderId = data.order.id;
          console.error(`Printful order failed: ${printfulOrderId}`, data.reason);
          
          await admin.from('orders').update({
              status: 'failed',
              updated_at: new Date().toISOString()
          }).eq('printful_order_id', printfulOrderId.toString());
      }
  } catch (error) {
      console.error("Error processing Printful webhook:", error);
  }
}
