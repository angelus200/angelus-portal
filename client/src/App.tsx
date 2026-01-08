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
import AMLPolicy from "./pages/legal/AML";
import PrivacyPolicy from "./pages/legal/Privacy";

// Investor pages
import InvestorDashboard from "./pages/investor/Dashboard";
import InvestorOnboarding from "./pages/investor/Onboarding";
import MyInvestments from "./pages/investor/MyInvestments";
import InvestorWallet from "./pages/investor/Wallet";
import BondDetails from "./pages/investor/BondDetails";
import RiskProfile from "./pages/investor/RiskProfile";
import Subscribe from "./pages/investor/Subscribe";
import InvestorPayments from "./pages/investor/Payments";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminInvestors from "./pages/admin/Investors";
import AdminNews from "./pages/admin/News";
import AdminWallets from "./pages/admin/Wallets";
import ProductsAndContracts from "./pages/admin/ProductsAndContracts";
import AdminProfileChecks from "./pages/admin/ProfileChecks";
import AdminInvestorDetails from "./pages/admin/InvestorDetails";
import AdminManagement from "./pages/admin/AdminManagement";
import { InvestorKYCApproval } from "./pages/admin/InvestorKYCApproval";
import WalletManagement from "./pages/admin/WalletManagement";
import Payments from "./pages/admin/Payments";
import LegacyCustomerImport from '@/pages/admin/LegacyCustomerImport';
import InterestParameters from '@/pages/admin/InterestParameters';

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/impressum" component={Impressum} />
      <Route path="/aml" component={AMLPolicy} />
      <Route path="/datenschutz" component={PrivacyPolicy} />
      
      {/* Investor routes */}
      <Route path="/investor" component={InvestorDashboard} />
      <Route path="/investor/onboarding" component={InvestorOnboarding} />
      <Route path="/investor/investments" component={MyInvestments} />
      <Route path="/investor/wallet" component={InvestorWallet} />
      <Route path="/investor/bond/:id" component={BondDetails} />
      <Route path="/investor/risk-profile" component={RiskProfile} />
      <Route path="/investor/subscribe/:id" component={Subscribe} />
      <Route path="/investor/payments" component={InvestorPayments} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products-and-contracts" component={ProductsAndContracts} />
      <Route path="/admin/bonds" component={ProductsAndContracts} />
      <Route path="/admin/contracts" component={ProductsAndContracts} />
      <Route path="/admin/investors" component={AdminInvestors} />
      <Route path="/admin/news" component={AdminNews} />
      <Route path="/admin/wallets" component={WalletManagement} />
      <Route path="/admin/profile-checks" component={AdminProfileChecks} />
      <Route path="/admin/investors/:id" component={AdminInvestorDetails} />
      <Route path="/admin/admin-management" component={AdminManagement} />
      <Route path="/admin/kyc-approval" component={InvestorKYCApproval} />
      <Route path="/admin/wallet-management" component={WalletManagement} />
      <Route path="/admin/payments" component={Payments} />
      <Route path="/admin/legacy-customers/import" component={LegacyCustomerImport} />
      <Route path="/admin/interest-parameters" component={InterestParameters} />
      
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
