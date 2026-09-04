import fs from 'node:fs';

const targets = [
  'src/views/SalesRepDailyActionCenter.tsx',
  'apps/lovable/src/views/SalesRepDailyActionCenter.tsx',
  'apps/studio/src/views/SalesRepDailyActionCenter.tsx',
];

const oldStateBlock = `export const SalesRepDailyActionCenter: React.FC = () => {
  const { language, filters, setSelectedCustomer, salesReps } = useApp();
  const isAr = language === 'ar';

  // Available Sales Representatives list
  const salesRepOptions = useMemo(() => {
    const list = salesReps.map(sr => sr.nameEn);
    if (!list.includes('Haddil Haron')) list.unshift('Haddil Haron');
    return Array.from(new Set(list));
  }, [salesReps]);

  // Primary State Filters
  const [asOfDate, setAsOfDate] = useState<string>(filters.latestAvailableDataDate || '');

  useEffect(() => {
    if (filters.latestAvailableDataDate) {
      setAsOfDate(filters.latestAvailableDataDate);
    }
  }, [filters.latestAvailableDataDate]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('Haddil Haron');
  const [selectedCompany, setSelectedCompany] = useState<string>(filters.company || 'All');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');`;

const newStateBlock = `export const SalesRepDailyActionCenter: React.FC = () => {
  const { language, filters, setSelectedCustomer } = useApp();
  const isAr = language === 'ar';

  const globalCompanyName = filters.companyName || (filters.company && filters.company !== 'All' ? filters.company : 'All');
  const globalSalespersonName = filters.salespersonName || (filters.salesperson && filters.salesperson !== 'All' ? filters.salesperson : '');
  const globalAsOfDate = filters.effectiveEndDate || filters.latestAvailableDataDate || filters.selectedEndDate || '';

  // Primary State Filters. Global filters are the source of truth; in-page controls remain usable as local overrides.
  const [asOfDate, setAsOfDate] = useState<string>(globalAsOfDate);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(globalSalespersonName);
  const [selectedCompany, setSelectedCompany] = useState<string>(globalCompanyName);
  const [salesRepOptions, setSalesRepOptions] = useState<string[]>([]);

  useEffect(() => {
    setAsOfDate(globalAsOfDate);
  }, [globalAsOfDate]);

  useEffect(() => {
    if (globalSalespersonName) setSelectedSalesperson(globalSalespersonName);
  }, [globalSalespersonName]);

  useEffect(() => {
    setSelectedCompany(globalCompanyName);
  }, [globalCompanyName]);

  // Use the same live salesperson source as the Global Filter Bar, scoped by canonical companyId and effective dates.
  useEffect(() => {
    let isMounted = true;
    const startDate = filters.effectiveStartDate || filters.selectedStartDate || filters.dateRange?.startDate || '';
    const endDate = filters.effectiveEndDate || filters.latestAvailableDataDate || filters.selectedEndDate || filters.dateRange?.endDate || '';

    if (!startDate || !endDate) {
      setSalesRepOptions([]);
      return () => { isMounted = false; };
    }

    analytics.filters.salespeople({
      startDate,
      endDate,
      companyId: filters.companyId ?? null,
    }).then((options) => {
      if (!isMounted) return;
      const names = Array.from(new Set(options.map((option) => option.salespersonName).filter(Boolean)));
      setSalesRepOptions(names);
      if (!globalSalespersonName) {
        setSelectedSalesperson((current) => current && names.includes(current) ? current : (names[0] || ''));
      }
    }).catch((error) => {
      console.error('Error loading live salesperson options:', error);
      if (isMounted) setSalesRepOptions([]);
    });

    return () => { isMounted = false; };
  }, [
    filters.effectiveStartDate,
    filters.effectiveEndDate,
    filters.latestAvailableDataDate,
    filters.selectedStartDate,
    filters.selectedEndDate,
    filters.dateRange?.startDate,
    filters.dateRange?.endDate,
    filters.companyId,
    globalSalespersonName,
  ]);

  const unsupportedGlobalFilters = useMemo(() => {
    const active: string[] = [];
    if (filters.governorateCode) active.push(isAr ? 'المحافظة' : 'Governorate');
    if (filters.areaCode) active.push(isAr ? 'المنطقة' : 'Area');
    if (filters.customerId) active.push(isAr ? 'العميل' : 'Customer');
    if (filters.productId) active.push(isAr ? 'المنتج' : 'Product');
    return active;
  }, [filters.governorateCode, filters.areaCode, filters.customerId, filters.productId, isAr]);

  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');`;

const headerNeedle = `      </div>\n\n      {/* 2. Mandatory Filters Bar */}`;
const headerReplacement = [
  '      </div>',
  '',
  '      {unsupportedGlobalFilters.length > 0 && (',
  '        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">',
  '          <AlertTriangle className="w-4 h-4 shrink-0" />',
  '          <span>',
  '            {isAr',
  "              ? 'الفلاتر التالية غير مدعومة داخل مركز عمل المندوب حاليًا ولن يتم تجاهل ذلك بصمت: ' + unsupportedGlobalFilters.join('، ')",
  "              : 'These global filters are not currently supported by the Sales Rep Daily Action Center RPCs: ' + unsupportedGlobalFilters.join(', ')}",
  '          </span>',
  '        </div>',
  '      )}',
  '',
  '      {/* 2. Mandatory Filters Bar */}',
].join('\n');

for (const path of targets) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(oldStateBlock)) throw new Error(`${path}: expected state block not found`);
  source = source.replace(oldStateBlock, newStateBlock);

  const oldCompany = `company: selectedCompany === 'All' ? 'MAS' : (selectedCompany as any),`;
  const newCompany = `company: (selectedCompany === 'All' ? (filters.companyName || undefined) : selectedCompany) as any,`;
  if (!source.includes(oldCompany)) throw new Error(`${path}: hardcoded MAS drilldown fallback not found`);
  source = source.replace(oldCompany, newCompany);

  if (!source.includes(headerNeedle)) throw new Error(`${path}: header insertion point not found`);
  source = source.replace(headerNeedle, headerReplacement);

  fs.writeFileSync(path, source);
  console.log(`patched ${path}`);
}
