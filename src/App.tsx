import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import Chat from '@/pages/Chat';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import Profile from '@/pages/Profile';

const queryClient = new QueryClient();

const Spinner = () => (
  <div className="min-h-[100dvh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  if (loading) return <Spinner />;
  if (!user) return <Spinner />;
  return <Component />;
}

/** Redirects already-authenticated users away from auth pages */
function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [loading, user]);

  if (loading) return <Spinner />;
  if (user) return <Spinner />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Auth routes — accessible only when NOT logged in */}
      <Route path="/login" component={() => <GuestRoute component={Login} />} />
      <Route path="/forgot-password" component={() => <GuestRoute component={ForgotPassword} />} />

      {/* Home — public (handles guest & logged-in states internally) */}
      <Route path="/" component={Home} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/chat/:id" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
