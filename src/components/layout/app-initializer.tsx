'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AppShell } from './app-shell';
import { useAppData } from '@/context/app-data-context';
import { Flower2 } from 'lucide-react';

function AppLoadingScreen() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
             <div className="flex flex-col items-center gap-4">
                <Flower2 className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-muted-foreground">Sincronizando datos...</p>
            </div>
        </div>
    );
}

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isDataLoading, refreshData, hasBeenLoaded } = useAppData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, pathname, router]);
  
  useEffect(() => {
    if (isAuthenticated && !hasBeenLoaded && !isDataLoading) {
      refreshData();
    }
  }, [isAuthenticated, hasBeenLoaded, isDataLoading, refreshData]);

  if (isAuthLoading) {
    return <AppLoadingScreen />;
  }

  if (isAuthenticated) {
     if (isDataLoading) {
        return <AppLoadingScreen />;
     }
     if (pathname === '/login') {
        router.replace('/');
        return <AppLoadingScreen />;
     }
     return <AppShell>{children}</AppShell>;
  }

  return <>{children}</>;
}
