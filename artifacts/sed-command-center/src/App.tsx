import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppLayout } from '@/components/layout';
import { AuthGuard } from '@/components/auth-guard';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import BusinessUnits from '@/pages/business-units';
import BusinessUnitDetail from '@/pages/business-unit-detail';
import CRM from '@/pages/crm';
import CustomerDetail from '@/pages/customer-detail';
import SalesPipeline from '@/pages/sales';
import FinanceHub from '@/pages/finance';
import Reports from '@/pages/reports';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <AuthGuard>
        <AppLayout>
          <Component />
        </AppLayout>
      </AuthGuard>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/business-units" component={BusinessUnits} />
      <ProtectedRoute path="/business-units/:id" component={BusinessUnitDetail} />
      <ProtectedRoute path="/crm" component={CRM} />
      <ProtectedRoute path="/crm/:id" component={CustomerDetail} />
      <ProtectedRoute path="/sales" component={SalesPipeline} />
      <ProtectedRoute path="/finance" component={FinanceHub} />
      <ProtectedRoute path="/finance/:tab" component={FinanceHub} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/settings" component={Settings} />
      
      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
