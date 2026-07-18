'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useTranslation } from '@/context/i18n-context';
import { Send, X, Loader2, Paperclip, File as FileIcon } from 'lucide-react';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    email: string;
    subject: string;
    messageId?: string;
    threadId?: string;
    originalText?: string;
    originalDate?: string;
  };
}

export default function ComposeEmailModal({ isOpen, onClose, replyTo }: ComposeEmailModalProps) {
  const [to, setTo] = useState(replyTo?.email || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(replyTo?.subject ? (replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`) : '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<{name: string, type: string, size: number, data: string}[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: t('email.composeSection.fileTooLargeTitle'), description: t('email.composeSection.fileTooLargeDesc', { name: file.name }), variant: 'destructive' });
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setAttachments(prev => [...prev, {
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: ev.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({ title: t('common.error'), description: t('email.composeSection.requiredFields'), variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        to: to.split(',').map(e => e.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${body}</div>`,
        createdBy: user?.username || 'admin',
        threadId: replyTo?.threadId,
        inReplyTo: replyTo?.messageId,
        attachments
      };

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('email.composeSection.sendError'));

      toast({ title: t('common.success'), description: t('email.composeSection.sendSuccessDesc') });
      onClose();
      if (!replyTo) {
        setTo('');
        setCc('');
        setSubject('');
        setBody('');
        setAttachments([]);
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{replyTo ? t('email.composeSection.replyTitle') : t('email.composeSection.newTitle')}</DialogTitle>
          <DialogDescription className="hidden">
            {t('email.composeSection.modalDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-[60px_1fr] items-center gap-2">
            <Label htmlFor="to" className="text-right text-muted-foreground">{t('email.composeSection.to')}</Label>
            <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t('email.composeSection.toPlaceholder')} />
          </div>
          <div className="grid grid-cols-[60px_1fr] items-center gap-2">
            <Label htmlFor="cc" className="text-right text-muted-foreground">{t('email.composeSection.cc')}</Label>
            <Input id="cc" value={cc} onChange={(e) => setCc(e.target.value)} placeholder={t('email.composeSection.ccPlaceholder')} />
          </div>
          <div className="grid grid-cols-[60px_1fr] items-center gap-2">
            <Label htmlFor="subject" className="text-right text-muted-foreground">{t('email.composeSection.subject')}</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('email.composeSection.subjectPlaceholder')} />
          </div>
          
          <div className="grid gap-2">
            <Textarea 
              className="min-h-[200px] resize-none" 
              placeholder={t('email.composeSection.bodyPlaceholder')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
             {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-100 rounded px-3 py-1 border text-sm">
                      <FileIcon className="h-4 w-4 text-slate-500" />
                      <span className="truncate max-w-[150px]">{att.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500 ml-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
             )}
             <div>
                <input type="file" id="email-attachments" multiple className="hidden" onChange={handleFileChange} />
                <Label htmlFor="email-attachments" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                   <Paperclip className="mr-2 h-4 w-4" /> {t('email.composeSection.attachFiles')}
                </Label>
             </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="text-xs text-muted-foreground">
            {t('email.composeSection.sendingAs')} <strong>sales@jcwflowers.com</strong>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              {t('email.composeSection.cancel')}
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSending ? t('email.composeSection.sending') : t('email.composeSection.send')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
