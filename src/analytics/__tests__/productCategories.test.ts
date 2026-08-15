import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productCategories } from '../productCategories';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Product Categories SDK Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verify parameter mapping for analytics_product_category_mapping_summary', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        {
          total_products: 591,
          approved_products: 0,
          suggested_products: 345,
          needs_review_products: 246,
          rejected_products: 0,
          approved_coverage_pct: 0,
          suggested_or_approved_coverage_pct: 58.38,
        },
      ],
      error: null,
    });

    const res = await productCategories.summary();

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_mapping_summary',
      {}
    );

    expect(res.totalProducts).toBe(591);
    expect(res.approvedProducts).toBe(0);
    expect(res.suggestedProducts).toBe(345);
    expect(res.needsReviewProducts).toBe(246);
    expect(res.rejectedProducts).toBe(0);
    expect(res.approvedCoveragePct).toBe(0);
    expect(res.suggestedOrApprovedCoveragePct).toBe(58.38);
  });

  it('Verify parameter mapping for analytics_product_category_mapping_review', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        {
          product_id: 8792,
          product_name: 'Test Product',
          internal_reference: 'REF-123',
          mapping_status: 'needs_review',
          suggested_category_code: 'DAIRY_MILK',
          suggested_category_name_ar: 'ألبان ومنتجات الحليب',
          suggested_category_name_en: 'Dairy & Milk',
          suggestion_confidence: 85,
          suggestion_reason: 'Keyword match',
          approved_category_code: null,
          approved_category_name_ar: null,
          approved_category_name_en: null,
          approved_at: null,
          source_updated_at: '2026-08-04T18:00:00Z',
          updated_at: '2026-08-04T22:00:00Z',
        },
      ],
      error: null,
    });

    const res = await productCategories.review({
      status: 'needs_review',
      categoryCode: 'DAIRY_MILK',
      search: 'Test',
      limit: 25,
      offset: 0,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_mapping_review',
      {
        p_status: 'needs_review',
        p_category_code: 'DAIRY_MILK',
        p_search: 'Test',
        p_limit: 25,
        p_offset: 0,
      }
    );

    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(8792);
    expect(res[0].productName).toBe('Test Product');
    expect(res[0].internalReference).toBe('REF-123');
    expect(res[0].mappingStatus).toBe('needs_review');
    expect(res[0].suggestedCategoryCode).toBe('DAIRY_MILK');
    expect(res[0].suggestionConfidence).toBe(85);
  });

  it('Verify parameter mapping for analytics_product_category_approve', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{ product_id: 8792, mapping_status: 'approved' }],
      error: null,
    });

    await productCategories.approve(8792, 'DAIRY_MILK', 'Manual approval');

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_approve',
      {
        p_product_id: 8792,
        p_category_code: 'DAIRY_MILK',
        p_note: 'Manual approval',
      }
    );
  });

  it('Verify parameter mapping for analytics_product_category_mark_needs_review', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{ product_id: 8792, mapping_status: 'needs_review' }],
      error: null,
    });

    await productCategories.markNeedsReview(8792);

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_mark_needs_review',
      {
        p_product_id: 8792,
        p_note: null,
      }
    );
  });

  it('Verify parameter mapping for analytics_product_category_reject', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{ product_id: 8792, mapping_status: 'rejected' }],
      error: null,
    });

    await productCategories.reject(8792, 'Incorrect category');

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_reject',
      {
        p_product_id: 8792,
        p_note: 'Incorrect category',
      }
    );
  });

  it('Verify parameter mapping for analytics_product_category_bulk_approve', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{ updated_count: 5, skipped_count: 0 }],
      error: null,
    });

    const res = await productCategories.bulkApprove({
      productIds: [1, 2, 3, 4, 5],
      useSuggestions: true,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith(
      'analytics_product_category_bulk_approve',
      {
        p_product_ids: [1, 2, 3, 4, 5],
        p_category_code: null,
        p_use_suggestions: true,
        p_note: null,
      }
    );

    expect(res.updatedCount).toBe(5);
    expect(res.skippedCount).toBe(0);
  });
});
