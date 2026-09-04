import fs from 'node:fs';

function replaceOrThrow(source, from, to, path) {
  if (!source.includes(from)) throw new Error(`Missing expected pattern in ${path}: ${from.slice(0, 100)}`);
  return source.replace(from, to);
}

const viewTargets = [
  'src/views/SalesRepDashboard.tsx',
  'apps/lovable/src/views/SalesRepDashboard.tsx',
  'apps/studio/src/views/SalesRepDashboard.tsx',
];

for (const path of viewTargets) {
  let s = fs.readFileSync(path, 'utf8');
  s = replaceOrThrow(s, "import React, { useState, useMemo } from 'react';", "import React, { useEffect, useState, useMemo } from 'react';", path);
  s = replaceOrThrow(s,
    "  const [selectedRepName, setSelectedRepName] = useState<string | null>('Mona Mohamed');",
    "  const [selectedRepName, setSelectedRepName] = useState<string | null>(null);\n  const [selectedRepCompanyName, setSelectedRepCompanyName] = useState<string | null>(null);",
    path);
  s = replaceOrThrow(s,
    "  }, [summaries, searchQuery]);\n\n  // Aggregate selected rep's summary row(s)",
    "  }, [summaries, searchQuery]);\n\n  useEffect(() => {\n    if (!selectedRepName && summaries.length > 0) {\n      setSelectedRepName(summaries[0].salesperson);\n      setSelectedRepCompanyName(summaries[0].company_name);\n    }\n  }, [summaries, selectedRepName]);\n\n  // Selected roster row defines both salesperson and company scope. Multi-company aggregation is allowed only when no row/company is selected.\n  // Aggregate selected rep's summary row(s)",
    path);
  s = replaceOrThrow(s,
    "    const repRows = summaries.filter(s => s.salesperson === selectedRepName);",
    "    const repRows = summaries.filter(s =>\n      s.salesperson === selectedRepName && (!selectedRepCompanyName || s.company_name === selectedRepCompanyName)\n    );",
    path);
  s = replaceOrThrow(s,
    "  }, [summaries, selectedRepName]);",
    "  }, [summaries, selectedRepName, selectedRepCompanyName]);",
    path);
  s = replaceOrThrow(s,
    "  } = useSalesRep360(selectedRepName, filters);",
    "  } = useSalesRep360(selectedRepName, filters, selectedRepCompanyName);",
    path);
  s = replaceOrThrow(s,
    "  const totalRepsCount = summaries.length;",
    "  const totalRepsCount = new Set(summaries.map((row) => row.salesperson)).size;",
    path);
  s = replaceOrThrow(s,
    "                  const isSelected = selectedRepName === rep.salesperson;\n                  const retPct = ((rep.retention_rate || 0) * 100).toFixed(1);",
    "                  const isSelected = selectedRepName === rep.salesperson && selectedRepCompanyName === rep.company_name;\n                  const retPct = rep.previous_customers > 0 && rep.retention_rate != null\n                    ? (rep.retention_rate * 100).toFixed(1)\n                    : null;",
    path);
  s = replaceOrThrow(s,
    "                      onClick={() => setSelectedRepName(rep.salesperson)}",
    "                      onClick={() => { setSelectedRepName(rep.salesperson); setSelectedRepCompanyName(rep.company_name); }}",
    path);
  s = replaceOrThrow(s,
    "<td className=\"p-2.5 font-mono font-extrabold text-emerald-600 dark:text-emerald-400\">{retPct}%</td>",
    "<td className=\"p-2.5 font-mono font-extrabold text-emerald-600 dark:text-emerald-400\">{retPct === null ? (isAr ? 'تاريخ سابق غير كافٍ' : 'Insufficient History') : `${retPct}%`}</td>",
    path);
  s = replaceOrThrow(s,
    "                value={selectedRepName}\n                onChange={(e) => setSelectedRepName(e.target.value)}",
    "                value={`${selectedRepName || ''}|||${selectedRepCompanyName || ''}`}\n                onChange={(e) => {\n                  const [name, company] = e.target.value.split('|||');\n                  setSelectedRepName(name || null);\n                  setSelectedRepCompanyName(company || null);\n                }}",
    path);
  s = replaceOrThrow(s,
    "<option key={`${s.salesperson}_${s.company_name}_${idx}`} value={s.salesperson}>{s.salesperson} ({s.company_name})</option>",
    "<option key={`${s.salesperson}_${s.company_name}_${idx}`} value={`${s.salesperson}|||${s.company_name}`}>{s.salesperson} ({s.company_name})</option>",
    path);
  s = replaceOrThrow(s,
    "                    {((selectedRepSummary.retention_rate || 0) * 100).toFixed(1)}%",
    "                    {selectedRepSummary.previous_customers > 0 && selectedRepSummary.retention_rate != null\n                      ? `${(selectedRepSummary.retention_rate * 100).toFixed(1)}%`\n                      : (isAr ? 'تاريخ سابق غير كافٍ' : 'Insufficient History')}",
    path);
  fs.writeFileSync(path, s);
}

