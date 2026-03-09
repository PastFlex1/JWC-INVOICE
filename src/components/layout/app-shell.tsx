'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Flower2,
  FileText,
  Users,
  Settings,
  Plus,
  Languages,
  LogOut,
  UserCircle,
  Receipt,
  ChevronDown,
  Package,
  Building,
  User,
  Tags,
  MapPin,
  FileArchive,
  Ship,
  Notebook,
  CreditCard,
  Banknote,
  Archive,
  BookCheck,
  LineChart,
  BarChartHorizontal,
} from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function AppShellHeader() {
  const { state } = useSidebar();
  return (
    <SidebarHeader className="p-4">
      <Button
        variant="ghost"
        className="flex h-auto w-full items-center justify-start gap-2 p-0 hover:bg-transparent"
        asChild
      >
        <Link href="/">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Flower2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col items-start gap-px overflow-hidden whitespace-nowrap transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <h2 className="text-lg font-semibold font-headline">JCW FLOWERS</h2>
            <p className="text-sm text-muted-foreground">Para Floristas</p>
            </div>
        </Link>
      </Button>
    </SidebarHeader>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, setLocale, locale } = useTranslation();
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const mainNavItems = [
    { href: '/invoices', label: t('sidebar.invoices'), icon: FileText },
    { href: '/accounts-payable', label: t('sidebar.accountsPayable'), icon: Receipt },
    { href: '/view-payments', label: t('sidebar.viewPayments'), icon: BookCheck },
    { href: '/reports', label: t('sidebar.reports'), icon: LineChart },
    { href: '/reports/comparative-sales', label: t('sidebar.comparativeReport'), icon: BarChartHorizontal },
    { href: '/reports/customer-report', label: t('sidebar.customerReport'), icon: Users },
  ];
  
  const documentsNavItems = [
    { href: '/credit-notes', label: t('documents.creditNotes_client'), icon: FileText },
    { href: '/debit-notes', label: t('documents.debitNotes_client'), icon: FileText },
    { href: '/farm-credit-notes', label: t('documents.creditNotes_farm'), icon: FileText },
    { href: '/farm-debit-notes', label: t('documents.debitNotes_farm'), icon: FileText },
    { href: '/account-statement', label: t('documents.accountStatement_client'), icon: Users },
    { href: '/farm-account-statement', label: t('documents.accountStatement_farm'), icon: Building },
    { href: '/historical-account-statement', label: t('documents.historicalAccountStatement_client'), icon: Archive },
    { href: '/historical-farm-account-statement', label: t('documents.historicalAccountStatement_farm'), icon: Archive },
    { href: '/payments', label: t('documents.registerPayment'), icon: Banknote },
    { href: '/record-purchase-payment', label: t('documents.registerPurchasePayment'), icon: CreditCard },
  ];

  const settingsNavItems = [
    { href: '/settings', label: t('sidebar.settings'), icon: Settings },
  ];

  const masterTableLinks = [
      { href: '/productos', label: t('masterTables.products'), icon: Package },
      { href: '/fincas', label: t('masterTables.farms'), icon: Building },
      { href: '/customers', label: t('masterTables.customers'), icon: Users },
      { href: '/consignatarios', label: t('masterTables.consignees'), icon: User },
      { href: '/vendedores', label: t('masterTables.sellers'), icon: UserCircle },
      { href: '/marcacion', label: t('masterTables.markings'), icon: Tags },
      { href: '/pais', label: t('masterTables.countries'), icon: MapPin },
      { href: '/provincias', label: t('masterTables.provinces'), icon: MapPin },
      { href: '/dae', label: t('masterTables.dae'), icon: FileArchive },
      { href: '/cargueras', label: t('masterTables.carriers'), icon: Ship },
  ];


  return (
    <SidebarProvider>
      <Sidebar>
        <AppShellHeader />

        <SidebarMenu className="flex-grow">
          <div className="px-4 py-2">
            <h3 className="mb-2 px-2 text-lg font-semibold tracking-tight transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">{t('sidebar.main')}</h3>
            <div className="space-y-1">
               {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    className="gap-3"
                    tooltip={item.label}
                  >
                    <Link href={item.href} prefetch={true}>
                      <item.icon className="h-5 w-5" />
                      <span className='transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0'>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          </div>
          <div className="px-4 py-2">
            <h3 className="mb-2 px-2 text-lg font-semibold tracking-tight transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">{t('sidebar.configuration')}</h3>
            <div className="space-y-1">
               {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    className="gap-3"
                    tooltip={item.label}
                  >
                    <Link href={item.href} prefetch={true}>
                      <item.icon className="h-5 w-5" />
                      <span className='transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0'>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          </div>
        </SidebarMenu>

        <SidebarFooter className="p-4 mt-auto transition-all duration-300 group-data-[collapsible=icon]:-ml-12 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
           <div className="flex items-center gap-3 w-full px-2">
              <div className="flex flex-col items-start gap-1">
                 <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">V1.0.1</span>
                 <p className="text-[11px] text-muted-foreground leading-tight">
                    Desarrollado por <span className="text-primary font-medium">Palma Nexus Solutions</span>
                 </p>
              </div>
            </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="app-shell-header flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
           <div className="flex-1 flex items-center gap-2">
              <Button onClick={() => router.push('/invoices/new')}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('header.newInvoice')}</span>
              </Button>
           </div>
           <div className="ml-auto flex items-center gap-2">
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className='px-2 sm:px-4'>
                    <span className='hidden sm:inline'>{t('header.documents')}</span>
                    <Notebook className='sm:hidden h-5 w-5'/>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   {documentsNavItems.map(link => (
                    <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                      <link.icon className="mr-2 h-4 w-4" />
                      <span>{link.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className='px-2 sm:px-4'>
                    <span className='hidden sm:inline'>{t('header.masterTables')}</span>
                    <Settings className='sm:hidden h-5 w-5'/>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   {masterTableLinks.map(link => (
                    <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                      <link.icon className="mr-2 h-4 w-4" />
                      <span>{link.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">{t('header.changeLanguage')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocale('es')} disabled={locale === 'es'}>
                    Español
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale('en')} disabled={locale === 'en'}>
                    English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                        <AvatarFallback>
                          <UserCircle />
                        </AvatarFallback>
                      </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
