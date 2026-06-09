import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  TrendingUp,
  Wallet,
  Shield,
  FileText,
  Newspaper,
  Settings,
  Home,
  CheckSquare,
  CreditCard,
  Upload,
  Percent,
  Bitcoin,
  Mail,
  Building2,
  UserCheck,
  Inbox,
} from "lucide-react";
import React, { CSSProperties, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import Footer from "./Footer";
import { BRAND } from '@shared/brand';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  TrendingUp,
  Wallet,
  Shield,
  FileText,
  Newspaper,
  Settings,
  Home,
  CheckSquare,
  CreditCard,
  Upload,
  Percent,
  Bitcoin,
  Mail,
  Building2,
  UserCheck,
  Inbox,
};

// Default investor menu items
const investorMenuItems = [
  { icon: "LayoutDashboard", label: "Dashboard", path: "/investor" },
  { icon: "Newspaper", label: "Für Investoren", path: "/fuer-investoren" },
  { icon: "TrendingUp", label: "Meine Investments", path: "/investor/investments" },
  { icon: "CreditCard", label: "Zahlungen", path: "/investor/payments" },
  { icon: "Wallet", label: "Wallet", path: "/investor/wallet" },
  { icon: "Shield", label: "Risikoprofil", path: "/investor/risk-profile" },
];

// Admin menu items
const adminMenuItems = [
  { icon: "LayoutDashboard", label: "Dashboard", path: "/admin" },
  { icon: "FileText", label: "Produkte & Verträge", path: "/admin/products-and-contracts" },
  { icon: "TrendingUp", label: "Beteiligungen", path: "/admin/bonds" },
  { icon: "Building2", label: "Emittenten", path: "/admin/issuers" },
  { icon: "Users", label: "Investoren", path: "/admin/investors" },
  { icon: "Inbox", label: "Leads", path: "/admin/leads" },
  { icon: "CreditCard", label: "Zahlungen", path: "/admin/payments" },
  { icon: "FileText", label: "Bestandsverträge", path: "/admin/bestandskunden" },
  { icon: "Percent", label: "Zinsparameter", path: "/admin/interest-parameters" },
  { icon: "Wallet", label: "Wallets", path: "/admin/wallets" },
  { icon: "Bitcoin", label: "Crypto-Wallets", path: "/admin/crypto-wallets" },
  { icon: "CheckSquare", label: "Profil-Checks", path: "/admin/profile-checks" },
  { icon: "CheckSquare", label: "KYC-Genehmigung", path: "/admin/kyc-approval" },
  { icon: "UserCheck", label: "Freischaltungen", path: "/admin/access-requests" },
  { icon: "Newspaper", label: "News", path: "/admin/news" },
  { icon: "Mail", label: "Einladungen", path: "/admin/invitations" },
  { icon: "Shield", label: "Admin-Verwaltung", path: "/admin/admin-management" },
  { icon: "Settings", label: "Sicherheit", path: "/admin/security" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

interface DashboardLayoutProps {
  children: ReactNode;
  variant?: "investor" | "admin";
}

export default function DashboardLayout({
  children,
  variant = "investor",
}: DashboardLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Redirect to appropriate dashboard based on role
  useEffect(() => {
    if (!loading && user) {
      // Allow both admin and superadmin to access admin area
      if (variant === "admin" && user.role !== "admin" && user.role !== "superadmin") {
        setLocation("/investor");
      }
    }
  }, [loading, user, variant, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">A</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Anmeldung erforderlich
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Bitte melden Sie sich an, um auf das Portal zuzugreifen.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = '/sign-in';
            }}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Anmelden
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const menuItems = variant === "admin" ? adminMenuItems : investorMenuItems;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent 
        setSidebarWidth={setSidebarWidth}
        menuItems={menuItems}
        variant={variant}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  menuItems: { icon: string; label: string; path: string }[];
  variant: "investor" | "admin";
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  menuItems,
  variant,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const needs2FASetup =
    variant === "admin" &&
    (user?.role === "admin" || user?.role === "superadmin") &&
    !user?.totpEnabled &&
    !location.startsWith("/admin/security");
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Add User Management for superadmins
  const enhancedMenuItems = React.useMemo(() => {
    if (variant === "admin" && user?.role === "superadmin") {
      // Add User Management link for superadmins only
      const hasUserManagement = menuItems.some(item => item.path === "/admin/user-management");
      if (!hasUserManagement) {
        return [
          ...menuItems,
          { icon: "Users", label: "User-Verwaltung", path: "/admin/user-management" },
        ];
      }
    }
    return menuItems;
  }, [menuItems, variant, user?.role]);

  const activeMenuItem = enhancedMenuItems.find(item => {
    // Exact match for dashboard routes
    if (item.path === "/admin" || item.path === "/investor") {
      return location === item.path;
    }
    // Prefix match for other routes
    return location.startsWith(item.path);
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                {isCollapsed ? (
                  <img
                    src={BRAND.logo}
                    alt={BRAND.name}
                    className="w-7 h-7 object-contain rounded bg-white/90 p-0.5"
                  />
                ) : (
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground/70" />
                )}
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={BRAND.logo}
                    alt={BRAND.name}
                    className="w-10 h-10 object-contain flex-shrink-0 rounded bg-white/90 p-0.5"
                  />
                  <span className="font-semibold tracking-tight truncate text-sidebar-foreground">
                    {BRAND.name}
                  </span>
                  {variant === "admin" && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {enhancedMenuItems.map(item => {
                const isActive = location === item.path ||
                  (item.path !== "/investor" && item.path !== "/admin" && location.startsWith(item.path)) ||
                  (item.path === "/admin/products-and-contracts" && (location.startsWith("/admin/products-and-contracts") || location.startsWith("/admin/contracts")));
                const IconComponent = iconMap[item.icon] || LayoutDashboard;
                return (
                  <SidebarMenuItem key={item.path}>
                    <Link href={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "Benutzer"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {(user?.role === "admin" || user?.role === "superadmin") && variant === "investor" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/admin")}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin-Bereich</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {variant === "admin" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/investor")}
                      className="cursor-pointer"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      <span>Investor-Bereich</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setLocation("/")}
                  className="cursor-pointer"
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Zur Startseite</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menü"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col min-h-screen">
          {needs2FASetup && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  <strong>2FA erforderlich:</strong> Ihr Admin-Account ist nicht durch Zwei-Faktor-Authentifizierung geschützt.
                </span>
              </div>
              <button
                onClick={() => setLocation("/admin/security")}
                className="shrink-0 text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded transition-colors"
              >
                Jetzt einrichten
              </button>
            </div>
          )}
          <main className="flex-1 p-4 md:p-6">{children}</main>
          <Footer />
        </div>
      </SidebarInset>
    </>
  );
}
