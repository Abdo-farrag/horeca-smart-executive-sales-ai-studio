import { describe, expect, it, vi } from 'vitest';
import { products } from '../products';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../../lib/supabase';

describe('Products live RPC schema compatibility', () => {
  it('maps analytics_product_360 period_qty and lifetime_qty returned by production RPC', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{
        product_id: 8516,
        product_name: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
        period_sales: 3817985.56,
        period_qty: 15421,
        period_orders: 13,
        period_customers: 3,
        period_salespeople: 1,
        period_companies: 1,
        average_unit_value: 247.58352636015823,
        lifetime_sales: 11384199.56,
        lifetime_qty: 45878,
        lifetime_orders: 63,
        lifetime_customers: 9,
      }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const [result] = await products.get360({
      productId: 8516,
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyName: 'MAS',
    });

    expect(result.periodQuantity).toBe(15421);
    expect(result.lifetimeQuantity).toBe(45878);
  });
});
