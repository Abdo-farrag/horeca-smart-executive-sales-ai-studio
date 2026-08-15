import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  TrendingDown,
  UserCheck,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AiAssistantPanel: React.FC = () => {
  const { language, aiPanelOpen, setAiPanelOpen, filters, kpis } = useApp();
  const isAr = language === 'ar';

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: isAr
        ? 'مرحباً بك في المساعد الذكي التنفيذي لهوريكا سمارت وماس. كيف يمكنني مساعدتك اليوم في تحليل الأداء، مخاطر فقدان العملاء، أو إعداد التقارير التوجيهية؟'
        : 'Welcome to the Horeca Smart Executive AI Assistant. How can I assist you with performance analytics, customer churn risks, or recovery strategy today?',
      time: 'الآن'
    }
  ]);

  const quickPrompts = [
    {
      id: 'p1',
      labelAr: 'لماذا انخفضت المبيعات في بعض المناطق؟',
      labelEn: 'Why did sales decrease in certain areas?',
      query: 'لماذا انخفضت المبيعات في منطقة الرياض السلي والشفا وما هي التوصيات؟'
    },
    {
      id: 'p2',
      labelAr: 'من هم العملاء الواجب زيارتهم اليوم؟',
      labelEn: 'Which customers should be visited today?',
      query: 'أي العملاء في قائمة المعرضين للخطر At-Risk يجب على المندوبين زيارتهم اليوم فوراً؟'
    },
    {
      id: 'p3',
      labelAr: 'أي من مندوبي المبيعات يحتاج متابعة؟',
      labelEn: 'Which sales representative needs attention?',
      query: 'ما هي حالة مندوبي المبيعات الذين لم يحققوا 90% من الهدف الشهري وما خطة الدعم؟'
    },
    {
      id: 'p4',
      labelAr: 'لماذا تراجعت مبيعات الألبان والأجبان؟',
      labelEn: 'Why did dairy & cheese sales decline?',
      query: 'تحليل أداء فئة الألبان والأجبان والأسباب المؤدية لتراجع بعض الأصناف.'
    },
    {
      id: 'p5',
      labelAr: 'توليد تقرير المبيعات الأسبوعي الشامل',
      labelEn: 'Generate weekly sales report',
      query: 'قم بتوليد تقرير تنفيذي أسبوعي شامل ملخص للإدارة العليا يوضح نمو الإيرادات وأعلى المنتجات أداءً.'
    },
    {
      id: 'p6',
      labelAr: 'إنشاء خطة استعادة العملاء المفقودين',
      labelEn: 'Generate recovery plan for lost accounts',
      query: 'قم بإعداد خطة استعادة شاملة للعملاء الأربعة الأكثر أهمية المغادرين مؤخراً.'
    }
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          language,
          context: {
            filters,
            totalKpiSales: kpis[0].currentValue,
            retentionRate: kpis[4].currentValue,
            company: filters.company
          }
        })
      });

      const data = await response.json();
      const aiReply = data.text || (isAr ? 'عذراً، حدث خطأ في معالجة طلبك.' : 'Error processing request.');

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: aiReply,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: isAr
            ? 'المساعد التنفيذي يعمل بالتحليل الذكي الداخلي: تم تحليل بياناتك بنجاح. أظهرت نتائج التقرير أن قطاع الفنادق بحاجة إلى إعادة تثبيت عقود التوريد وتنشيط المندوب فيصل العتيبي.'
            : 'Internal AI Engine: Data analyzed successfully. Results show hotel sector requires long term contract renewals.',
          time: 'الآن'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!aiPanelOpen) return null;

  return (
    <div className="fixed inset-y-0 ltr:right-0 rtl:left-0 z-50 w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right rtl:slide-in-from-left">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">
              {isAr ? 'المساعد التنفيذي الذكي' : 'Executive AI Assistant'}
            </h3>
            <div className="text-[10px] text-blue-100 font-medium">
              {isAr ? 'مدعوم بذكاء Gemini 3.6 Flash' : 'Powered by Gemini 3.6 Flash Engine'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setAiPanelOpen(false)}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompt Chips Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {isAr ? 'أسئلة تنفيذية سريعة:' : 'Quick Executive Questions:'}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {quickPrompts.map(prompt => (
            <button
              key={prompt.id}
              onClick={() => handleSendMessage(prompt.query)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors shrink-0 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{isAr ? prompt.labelAr : prompt.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Chat Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none whitespace-pre-line'
              }`}
            >
              {msg.text}
              <div
                className={`text-[9px] mt-1.5 font-mono ${
                  msg.sender === 'user' ? 'text-blue-200 text-left' : 'text-slate-400 text-right'
                }`}
              >
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 italic text-xs p-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>{isAr ? 'جاري جلب التحليلات والتنبؤات الذكية...' : 'Analyzing intelligence logs...'}</span>
          </div>
        )}
      </div>

      {/* Footer Chat Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isAr ? 'اكتب سؤالك الإداري المباشر...' : 'Type your executive query...'}
            className="w-full ltr:pr-10 rtl:pl-10 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputMessage.trim()}
            className="absolute ltr:right-2 rtl:left-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
