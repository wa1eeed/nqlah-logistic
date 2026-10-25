'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle, CheckCircle2, Clock, Eye, FileText, History, RotateCcw, Save, Scale, Send, Shield, Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { formatDate, type LegalDocId } from '@naqla/shared-utils';
import { useLegalStore } from '@/stores/legal-store';
import { cn } from '@/lib/utils';

const DOC_META: Record<LegalDocId, { icon: any; url: string }> = {
  terms:     { icon: Scale,  url: '/terms' },
  privacy:   { icon: Shield, url: '/privacy' },
  transport: { icon: Truck,  url: '/transport' },
};

export default function AdminLegalPage() {
  const t = useTranslations('admin');
  return (
    <>
      <PageHeader
        eyebrow={t('legal.eyebrow')}
        title={t('legal.title')}
        subtitle={t('legal.subtitle')}
      />
      <Tabs defaultValue="terms" className="space-y-4">
        <TabsList>
          {(Object.keys(DOC_META) as LegalDocId[]).map((id) => {
            const Icon = DOC_META[id].icon;
            return (
              <TabsTrigger key={id} value={id}>
                <Icon className="h-4 w-4 me-1.5" /> {t(`legal.doc.${id}.label`)}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {(Object.keys(DOC_META) as LegalDocId[]).map((id) => (
          <TabsContent key={id} value={id}>
            <DocEditor docId={id} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function DocEditor({ docId }: { docId: LegalDocId }) {
  const t = useTranslations('admin');
  const doc = useLegalStore((s) => s.docs[docId]);
  const saveDraft = useLegalStore((s) => s.saveDraft);
  const publish = useLegalStore((s) => s.publish);
  const discardDraft = useLegalStore((s) => s.discardDraft);
  const resetDoc = useLegalStore((s) => s.resetDoc);

  const meta = DOC_META[docId];
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentContent = doc.draftContent ?? doc.content;
  const hasDraft = !!doc.draftContent;

  const handleSaveDraft = (content: string) => {
    saveDraft(docId, content);
    setSavedAt(new Date());
  };

  const handlePublish = () => {
    publish(docId);
    setConfirmOpen(false);
    setSavedAt(new Date());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle>{t(`legal.doc.${docId}.label`)}</CardTitle>
              <Badge variant="outline" className="font-mono">v{doc.version}</Badge>
              {hasDraft && <Badge variant="warning"><Clock className="h-3 w-3 me-1" /> {t('legal.unpublishedDraft')}</Badge>}
            </div>
            <CardDescription className="mt-1">{t(`legal.doc.${docId}.description`)}</CardDescription>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span><History className="h-3 w-3 inline me-1" />{t('legal.lastPublished', { date: formatDate(doc.publishedAt, 'd MMMM yyyy · HH:mm') })}</span>
              {doc.draftUpdatedAt && <span>• {t('legal.draftSaved', { date: formatDate(doc.draftUpdatedAt, 'd MMMM · HH:mm') })}</span>}
              {savedAt && <span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t('legal.savedNow')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={meta.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Eye className="h-3.5 w-3.5" /> {t('legal.previewOnSite')}
            </a>
            {hasDraft && (
              <Button variant="ghost" size="sm" onClick={() => discardDraft(docId)}>
                <RotateCcw className="h-3.5 w-3.5" /> {t('legal.discardDraft')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={!hasDraft}
            >
              <Send className="h-3.5 w-3.5" /> {t('legal.publish')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'edit' | 'preview')}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="edit">{t('legal.editMarkdown')}</TabsTrigger>
              <TabsTrigger value="preview">{t('legal.preview')}</TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(t('legal.confirmReset'))) {
                  resetDoc(docId);
                }
              }}
            >
              {t('legal.resetDefault')}
            </Button>
          </div>

          <TabsContent value="edit">
            <MarkdownEditor
              value={currentContent}
              onChange={handleSaveDraft}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="h-3 w-3" />
              {t('legal.autoSaveHint')}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="prose-preview">
              <MarkdownPreview markdown={currentContent} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('legal.confirmPublish')}</DialogTitle>
            <DialogDescription>{t('legal.publishDialogDesc', { from: doc.version, to: bumpVersionLabel(doc.version) })}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('legal.reacceptTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('legal.reacceptDesc')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{t('legal.cancel')}</Button>
            <Button onClick={handlePublish}>
              <CheckCircle2 className="h-4 w-4" /> {t('legal.publishNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function bumpVersionLabel(v: string): string {
  const parts = v.split('.').map(Number);
  parts[parts.length - 1] = (parts[parts.length - 1] ?? 0) + 1;
  return parts.join('.');
}

// ─── Markdown editor + preview ────────────────────────────────────────

function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations('admin');
  const insertAtCursor = (snippet: string) => {
    const el = document.getElementById('md-editor') as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + snippet.length, start + snippet.length); }, 0);
  };

  const TOOLBAR = [
    { label: 'H1', insert: '\n# ' },
    { label: 'H2', insert: '\n## ' },
    { label: 'H3', insert: '\n### ' },
    { label: 'Bold', insert: t('legal.editor.boldSnippet') },
    { label: 'Italic', insert: t('legal.editor.italicSnippet') },
    { label: 'List', insert: t('legal.editor.listSnippet') },
    { label: 'Ordered', insert: t('legal.editor.orderedSnippet') },
    { label: 'Link', insert: t('legal.editor.linkSnippet') },
    { label: 'Quote', insert: '\n> ' },
    { label: 'Code', insert: t('legal.editor.codeSnippet') },
  ];

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-1 p-1.5 border-b bg-muted/40 overflow-x-auto">
        {TOOLBAR.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => insertAtCursor(t.insert)}
            className="px-2 py-1 text-xs font-medium rounded hover:bg-card whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
        <div className="ms-auto text-xs text-muted-foreground pe-2 num">
          {t('legal.charCount', { count: value.length.toLocaleString('en-US') })}
        </div>
      </div>
      <textarea
        id="md-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        className="w-full p-4 bg-transparent text-sm leading-relaxed font-mono focus:outline-none resize-y"
        dir="rtl"
      />
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = renderMarkdown(markdown);
  return (
    <div
      className="rounded-lg border bg-card p-6 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:border-s-4 [&_blockquote]:border-primary/40 [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Lightweight markdown → HTML renderer (headings, lists, bold, italic, links, blockquotes, code).
 * Not a full CommonMark — enough for legal copy.
 */
function renderMarkdown(md: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false, inOl = false, inBq = false;

  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  const closeBq = () => { if (inBq) { out.push('</blockquote>'); inBq = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^#\s/.test(line))      { closeLists(); closeBq(); out.push(`<h1>${escape(line.replace(/^#\s/, ''))}</h1>`);   continue; }
    if (/^##\s/.test(line))     { closeLists(); closeBq(); out.push(`<h2>${escape(line.replace(/^##\s/, ''))}</h2>`);  continue; }
    if (/^###\s/.test(line))    { closeLists(); closeBq(); out.push(`<h3>${escape(line.replace(/^###\s/, ''))}</h3>`); continue; }

    if (/^>\s?/.test(line)) {
      closeLists();
      if (!inBq) { out.push('<blockquote>'); inBq = true; }
      out.push(`<p>${inline(escape(line.replace(/^>\s?/, '')))}</p>`);
      continue;
    } else { closeBq(); }

    if (/^-\s/.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(escape(line.replace(/^-\s/, '')))}</li>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(escape(line.replace(/^\d+\.\s/, '')))}</li>`);
      continue;
    }

    closeLists();

    if (line.trim() === '') { out.push(''); continue; }
    out.push(`<p>${inline(escape(line))}</p>`);
  }
  closeLists();
  closeBq();

  return out.join('\n');

  function inline(s: string): string {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }
}

// keep `cn` and `FileText` imports useful even if unused inline
void cn;
void FileText;
