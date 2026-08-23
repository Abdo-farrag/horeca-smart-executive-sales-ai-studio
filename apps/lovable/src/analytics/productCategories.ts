import { callAnalyticsRpc } from './client';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AnalyticsError } from './errors';
import { toFiniteNumber } from './normalizers';
import {
  ProductCategoryMappingSummaryResult,
  ProductCategoryMappingReviewResult,
  ProductCategoryMappingReviewParams,
  CategoryMasterItem,
  MappingStatus,
} from './types';

export const OFFICIAL_CATEGORY_MASTER: CategoryMasterItem[] = [
  { id: 1, code: 'DAIRY_MILK', nameAr: 'ألبان ومنتجات الحليب', nameEn: 'Dairy & Milk', displayOrder: 10, isActive: true },
  { id: 2, code: 'CHEESE', nameAr: 'جبن', nameEn: 'Cheese', displayOrder: 20, isActive: true },
  { id: 3, code: 'OILS_GHEE', nameAr: 'زيوت وسمن', nameEn: 'Oils & Ghee', displayOrder: 30, isActive: true },
  { id: 4, code: 'SAUCES_SEASONING', nameAr: 'صلصات وتوابل', nameEn: 'Sauces & Seasoning', displayOrder: 40, isActive: true },
  { id: 5, code: 'BEVERAGES', nameAr: 'مشروبات', nameEn: 'Beverages', displayOrder: 50, isActive: true },
  { id: 6, code: 'WATER', nameAr: 'مياه', nameEn: 'Water', displayOrder: 60, isActive: true },
  { id: 7, code: 'COFFEE_TEA', nameAr: 'قهوة وشاي', nameEn: 'Coffee & Tea', displayOrder: 70, isActive: true },
  { id: 8, code: 'BAKERY', nameAr: 'مخبوزات ومستلزمات مخابز', nameEn: 'Bakery & Baking Supplies', displayOrder: 80, isActive: true },
  { id: 9, code: 'SWEETS_SYRUPS', nameAr: 'حلويات وسيرب', nameEn: 'Sweets & Syrups', displayOrder: 90, isActive: true },
  { id: 10, code: 'FROZEN_FOOD', nameAr: 'أغذية مجمدة', nameEn: 'Frozen Food', displayOrder: 100, isActive: true },
  { id: 11, code: 'MEAT_POULTRY', nameAr: 'لحوم ودواجن', nameEn: 'Meat & Poultry', displayOrder: 110, isActive: true },
  { id: 12, code: 'PACKAGING', nameAr: 'تعبئة وتغليف', nameEn: 'Packaging', displayOrder: 120, isActive: true },
  { id: 13, code: 'CLEANING', nameAr: 'تنظيف ونظافة', nameEn: 'Cleaning & Hygiene', displayOrder: 130, isActive: true },
  { id: 14, code: 'OTHER_REVIEW', nameAr: 'أخرى / تحتاج مراجعة', nameEn: 'Other / Needs Review', displayOrder: 999, isActive: true },
];

function normalizeSummaryRow(row: Record<string, unknown>): ProductCategoryMappingSummaryResult {
  return {
    totalProducts: toFiniteNumber(row.total_products, 'total_products'),
    approvedProducts: toFiniteNumber(row.approved_products, 'approved_products'),
    suggestedProducts: toFiniteNumber(row.suggested_products, 'suggested_products'),
    needsReviewProducts: toFiniteNumber(row.needs_review_products, 'needs_review_products'),
    rejectedProducts: toFiniteNumber(row.rejected_products, 'rejected_products'),
    approvedCoveragePct: toFiniteNumber(row.approved_coverage_pct, 'approved_coverage_pct'),
    suggestedOrApprovedCoveragePct: toFiniteNumber(row.suggested_or_approved_coverage_pct, 'suggested_or_approved_coverage_pct'),
  };
}

