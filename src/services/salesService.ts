import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GlobalFilterState, OrderRecord } from '../types';

export async function fetchSalesOrders(filters: GlobalFilterState): Promise<{
  orders: OrderRecord[];
  isLive: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { orders: [], isLive: false, error: null };
  }

  try {
    let query = supabase.from('sales_orders_odoo18')
      .select('order_id, order_name, order_date_cairo, company_name, customer_id, customer_name, salesperson, order_value')
      .limit(100);

    if (filters.dateRange.startDate) {
      query = query.gte('order_date_cairo', filters.dateRange.startDate);
    }
    if (filters.dateRange.endDate) {
      query = query.lte('order_date_cairo', filters.dateRange.endDate);
    }
    if (filters.company !== 'All') {
      query = query.eq('company_name', filters.company);
    }

    const { data, error } = await query;
    if (error) {
      return { orders: [], isLive: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { orders: [], isLive: true, error: null };
    }

    const mappedOrders: OrderRecord[] = data.map((row: any, idx: number) => ({
      id: String(row.order_id || `so_${idx}`),
      company: row.company_name || '',
      orderNumber: String(row.order_name || row.order_id || `SO-${idx}`),
      date: row.order_date_cairo || '',
      time: '',
      customerId: String(row.customer_id || ''),
      customerNameAr: row.customer_name || '',
      customerNameEn: row.customer_name || '',
      sector: 'restaurant',
      salesRepId: '',
      salesRepNameAr: row.salesperson || '',
      salesRepNameEn: row.salesperson || '',
      area: '',
      city: '',
      amount: Number(row.order_value || 0),
      status: 'completed',
      itemsCount: 0,
      items: []
    }));

    return { orders: mappedOrders, isLive: true, error: null };
  } catch (err: any) {
    return { orders: [], isLive: false, error: err.message };
  }
}
