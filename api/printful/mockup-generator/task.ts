import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../../_lib/auth'
import { printfulServer } from '#api/printful.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void | VercelResponse> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAuth(req)

    const { task_key: taskKey } = req.query
    if (!taskKey || typeof taskKey !== 'string') {
      res.status(400).json({ error: 'Task key is required' })
      return
    }

    const result = await printfulServer.getMockupTask(taskKey)

    res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to get mockup task'
    const sanitizedMessage = errorMessage.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')

    res.status(500).json({
      error: sanitizedMessage,
    })
  }
}


