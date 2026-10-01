import { useState } from 'react';

function highlight(value: unknown) {
  const raw = JSON.stringify(value, null, 2) ?? 'null';
  const escaped = raw.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  return escaped.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let color = 'text-brand-700 dark:text-brand-300';
      if (match.startsWith('"')) {
        color = match.endsWith(':') ? 'text-ink' : 'text-emerald-700 dark:text-emerald-300';
      } else if (match === 'true' || match === 'false') {
        color = 'text-amber-700 dark:text-amber-300';
      } else if (match === 'null') {
        color = 'text-ink-faint';
      }
      return `<span class="${color}">${match}</span>`;
    },
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        {open ? 'Hide raw JSON' : 'Show raw JSON'}
      </button>
      {open && (
        <pre
          className="mt-3 max-h-80 overflow-auto rounded-xl bg-surface-muted p-3 font-mono text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlight(value) }}
        />
      )}
    </div>
  );
}
