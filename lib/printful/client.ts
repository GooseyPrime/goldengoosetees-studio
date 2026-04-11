export type PrintfulPaging = {
  total?: number
  offset?: number
  limit?: number
}

function extractItemsAndPaging(json: Record<string, unknown>): {
  items: unknown[]
  paging?: PrintfulPaging
} {
  const readPaging = (src: Record<string, unknown> | undefined): PrintfulPaging | undefined => {
    const pagingRaw = src?.paging
    if (!pagingRaw || typeof pagingRaw !== 'object' || pagingRaw === null) return undefined
    const p = pagingRaw as Record<string, unknown>
    return {
      total: typeof p.total === 'number' ? p.total : undefined,
      offset: typeof p.offset === 'number' ? p.offset : undefined,
      limit: typeof p.limit === 'number' ? p.limit : undefined,
    }
  }

  let paging = readPaging(json)
  const d = json.data
  if (Array.isArray(d)) return { items: d, paging }
  if (d && typeof d === 'object' && d !== null) {
    const inner = d as Record<string, unknown>
    if (!paging) paging = readPaging(inner)
    if (Array.isArray(inner.data)) return { items: inner.data, paging }
  }
  if (Array.isArray(json.result)) return { items: json.result as unknown[], paging }
  if (Array.isArray(json)) return { items: json as unknown[], paging }

  return { items: [], paging }
}

/**
 * GET with offset/limit; returns list slice + paging metadata when Printful includes it.
 * Use for catalog endpoints that paginate (e.g. catalog-variants).
 */
export async function printfulGetWithPaging<T>(
  path: string
): Promise<{ success: boolean; items: T[]; paging?: PrintfulPaging; error?: string }> {
  try {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {}),
      },
    })

    if (res.status === 429) {
      const reset = res.headers.get('X-Ratelimit-Reset')
      if (reset) {
        const resetSeconds = parseInt(reset, 10)
        console.log(`Printful Rate Limit Hit. Waiting ${resetSeconds} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, resetSeconds * 1000))
        return printfulGetWithPaging<T>(path)
      }
    }

    const json = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const msg =
        json && typeof json.error === 'object' && json.error !== null && 'message' in json.error
          ? String((json.error as { message?: string }).message)
          : 'Printful API Error'
      throw new Error(msg)
    }

    const { items, paging } = extractItemsAndPaging(json)
    return { success: true, items: items as T[], paging }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Printful request failed'
    return { success: false, items: [], error: msg }
  }
}

export async function printfulGet<T>(path: string): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {})
      }
    });

    if (res.status === 429) {
      const reset = res.headers.get('X-Ratelimit-Reset');
      if (reset) {
        const resetSeconds = parseInt(reset, 10);
        console.log(`Printful Rate Limit Hit. Waiting ${resetSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
        return printfulGet(path); // recursive retry
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Printful API Error');

    return { success: true, data: data.data || data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function printfulPost<T>(path: string, body: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`https://api.printful.com/v2${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json',
        ...(process.env.PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID } : {})
      },
      body: JSON.stringify(body)
    });

    if (res.status === 429) {
      const reset = res.headers.get('X-Ratelimit-Reset');
      if (reset) {
        const resetSeconds = parseInt(reset, 10);
        console.log(`Printful Rate Limit Hit. Waiting ${resetSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, resetSeconds * 1000));
        return printfulPost(path, body); // recursive retry
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Printful API Error');

    return { success: true, data: data.data || data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}