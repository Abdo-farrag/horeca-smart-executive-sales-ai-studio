import { describe, expect, it } from 'vitest';
import { serializeCsv } from '../csv';

describe('serializeCsv', () => {
  it('adds UTF-8 BOM and escapes Arabic/Excel-compatible cells', () => {
    const csv = serializeCsv([{ customer: 'مطعم, القاهرة', sales: 1250 }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('\"مطعم, القاهرة\"');
    expect(csv).toContain('1250');
  });
});
