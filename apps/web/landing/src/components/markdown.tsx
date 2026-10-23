/**
 * Lightweight markdown → HTML renderer for legal pages.
 */
function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}
export function renderMarkdown(md: string): string {
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
    if (/^#\s/.test(line))   { closeLists(); closeBq(); out.push(`<h1>${escape(line.replace(/^#\s/, ''))}</h1>`);  continue; }
    if (/^##\s/.test(line))  { closeLists(); closeBq(); out.push(`<h2>${escape(line.replace(/^##\s/, ''))}</h2>`); continue; }
    if (/^###\s/.test(line)) { closeLists(); closeBq(); out.push(`<h3>${escape(line.replace(/^###\s/, ''))}</h3>`); continue; }
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
  closeLists(); closeBq();
  return out.join('\n');
}

interface MarkdownProps { content: string }
export function Markdown({ content }: MarkdownProps) {
  return (
    <div
      className="text-[15px] leading-[1.95] text-foreground/80 sm:text-base [&_h1]:hidden [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-2xl [&_h3]:mb-3 [&_h3]:mt-7 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:mb-5 [&_ul]:list-none [&_ul]:ps-0 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:relative [&_li]:mb-2.5 [&_ul>li]:ps-6 [&_ul>li]:before:absolute [&_ul>li]:before:top-[0.72em] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-[hsl(var(--mint))] [&_ul>li]:before:content-[''] [&_ul>li]:before:ltr:left-1 [&_ul>li]:before:rtl:right-1 [&_strong]:font-bold [&_strong]:text-foreground [&_a]:font-medium [&_a]:text-[hsl(var(--mint))] [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-5 [&_blockquote]:rounded-xl [&_blockquote]:bg-secondary [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-foreground/70 [&_blockquote>p]:mb-0 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
