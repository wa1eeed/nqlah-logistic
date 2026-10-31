'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSWRConfig } from 'swr';
import { Loader2, Pencil, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';

/**
 * Provider note («ملاحظة») on a driver or truck. Shows the saved note and an
 * inline editor that PATCHes `/fleet/{drivers|trucks}/:id` with `{ note }`,
 * then revalidates the fleet lists the detail pages read from.
 */
export function FleetNoteCard({
  kind,
  id,
  note,
}: {
  kind: 'truck' | 'driver';
  id: string;
  note?: string | null;
}) {
  const t = useTranslations('fleet');
  const { mutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? '');
  const [busy, setBusy] = useState(false);

  const path = `/fleet/${kind === 'truck' ? 'trucks' : 'drivers'}/${id}`;

  async function save() {
    setBusy(true);
    try {
      await api.patch(path, { note: value.trim() });
      notify.success(t('note.saved'));
      setEditing(false);
      mutate('/fleet/trucks');
      mutate('/fleet/drivers');
    } catch (e) {
      notify.error(e, t('note.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => { setValue(note ?? ''); setEditing(true); }}>
            <Pencil className="size-4" /> {note ? t('note.edit') : t('note.add')}
          </Button>
        ) : <span />}
        <CardTitle className="flex items-center gap-2">
          {t('note.title')} <StickyNote className="size-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid gap-3">
            <Textarea
              rows={4}
              value={value}
              maxLength={2000}
              placeholder={t('note.placeholder')}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                {t('note.cancel')}
              </Button>
              <Button size="sm" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t('note.save')}
              </Button>
            </div>
          </div>
        ) : note ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{note}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('note.empty')}</p>
        )}
      </CardContent>
    </Card>
  );
}