const hookTargets = [
  'src/hooks/useSalesRepDashboard.ts',
  'apps/lovable/src/hooks/useSalesRepDashboard.ts',
  'apps/studio/src/hooks/useSalesRepDashboard.ts',
];
for (const path of hookTargets) {
  let s = fs.readFileSync(path, 'utf8');
  s = replaceOrThrow(s,
    "export function useSalesRep360(salespersonName: string | null, filters: GlobalFilterState) {",
    "export function useSalesRep360(salespersonName: string | null, filters: GlobalFilterState, companyNameOverride: string | null = null) {",
    path);
  s = replaceOrThrow(s,
    "    company: filters.company,",
    "    company: companyNameOverride ?? filters.company,",
    path);
  s = replaceOrThrow(s,
    "      const res = await fetchSalesRep360All(salespersonName, filtersRef.current);",
    "      const res = await fetchSalesRep360All(salespersonName, filtersRef.current, companyNameOverride);",
    path);
  s = replaceOrThrow(s,
    "        const res = await fetchSalesRep360All(salespersonName!, filtersRef.current);",
    "        const res = await fetchSalesRep360All(salespersonName!, filtersRef.current, companyNameOverride);",
    path);
  s = replaceOrThrow(s,
    "  }, [salespersonName]);",
    "  }, [salespersonName, companyNameOverride]);",
    path);
  fs.writeFileSync(path, s);
}

const serviceTargets = [
  'src/services/salesRepService.ts',
  'apps/lovable/src/services/salesRepService.ts',
  'apps/studio/src/services/salesRepService.ts',
];
for (const path of serviceTargets) {
  let s = fs.readFileSync(path, 'utf8');
  s = replaceOrThrow(s,
    "export async function fetchSalesRep360All(\n  salesperson: string,\n  filters: GlobalFilterState\n): Promise<SalesRep360DetailsResponse> {",
    "export async function fetchSalesRep360All(\n  salesperson: string,\n  filters: GlobalFilterState,\n  companyNameOverride: string | null = null\n): Promise<SalesRep360DetailsResponse> {",
    path);
  s = replaceOrThrow(s,
    "  const { effectiveStartDate, companyName, governorateCode, areaCode, customerId, productId } = getEffectiveFilterParams(filters);\n  const month = effectiveStartDate || filters.dateRange?.startDate || '2026-08-01';",
    "  const { effectiveStartDate, companyName, governorateCode, areaCode, customerId, productId } = getEffectiveFilterParams(filters);\n  const scopedCompanyName = companyNameOverride ?? companyName;\n  const month = effectiveStartDate || filters.dateRange?.startDate || '2026-08-01';",
    path);
  s = replaceOrThrow(s,
    "    fetchSalesRepTrend(salesperson, companyName),\n    fetchSalesRepCustomers(salesperson, month, companyName),\n    fetchSalesRepRetentionDetails(salesperson, month, companyName)",
    "    fetchSalesRepTrend(salesperson, scopedCompanyName),\n    fetchSalesRepCustomers(salesperson, month, scopedCompanyName),\n    fetchSalesRepRetentionDetails(salesperson, month, scopedCompanyName)",
    path);
  fs.writeFileSync(path, s);
}

console.log('Applied Sales Rep 360 scope and retention integrity patch.');
