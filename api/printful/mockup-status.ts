import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabase-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { taskId } = req.query;

    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Missing taskId' });
    }

    const printfulTaskRes = await fetch(`https://api.printful.com/v2/mockup-tasks?id=${taskId}`, {
       headers: {
         'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
       }
    });

    const printfulTaskData = await printfulTaskRes.json();

    if (!printfulTaskRes.ok || !printfulTaskData.data) {
       console.error("Printful Task Status Error:", printfulTaskData);
       throw new Error('Failed to fetch Printful Mockup Task');
    }

    const status = printfulTaskData.data.status;
    const admin = getSupabaseAdmin();

    if (status === 'completed') {
       // We'd ideally need the designId to update the DB here, but if we're polling 
       // from the client, the client might just update its state.
       // However, according to instructions: Update DB if complete/failed.
       // Without designId in query, we can't easily find the design to update unless we query by JSONB.
       // Let's assume we can query by mockup_task_ids->>combined
       
       const { data: design, error: searchError } = await admin
        .from('designs')
        .select('id')
        .contains('mockup_task_ids', { combined: Number(taskId) })
        .single();
        
       if (design && !searchError) {
           await admin.from('designs').update({
               mockup_status: 'complete',
               mockup_results: printfulTaskData.data.catalog_variant_mockups,
               updated_at: new Date().toISOString()
           }).eq('id', design.id);
       }
       
       return res.status(200).json({ 
           success: true, 
           data: { status, mockupResults: printfulTaskData.data.catalog_variant_mockups } 
       });

    } else if (status === 'failed') {
       const { data: design } = await admin
        .from('designs')
        .select('id')
        .contains('mockup_task_ids', { combined: Number(taskId) })
        .single();

       if (design) {
           await admin.from('designs').update({
               mockup_status: 'failed',
               updated_at: new Date().toISOString()
           }).eq('id', design.id);
       }
       console.error("Mockup task failed:", printfulTaskData.data.failure_reasons);
       return res.status(200).json({ 
           success: true, 
           data: { status, failureReasons: printfulTaskData.data.failure_reasons } 
       });
    }

    return res.status(200).json({ success: true, data: { status } });

  } catch (error: any) {
    console.error('Error fetching mockup task status:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
