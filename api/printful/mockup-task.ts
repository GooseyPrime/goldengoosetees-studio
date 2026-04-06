import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_lib/supabase-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { designId } = req.body;

    if (!designId) {
      return res.status(400).json({ success: false, error: 'Missing designId' });
    }

    const admin = getSupabaseAdmin();

    const { data: design, error: designError } = await admin
      .from('designs')
      .select('selected_product_id, selected_variant_ids, selected_placements, placement_file_ids')
      .eq('id', designId)
      .single();

    if (designError) throw designError;

    if (!design.selected_placements || design.selected_placements.length === 0) {
       return res.status(400).json({ success: false, error: 'No placements selected' });
    }

    const files = [];
    for (const placement of design.selected_placements) {
       const fileId = design.placement_file_ids?.[placement];
       if (!fileId) {
          return res.status(400).json({ success: false, error: `Missing file ID for placement: ${placement}` });
       }
       files.push({
          placement,
          file_id: fileId
       });
    }

    const printfulTaskRes = await fetch('https://api.printful.com/v2/mockup-tasks', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         product_id: design.selected_product_id,
         variant_ids: design.selected_variant_ids || [], // Ensure this is populated correctly in DB
         files,
         format: 'png'
       })
    });

    const printfulTaskData = await printfulTaskRes.json();

    if (!printfulTaskRes.ok || !printfulTaskData.data) {
       console.error("Printful Task Error:", printfulTaskData);
       throw new Error('Failed to create Printful Mockup Task');
    }

    const taskId = printfulTaskData.data.id;

    await admin.from('designs').update({
       mockup_task_ids: { combined: taskId },
       mockup_status: 'pending',
       updated_at: new Date().toISOString()
    }).eq('id', designId);

    return res.status(200).json({ success: true, data: { taskId } });

  } catch (error: any) {
    console.error('Error creating mockup task:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
