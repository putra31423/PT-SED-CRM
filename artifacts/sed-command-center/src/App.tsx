import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { setAuthTokenGetter } from '@workspace/api-client-react';

import { AppLayout } from '@/components/layout';
import { AuthGuard } from '@/components/auth-guard';
import { getAccessToken } from '@/lib/supabase';

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

// Registered once at module load, before any query can run. The generated API
// client calls this before every request and attaches the result as a bearer
// token, so no individual call site has to know about auth. supabase-js
// refreshes the token on its own, so this always hands over a current one.
setAuthTokenGetter(getAccessToken);

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