function normalizeReviewRow(row: Record<string, unknown>): ProductCategoryMappingReviewResult {
  return {
    productId: toFiniteNumber(row.product_id, 'product_id'),
    productName: String(row.product_name ?? ''),
    internalReference: row.internal_reference ? String(row.internal_reference) : null,
    mappingStatus: (row.mapping_status as MappingStatus) || 'needs_review',
    suggestedCategoryCode: row.suggested_category_code ? String(row.suggested_category_code) : null,
    suggestedCategoryNameAr: row.suggested_category_name_ar ? String(row.suggested_category_name_ar) : null,
    suggestedCategoryNameEn: row.suggested_category_name_en ? String(row.suggested_category_name_en) : null,
    suggestionConfidence: toFiniteNumber(row.suggestion_confidence ?? 0, 'suggestion_confidence'),
    suggestionReason: row.suggestion_reason ? String(row.suggestion_reason) : null,
    approvedCategoryCode: row.approved_category_code ? String(row.approved_category_code) : null,
    approvedCategoryNameAr: row.approved_category_name_ar ? String(row.approved_category_name_ar) : null,
    approvedCategoryNameEn: row.approved_category_name_en ? String(row.approved_category_name_en) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    sourceUpdatedAt: row.source_updated_at ? String(row.source_updated_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export const productCategories = {
  async summary(): Promise<ProductCategoryMappingSummaryResult> {
    const rows = await callAnalyticsRpc(
      'analytics_product_category_mapping_summary',
      {},
      normalizeSummaryRow
    );
    if (!rows || rows.length === 0) {
      throw new AnalyticsError({
        message: "RPC 'analytics_product_category_mapping_summary' returned no rows",
        code: 'ANALYTICS_INVALID_RESPONSE',
        operation: 'analytics_product_category_mapping_summary',
      });
    }
    return rows[0];
  },

  async review(params?: ProductCategoryMappingReviewParams): Promise<ProductCategoryMappingReviewResult[]> {
    return callAnalyticsRpc(
      'analytics_product_category_mapping_review',
      {
        p_status: params?.status || null,
        p_category_code: params?.categoryCode || null,
        p_search: params?.search || null,
        p_limit: params?.limit ?? null,
        p_offset: params?.offset ?? null,
      },
      normalizeReviewRow
    );
  },

  async approve(productId: number, categoryCode?: string | null, note?: string | null): Promise<void> {
    await callAnalyticsRpc(
      'analytics_product_category_approve',
      {
        p_product_id: productId,
        p_category_code: categoryCode || null,
        p_note: note || null,
      },
      (row) => row
    );
  },

  async bulkApprove(
    paramsOrIds:
      | {
          productIds: number[];
          categoryCode?: string | null;
          useSuggestions?: boolean;
          note?: string | null;
        }
      | number[],
    categoryCodeParam?: string | null,
    useSuggestionsParam?: boolean,
    noteParam?: string | null
  ): Promise<{ updatedCount: number; skippedCount: number }> {
    let productIds: number[];
    let categoryCode: string | null = null;
    let useSuggestions: boolean = true;
    let note: string | null = null;

    if (Array.isArray(paramsOrIds)) {
      productIds = paramsOrIds;
      categoryCode = categoryCodeParam || null;
      useSuggestions = useSuggestionsParam !== undefined ? useSuggestionsParam : (categoryCode ? false : true);
      note = noteParam || null;
    } else {
      productIds = paramsOrIds.productIds;
      categoryCode = paramsOrIds.categoryCode || null;
      useSuggestions =
        paramsOrIds.useSuggestions !== undefined
          ? paramsOrIds.useSuggestions
          : (categoryCode ? false : true);
      note = paramsOrIds.note || null;
    }

    if (!productIds || productIds.length === 0) {
      return { updatedCount: 0, skippedCount: 0 };
    }

    const rows = await callAnalyticsRpc(
      'analytics_product_category_bulk_approve',
      {
        p_product_ids: productIds,
        p_category_code: categoryCode,
        p_use_suggestions: useSuggestions,
        p_note: note,
      },
      (row) => ({
        updatedCount: toFiniteNumber(row.updated_count ?? 0, 'updated_count'),
        skippedCount: toFiniteNumber(row.skipped_count ?? 0, 'skipped_count'),
      })
    );

    return rows[0] ?? { updatedCount: 0, skippedCount: 0 };
  },

  async markNeedsReview(productIds: number | number[], note?: string | null): Promise<void> {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    if (ids.length === 0) return;

    await Promise.all(
      ids.map((id) =>
        callAnalyticsRpc(
          'analytics_product_category_mark_needs_review',
          {
            p_product_id: id,
            p_note: note || null,
          },
          (row) => row
        )
      )
    );
  },

  async reject(productIds: number | number[], note?: string | null): Promise<void> {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    if (ids.length === 0) return;

    await Promise.all(
      ids.map((id) =>
        callAnalyticsRpc(
          'analytics_product_category_reject',
          {
            p_product_id: id,
            p_note: note || null,
          },
          (row) => row
        )
      )
    );
  },

  async getCategoriesMaster(): Promise<CategoryMasterItem[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('product_category_master')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          code: row.code,
          nameAr: row.name_ar,
          nameEn: row.name_en,
          descriptionAr: row.description_ar,
          isActive: row.is_active,
          displayOrder: row.display_order,
        }));
      }
    }
    return OFFICIAL_CATEGORY_MASTER;
  },
};
