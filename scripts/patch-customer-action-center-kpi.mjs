import fs from 'node:fs';

const analyticsTargets = [
  'src/analytics/customers.ts',
  'apps/lovable/src/analytics/customers.ts',
  'apps/studio/src/analytics/customers.ts',
];

for (const path of analyticsTargets) {
  let source = fs.readFileSync(path, 'utf8');
  const replacements = [
    ["row.high_priority ?? row.high_priority_count ?? 0", "row.high_priority ?? row.high_priority_customers ?? row.high_priority_count ?? 0"],
    ["row.medium_priority ?? row.medium_priority_count ?? 0", "row.medium_priority ?? row.medium_priority_customers ?? row.medium_priority_count ?? 0"],
    ["row.low_priority ?? row.low_priority_count ?? 0", "row.low_priority ?? row.low_priority_customers ?? row.low_priority_count ?? 0"],
  ];
  for (const [from, to] of replacements) {
    if (!source.includes(from)) throw new Error(path + ': expected analytics mapper pattern not found: ' + from);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
  console.log('patched ' + path);
}

const viewTargets = [
  'src/views/CustomerActionCenter.tsx',
  'apps/lovable/src/views/CustomerActionCenter.tsx',
  'apps/studio/src/views/CustomerActionCenter.tsx',
];

for (const path of viewTargets) {
  let source = fs.readFileSync(path, 'utf8');

  const oldHeader = `  const isAr = language === 'ar';\n\n  // State for as-of date (Defaulting to latest available sales data date)\n  const [asOfDate, setAsOfDate] = useState<string>(filters.latestAvailableDataDate || '');\n\n  useEffect(() => {\n    if (filters.latestAvailableDataDate) {\n      setAsOfDate(filters.latestAvailableDataDate);\n    }\n  }, [filters.latestAvailableDataDate]);\n  const [selectedCompany, setSelectedCompany] = useState<string>(filters.company || 'All');\n  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(filters.salesRepId || 'All');`;
  const newHeader = `  const isAr = language === 'ar';\n\n  const globalAsOfDate = filters.effectiveEndDate || filters.latestAvailableDataDate || '';\n  const globalCompanyName = filters.companyName || (filters.company !== 'All' ? filters.company : 'All');\n  const globalSalespersonName = filters.salespersonName || filters.salesperson || (filters.salesRepId && filters.salesRepId !== 'All' ? filters.salesRepId : 'All');\n\n  // Canonical global filters are the source of truth; in-page controls remain usable local overrides.\n  const [asOfDate, setAsOfDate] = useState<string>(globalAsOfDate);\n\n  useEffect(() => {\n    if (globalAsOfDate) setAsOfDate(globalAsOfDate);\n  }, [globalAsOfDate]);\n  const [selectedCompany, setSelectedCompany] = useState<string>(globalCompanyName);\n  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(globalSalespersonName);`;
  if (!source.includes(oldHeader)) throw new Error(path + ': expected header state block not found');
  source = source.replace(oldHeader, newHeader);

  const oldSync = `  // Sync with global company / salesperson filters if changed externally\n  useEffect(() => {\n    if (filters.company && filters.company !== selectedCompany) {\n      setSelectedCompany(filters.company);\n    }\n  }, [filters.company]);\n\n  useEffect(() => {\n    if (filters.salesRepId && filters.salesRepId !== selectedSalesperson) {\n      setSelectedSalesperson(filters.salesRepId);\n    }\n  }, [filters.salesRepId]);`;
  const newSync = `  // Sync with canonical global company / salesperson filters if changed externally.\n  useEffect(() => {\n    if (globalCompanyName !== selectedCompany) setSelectedCompany(globalCompanyName);\n  }, [globalCompanyName]);\n\n  useEffect(() => {\n    if (globalSalespersonName !== selectedSalesperson) setSelectedSalesperson(globalSalespersonName);\n  }, [globalSalespersonName]);`;
  if (!source.includes(oldSync)) throw new Error(path + ': expected global sync block not found');
  source = source.replace(oldSync, newSync);

  const oldFallback = "company: selectedCompany === 'All' ? 'MAS' : (selectedCompany as any),";
  const newFallback = "company: (selectedCompany === 'All' ? (filters.companyName || undefined) : selectedCompany) as any,";
  if (!source.includes(oldFallback)) throw new Error(path + ': expected MAS fallback not found');
  source = source.replace(oldFallback, newFallback);

  fs.writeFileSync(path, source);
  console.log('patched ' + path);
}
