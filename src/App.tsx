import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AccessProvider, useAccess } from './context/AccessContext';
import { AccessGate } from './components/auth/AccessGate';
import { canViewAppView, getDefaultViewForRole, type AppViewId } from './access/viewCapabilities';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { DrillDownModal } from './components/DrillDownModal';
import { EntityDetailModals } from './components/EntityDetailModals';

// View Imports
import { ExecutiveDashboard } from './views/ExecutiveDashboard';
import { SalesDashboard } from './views/SalesDashboard';
import { CustomerDashboard } from './views/CustomerDashboard';
import { CustomerActionCenter } from './views/CustomerActionCenter';
import { SalesRepDailyActionCenter } from './views/SalesRepDailyActionCenter';
import { SalesRepDashboard } from './views/SalesRepDashboard';
import { ProductDashboard } from './views/ProductDashboard';
import { CategoryDashboard } from './views/CategoryDashboard';
import { AreaDashboard } from './views/AreaDashboard';
import { LostCustomerDashboard } from './views/LostCustomerDashboard';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const { profile } = useAccess();

  if (!profile) return null;

  const requestedView = currentView as AppViewId;
  const allowed = canViewAppView(profile.role, requestedView);
  const effectiveView: AppViewId = allowed ? requestedView : getDefaultViewForRole(profile.role);

  useEffect(() => {
    if (!allowed && currentView !== effectiveView) {
      setCurrentView(effectiveView);
    }
  }, [allowed, currentView, effectiveView, setCurrentView]);

  const renderCurrentView = () => {
    switch (effectiveView) {
      case 'executive':
        return <ExecutiveDashboard />;
      case 'sales':
        return <SalesDashboard />;
      case 'customers':
        return <CustomerDashboard />;
      case 'customer-action-center':
        return <CustomerActionCenter />;
      case 'sales-rep-daily-action-center':
        return <SalesRepDailyActionCenter />;
      case 'sales-reps':
        return <SalesRepDashboard />;
      case 'products':
        return <ProductDashboard />;
      case 'categories':
        return <CategoryDashboard />;
      case 'areas':
        return <AreaDashboard />;
      case 'lost-customers':
        return <LostCustomerDashboard />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Header />
      <GlobalFilterBar />
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden">
          {renderCurrentView()}
        </main>
      </div>
      <AiAssistantPanel />
      <DrillDownModal />
      <EntityDetailModals />
    </div>
  );
};

export default function App() {
  return (
    <AccessProvider>
      <AccessGate>
        <AppProvider>
          <MainLayout />
        </AppProvider>
      </AccessGate>
    </AccessProvider>
  );
}
