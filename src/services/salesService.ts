import { GlobalFilterState, OrderRecord } from '../types';

export async function fetchSalesOrders(_filters: GlobalFilterState): Promise<{
  orders: OrderRecord[];
  isLive: boolean;
  error: string | null;
}> {
  return {
    orders: [],
    isLive: false,
    error: 'SALES_ORDER_DETAIL_RPC_UNAVAILABLE',
  };
}
