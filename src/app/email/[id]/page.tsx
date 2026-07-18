'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { ArrowLeft, Reply, Trash2, User, Clock, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getEmailById } from '@/services/emails';
import type { EmailMessage } from '@/lib/types';
import ComposeEmailModal from '../compose-email-modal';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/i18n-context';

export default function ReadEmailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchEmail() {
      if (typeof id !== 'string') return;
      try {
        const data = await getEmailById(id);
        if (data) {
          setEmail(data);
          if (!data.isRead && data.type === 'inbox') {
            fetch('/api/email/mark-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: data.id, isRead: true })
            }).catch(console.error);
          }
        }
      } catch (error) {
        console.error('Error fetching email', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEmail();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">{t('email.loading')}</div>;
  }

  if (!email) {
    return (
      <div className="p-8 text-center flex flex-col items-center">
        <h2 className="text-xl font-semibold mb-4">{t('email.notFound')}</h2>
        <Button onClick={() => router.push('/email')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('email.backToInbox')}
        </Button>
      </div>
    );
  }

  const sanitizedHtml = email.html ? DOMPurify.sanitize(email.html) : null;
  const replyEmail = email.type === 'inbox' ? email.from : email.to[0];

  const handleDownload = (att: any) => {
    if (!att.data) {
      toast({ title: t('common.error'), description: t('email.attachmentError'), variant: 'destructive' });
      return;
    }
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async () => {
    if (!email || !email.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/email/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('email.deleteError'));

      toast({ title: t('email.deletedTitle'), description: t('email.deletedDescription') });
      router.push('/email');
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('email.back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsReplyOpen(true)}>
            <Reply className="mr-2 h-4 w-4" />
            {t('email.reply')}
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8 flex-1 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">{email.subject || t('email.noSubject')}</h1>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {email.type === 'inbox' ? email.from : 'JCW Flowers (sales@jcwflowers.com)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('email.to')} {email.to.join(', ')}
                {email.cc && email.cc.length > 0 && ` | ${t('email.cc')} ${email.cc.join(', ')}`}
              </p>
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground shrink-0">
            <Clock className="mr-1.5 h-4 w-4" />
            {format(parseISO(email.date), 'dd MMMM yyyy, HH:mm')}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="prose prose-sm sm:prose-base max-w-none">
          {sanitizedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          ) : (
            <div className="whitespace-pre-wrap">{email.text || t('email.noText')}</div>
          )}
        </div>

        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-12 pt-6 border-t">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <File className="h-4 w-4" /> 
              {t('email.attachments')} ({email.attachments.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {email.attachments.map(att => (
                <div key={att.id || att.filename} onClick={() => handleDownload(att)} className="border rounded-lg p-3 flex flex-col gap-2 items-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <File className="h-8 w-8 text-blue-500" />
                  <span className="text-xs font-medium truncate w-full" title={att.filename}>{att.filename}</span>
                  <span className="text-[10px] text-muted-foreground">{Math.round(att.size / 1024)} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ComposeEmailModal 
        isOpen={isReplyOpen} 
        onClose={() => setIsReplyOpen(false)} 
        replyTo={{
          email: replyEmail,
          subject: email.subject,
          threadId: email.threadId || email.messageId,
          messageId: email.messageId,
          originalText: email.text,
          originalDate: email.date
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('email.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('email.deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('email.deleting') : t('email.yesDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
