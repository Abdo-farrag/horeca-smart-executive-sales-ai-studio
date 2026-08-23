import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer360Panel } from './Customer360Panel';

export const EntityDetailModals: React.FC = () => {
  const {
    language,
    filters,
    selectedCustomer,
    setSelectedCustomer,
    selectedRep,
    setSelectedRep,
    selectedProduct,
    setSelectedProduct
  } = useApp();

  const isAr = language === 'ar';

  const numericCustomerId = selectedCustomer
    ? typeof selectedCustomer.id === 'number'
      ? selectedCustomer.id
      : parseInt(String(selectedCustomer.id).replace(/\D/g, ''), 10) || 30709
    : null;

  return (
    <>
      {/* 1. Customer Detail 360 Modal */}
      {selectedCustomer && numericCustomerId && (
        <Customer360Panel
          customerId={numericCustomerId}
          customerName={isAr ? selectedCustomer.nameAr : selectedCustomer.nameEn}
          filters={filters}
          onClose={() => setSelectedCustomer(null)}
          language={language}
        />
      )}

      {/* 2. Sales Rep Detail Modal */}

      {selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedRep.avatar}
                  alt={selectedRep.nameEn}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-600"
                />
                <div>
                  <h3 className="text-lg font-bold">
                    {isAr ? selectedRep.nameAr : selectedRep.nameEn}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    {selectedRep.code} • {selectedRep.company} • {selectedRep.primaryArea}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRep(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'المبيعات المحققة' : 'Achieved Revenue'}</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedRep.monthlyAchieved.toLocaleString('ar-EG')} ج.م
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'الهدف الشهري' : 'Monthly Target'}</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                  {selectedRep.monthlyTarget.toLocaleString('ar-EG')} ج.م
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'نسبة التحقيق' : 'Target %'}</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedRep.targetAchievementPercent}%
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-blue-600 font-mono">{selectedProduct.code}</div>
                <h3 className="text-lg font-bold">
                  {isAr ? selectedProduct.nameAr : selectedProduct.nameEn}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                <div className="text-slate-500 mb-1">{isAr ? 'تصنيف ABC / XYZ' : 'ABC / XYZ Class'}</div>
                <div className="text-lg font-extrabold text-blue-600">
                  Class {selectedProduct.abcClassification} - {selectedProduct.xyzClassification}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border">
                <div className="text-slate-500 mb-1">{isAr ? 'هامش الربح' : 'Margin %'}</div>
                <div className="text-lg font-extrabold text-emerald-600">
                  {selectedProduct.marginPercent}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
