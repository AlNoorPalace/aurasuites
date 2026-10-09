import { api, friendly, type ApiResult } from '../../lib/client';

export type AdminCtx = { bundled: string[]; onUnauthorized: () => void };

/** Admin API call: signs out on 401 and returns a human-readable error otherwise. */
export async function adm<T = any>(ctx: AdminCtx, url: string, method = 'GET', body?: unknown): Promise<{ data?: T; error?: string; fields?: Record<string, string> }> {
  const r: ApiResult<T> = await api<T>(url, { method, body });
  if (r.ok) return { data: r.data };
  if (r.status === 401) ctx.onUnauthorized();
  return { error: friendly(r), fields: r.fields };
}

export const AMENITIES = ['Free WiFi', 'Air conditioning', 'Breakfast', 'Parking', 'Restaurant', 'Room service', 'Lift', 'Power backup', 'CCTV security', 'Airport pick-up', 'Conference room', 'Laundry'];

export async function deleteFiles(ctx: AdminCtx, urls: string[]) {
  for (const url of urls) await adm(ctx, '/api/admin/upload', 'DELETE', { url });
}
