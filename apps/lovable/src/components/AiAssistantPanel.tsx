import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Loader2,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Layers,
  ArrowRight,
  TrendingUp,
  Users,
  Package,
  UserCheck,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sendAiChatMessage } from '../services/aiChatService';
import { buildAiContextForQuery } from '../services/ai/aiContextRouter';
import {
  getSmartSuggestedQuestions,
  getAllAvailableQuestions,
  getSuggestedFollowUps,
  buildScopeBadgeLabel,
  getAnalysisBadgeLabel,
  AI_QUESTION_CATEGORIES,
  AiQuestionShortcut,
  AiQuestionCategory,
} from '../services/ai/aiQuestionsPack';
import { AiChatMessage, AiQueryIntent, AiContextMode } from '../types/ai';

export const AiAssistantPanel: React.FC = () => {
  const { language, aiPanelOpen, setAiPanelOpen, filters } = useApp();
  const isAr = language === 'ar';

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('');
  const [lastFailedPrompt, setLastFailedPrompt] = useState<{ text: string; intent?: AiQueryIntent } | null>(null);
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AiQuestionCategory>('SALES');

  const initialGreeting: AiChatMessage = {
    role: 'model',
    text: isAr
      ? `مرحباً بك في المساعد التنفيذي الذكي (AI Sales Copilot).\nأنا جاهز لتحليل مبيعات هوريكا سمارت وماس، مؤشرات النمو، سلوك العملاء، المنتجات، والمناديب وفق النطاق المحدد.`
      : `Welcome to the Executive AI Sales Copilot.\nI am ready to analyze sales performance, growth metrics, customer retention, products, and sales reps for your active scope.`,
    timestamp: isAr ? 'الآن' : 'Now',
    intent: 'EXECUTIVE_SUMMARY',
    contextMode: 'AGGREGATED',
  };

  const [messages, setMessages] = useState<AiChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (aiPanelOpen) {
      scrollToBottom();
    }
  }, [messages, aiPanelOpen, loading]);

  // Derive dynamic shortcuts and badges based on current filter state
  const smartQuestions = getSmartSuggestedQuestions(filters);
  const fullQuestionsCatalog = getAllAvailableQuestions(filters);
  const scopeBadge = buildScopeBadgeLabel(filters);

  // Helper to determine specific loading status message based on intent
  const getLoadingMessageForIntent = (intent?: AiQueryIntent): string => {
    if (intent === 'CUSTOMER_RECENT_ORDERS') {
      return isAr ? 'جاري تحميل تفاصيل الأوردرات...' : 'Loading order details...';
    }
    if (intent === 'CUSTOMER_ANALYSIS' || intent === 'CUSTOMER_PRODUCT_HISTORY' || intent === 'CROSS_SELL') {
      return isAr ? 'جاري تحليل بيانات العميل...' : 'Analyzing customer data...';
    }
    if (intent === 'PRODUCT_ANALYSIS' || intent === 'PRODUCT_CUSTOMERS') {
      return isAr ? 'جاري تحليل بيانات المنتج...' : 'Analyzing product data...';
    }
    return isAr ? 'جاري تحليل البيانات...' : 'Analyzing executive data...';
  };

  const handleSendMessage = async (customText?: string, explicitIntent?: AiQueryIntent) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AiChatMessage = {
      role: 'user',
      text: textToSend,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setLoading(true);
    setLastFailedPrompt(null);
    setLoadingStatusText(getLoadingMessageForIntent(explicitIntent));

    try {
      // 1. Build & Route context safely through router
      const routerResult = await buildAiContextForQuery({
        message: textToSend,
        filters,
        shortcutIntent: explicitIntent,
      });

      // Update loading status text if intent was resolved dynamically
      setLoadingStatusText(getLoadingMessageForIntent(routerResult.intent));

      // 2. Short-circuit if deterministic message or client-side guard condition is met
      if (routerResult.userMessage && routerResult.status !== 'SUCCESS') {
        const shortCircuitMsg: AiChatMessage = {
          role: 'model',
          text: routerResult.userMessage,
          timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          intent: routerResult.intent,
          contextMode: routerResult.contextMode,
        };
        setMessages((prev) => [...prev, shortCircuitMsg]);
        return;
      }

      // 3. Pass existing history (excluding errors)
      const currentHistory = messages.filter((m) => !m.error);

      // 4. Send to backend AI chat service with full routed context
      const aiReplyText = await sendAiChatMessage({
        message: textToSend,
        history: currentHistory,
        filters,
        analyticsContext: routerResult.analyticsContext,
        drillDownContext: routerResult.drillDownContext,
        contextMode: routerResult.contextMode,
        intent: routerResult.intent,
        language: isAr ? 'ar' : 'en',
      });

      const aiMsg: AiChatMessage = {
        role: 'model',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        intent: routerResult.intent,
        contextMode: routerResult.contextMode,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      setLastFailedPrompt({ text: textToSend, intent: explicitIntent });

      const errorText = isAr
        ? 'تعذر الاتصال بالمساعد الذكي حاليًا. حاول مرة أخرى.'
        : 'Could not connect to the AI assistant right now. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: errorText,
          timestamp: new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setLoadingStatusText('');
    }
  };

  const handleClearHistory = () => {
    setMessages([initialGreeting]);
    setLastFailedPrompt(null);
  };

  const handleRetry = () => {
    if (lastFailedPrompt) {
      handleSendMessage(lastFailedPrompt.text, lastFailedPrompt.intent);
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (category: AiQuestionCategory) => {
    switch (category) {
      case 'SALES':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'CUSTOMERS':
        return <Users className="w-3.5 h-3.5" />;
      case 'PRODUCTS':
        return <Package className="w-3.5 h-3.5" />;
      case 'SALES_REPS':
        return <UserCheck className="w-3.5 h-3.5" />;
      case 'RECOVERY_GROWTH':
        return <RefreshCw className="w-3.5 h-3.5" />;
      case 'ORDERS':
        return <ShoppingBag className="w-3.5 h-3.5" />;
    }
  };

  if (!aiPanelOpen) return null;

  return (
    <div
      id="ai-sales-copilot-panel"
      className="fixed inset-y-0 ltr:right-0 rtl:left-0 z-50 w-full sm:w-[540px] bg-white dark:bg-slate-900 border-l rtl:border-l-0 rtl:border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right rtl:slide-in-from-left"
    >
      {/* 1. Header with AI Sales Copilot & Scope Badge */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>AI Sales Copilot</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {isAr ? 'مساعد المبيعات التنفيذي' : 'Executive'}
                </span>
              </h3>
              <div className="text-[11px] text-blue-100/80 font-medium">
                {isAr ? 'تحليلات ذكية واستفسارات تنفيذية موجهة' : 'Actionable Sales Insights & Guidance'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="ai-clear-chat-button"
              onClick={handleClearHistory}
              title={isAr ? 'مسح المحادثة' : 'Clear Chat'}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              id="ai-close-panel-button"
              onClick={() => setAiPanelOpen(false)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Badge (User-facing display names only) */}
        <div
          id="ai-scope-badge"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/10 text-xs text-blue-100 font-medium"
        >
          <Layers className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span className="truncate">{scopeBadge}</span>
        </div>
      </div>

      {/* 2. Smart Suggested Questions Section */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'أسئلة مقترحة حسب تحليلك الحالي' : 'Suggested questions for your scope'}</span>
          </div>

          <button
            id="ai-toggle-full-library-button"
            onClick={() => setShowFullLibrary(!showFullLibrary)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            <span>{isAr ? 'عرض كل الأسئلة' : 'All questions'}</span>
            {showFullLibrary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 4 to 6 Smart Question Chips */}
        {!showFullLibrary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
            {smartQuestions.map((q) => (
              <button
                key={q.id}
                id={`smart-q-${q.id}`}
                onClick={() => handleSendMessage(isAr ? q.textAr : (q.textEn || q.textAr), q.targetIntent)}
                disabled={loading}
                className="p-2 text-start rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-start justify-between gap-1.5 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 group"
              >
                <span className="leading-snug">{isAr ? q.textAr : (q.textEn || q.textAr)}</span>
                <CornerDownLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 mt-0.5 rtl:scale-x-[-1]" />
              </button>
            ))}
          </div>
        )}

        {/* Full Question Library (Expandable Accordion / Category Selector) */}
        {showFullLibrary && (
          <div
            id="ai-full-question-library"
            className="mt-2 p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-inner"
          >
            {/* 6 Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800">
              {AI_QUESTION_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                const count = fullQuestionsCatalog[cat.category].length;
                return (
                  <button
                    key={cat.category}
                    id={`cat-tab-${cat.category}`}
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {getCategoryIcon(cat.category)}
                    <span>{isAr ? cat.titleAr : cat.titleEn}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Questions under Selected Category */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {fullQuestionsCatalog[selectedCategory].length === 0 ? (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 p-3 text-center">
                  {isAr
                    ? 'لا توجد أسئلة متاحة في هذا القسم مع الفلاتر الحالية.'
                    : 'No questions available in this category for current filters.'}
                </div>
              ) : (
                fullQuestionsCatalog[selectedCategory].map((q) => (
                  <button
                    key={q.id}
                    id={`library-q-${q.id}`}
                    onClick={() => {
                      setShowFullLibrary(false);
                      handleSendMessage(isAr ? q.textAr : (q.textEn || q.textAr), q.targetIntent);
                    }}
                    disabled={loading}
                    className="w-full text-start p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 transition-colors disabled:opacity-50 group"
                  >
                    <span>{isAr ? q.textAr : (q.textEn || q.textAr)}</span>
                    <CornerDownLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 rtl:scale-x-[-1]" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Message Chat Body */}
      <div id="ai-chat-messages-container" className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isModel = msg.role === 'model';
          const isLastModel = isModel && idx === messages.length - 1 && !msg.error && !loading;
          const followUps = isModel && !msg.error ? getSuggestedFollowUps({ intent: msg.intent, filters }) : [];
          const analysisBadge = isModel && !msg.error ? getAnalysisBadgeLabel(msg.intent, msg.contextMode) : null;

          return (
            <div key={idx} className="space-y-2">
              <div
                className={`flex items-start gap-2.5 ${
                  isUser ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : msg.error
                      ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                  }`}
                >
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : msg.error ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : msg.error
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800/80 rounded-tl-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-none whitespace-pre-line'
                  }`}
                >
                  {/* Analysis Mode Badge */}
                  {analysisBadge && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                        {analysisBadge}
                      </span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {msg.error && lastFailedPrompt && (
                    <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-end">
                      <button
                        onClick={handleRetry}
                        disabled={loading}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
                      </button>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 font-mono ${
                      isUser
                        ? 'text-blue-200 text-left'
                        : msg.error
                        ? 'text-rose-400 text-right'
                        : 'text-slate-400 text-right'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>

              {/* 4. Deterministic Follow-Ups after each Assistant Response */}
              {isModel && !msg.error && followUps.length > 0 && (
                <div className="mr-9 ml-9 mt-1 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-blue-500" />
                    <span>{isAr ? 'ممكن تسأل كمان:' : 'Suggested follow-ups:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {followUps.map((fu) => (
                      <button
                        key={fu.id}
                        id={`follow-up-${fu.id}`}
                        onClick={() => handleSendMessage(isAr ? fu.textAr : (fu.textEn || fu.textAr), fu.targetIntent)}
                        disabled={loading}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50 shadow-xs hover:border-blue-300"
                      >
                        <span>{isAr ? fu.textAr : (fu.textEn || fu.textAr)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="font-medium">
              {loadingStatusText || (isAr ? 'جاري تحليل البيانات...' : 'Analyzing data...')}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Footer Chat Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex items-center">
          <input
            id="ai-chat-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              isAr
                ? 'اكتب سؤالك التحليلي المباشر (مثل: ما هي أسباب التراجع؟)...'
                : 'Type your executive query (e.g., summarize sales growth)...'
            }
            disabled={loading}
            className="w-full ltr:pr-10 rtl:pl-10 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            id="ai-send-message-button"
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
