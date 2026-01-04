import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Impressum from "./pages/Impressum";

// Investor pages
import InvestorDashboard from "./pages/investor/Dashboard";
import InvestorOnboarding from "./pages/investor/Onboarding";
import MyInvestments from "./pages/investor/MyInvestments";
import InvestorWallet from "./pages/investor/Wallet";
import BondDetails from "./pages/investor/BondDetails";
import RiskProfile from "./pages/investor/RiskProfile";
import Subscribe from "./pages/investor/Subscribe";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBonds from "./pages/admin/Bonds";
import AdminInvestors from "./pages/admin/Investors";
import AdminNews from "./pages/admin/News";
import AdminWallets from "./pages/admin/Wallets";
import AdminContracts from "./pages/admin/Contracts";
import AdminProfileChecks from "./pages/admin/ProfileChecks";
import AdminInvestorDetails from "./pages/admin/InvestorDetails";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/impressum" component={Impressum} />
      
      {/* Investor routes */}
      <Route path="/investor" component={InvestorDashboard} />
      <Route path="/investor/onboarding" component={InvestorOnboarding} />
      <Route path="/investor/investments" component={MyInvestments} />
      <Route path="/investor/wallet" component={InvestorWallet} />
      <Route path="/investor/bond/:id" component={BondDetails} />
      <Route path="/investor/risk-profile" component={RiskProfile} />
      <Route path="/investor/subscribe/:id" component={Subscribe} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/bonds" component={AdminBonds} />
      <Route path="/admin/investors" component={AdminInvestors} />
      <Route path="/admin/news" component={AdminNews} />
      <Route path="/admin/wallets" component={AdminWallets} />
      <Route path="/admin/contracts" component={AdminContracts} />
      <Route path="/admin/profile-checks" component={AdminProfileChecks} />
      <Route path="/admin/investors/:id" component={AdminInvestorDetails} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
