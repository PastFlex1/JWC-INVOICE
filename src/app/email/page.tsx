'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Mail, Send, Inbox, RefreshCw, PenSquare, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { subscribeEmails } from '@/services/emails';
import type { EmailMessage } from '@/lib/types';
import { useTranslation } from '@/context/i18n-context';
import ComposeEmailModal from './compose-email-modal';

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = subscribeEmails(activeTab, (data) => {
      setEmails(data);
    });
    return () => unsubscribe();
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/email/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: t('email.syncComplete'),
          description: t('email.syncSuccess', { count: data.count }),
        });
      } else {
        throw new Error(data.error || t('email.syncError'));
      }
    } catch (error: any) {
      toast({
        title: t('email.syncError'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredEmails = emails.filter(email => 
    email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    email.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.to?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredEmails.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('email.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('email.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('email.sync')}
          </Button>
          <Button onClick={() => setIsComposeOpen(true)}>
            <PenSquare className="mr-2 h-4 w-4" />
            {t('email.compose')}
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow border flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'inbox' | 'sent')} className="w-full flex flex-col h-full">
          <div className="border-b p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
              <TabsTrigger value="inbox" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                {t('email.inbox')}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t('email.sent')}
              </TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('email.searchPlaceholder')}
                className="pl-8 w-full sm:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="flex-1 overflow-auto p-0 m-0">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <SearchX className="h-12 w-12 mb-4 text-slate-300" />
                <p>{t('email.noEmails')}</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="divide-y flex-1 overflow-auto">
                  {paginatedEmails.map(email => (
                  <div 
                    key={email.id}
                    onClick={() => router.push(`/email/${email.id}`)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors grid grid-cols-[1fr_auto] gap-4 ${!email.isRead && activeTab === 'inbox' ? 'bg-slate-50/80' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold truncate ${!email.isRead && activeTab === 'inbox' ? 'text-black' : 'text-slate-700'}`}>
                          {activeTab === 'inbox' ? email.from : email.to.join(', ')}
                        </span>
                      </div>
                      <p className={`truncate text-sm ${!email.isRead && activeTab === 'inbox' ? 'font-medium text-slate-900' : 'text-slate-900'}`}>
                        {email.subject || t('email.noSubject')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground mt-1">
                        {email.text ? email.text.substring(0, 100) : '...'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                      {format(parseISO(email.date), 'dd/MM/yyyy HH:mm')}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-2 text-[10px] bg-slate-200 px-2 py-1 rounded w-fit ml-auto">
                          📎 {email.attachments.length}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
                {totalPages > 1 && (
                  <div className="border-t p-4 flex items-center justify-between bg-slate-50/50 mt-auto shrink-0">
                    <div className="text-sm text-muted-foreground">
                      {t('common.page', { currentPage, totalPages })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        {t('common.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                      >
                        {t('common.next')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ComposeEmailModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
      />
    </div>
  );
}
