export interface DetailRow {
  label: string;
  value: string | number | null | undefined;
  accent?: 'money' | 'primary' | 'danger';
}

/**
 * Join name parts skipping nulls, empties, and placeholder dashes ("-").
 * Returns undefined when no usable parts remain.
 */
export const joinName = (...parts: Array<string | null | undefined>): string | undefined => {
  const cleaned = parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p && p !== '-');
  return cleaned.length ? cleaned.join(' ') : undefined;
};

/**
 * Build a display name from the first non-empty option.
 * Skips empty strings, nulls, and "-" placeholders.
 */
export const pickName = (...candidates: Array<string | null | undefined>): string | undefined => {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t && t !== '-') return t;
    }
  }
  return undefined;
};

const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
      c
    ] as string,
  );

const valueColor = (accent?: DetailRow['accent']): string => {
  switch (accent) {
    case 'money':
      return '#059669';
    case 'primary':
      return '#0f766e';
    case 'danger':
      return '#dc2626';
    default:
      return '#0f172a';
  }
};

/**
 * Render a clean key/value list for use as Swal `html`.
 * Square card with row dividers, comfortable spacing.
 * Optionally appends a highlighted note block (e.g. `remark`).
 */
export const renderApprovalDetails = (
  rows: DetailRow[],
  note?: string | null,
  noteLabel: string = 'หมายเหตุ',
): string => {
  const visible = rows.filter(
    (r) => r.value !== null && r.value !== undefined && r.value !== '',
  );

  const rowsHtml = visible
    .map(
      (r, idx) => `
        <div style="display:flex;gap:8px;align-items:baseline;padding:11px 18px;${idx > 0 ? 'border-top:1px solid #eef2f7;' : ''}font-size:15px;line-height:1.5;">
          <span style="color:#64748b;font-weight:500;flex-shrink:0;">${escapeHtml(r.label)}:</span>
          <span style="color:${valueColor(r.accent)};font-weight:${r.accent ? 700 : 600};word-break:break-word;${r.accent === 'money' ? 'font-size:18px;letter-spacing:0.2px;' : ''}">${escapeHtml(r.value)}</span>
        </div>
      `,
    )
    .join('');

  const noteHtml =
    note && String(note).trim()
      ? `
        <div style="margin-top:14px;padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;text-align:left;">
          <div style="font-size:12px;color:#92400e;font-weight:600;margin-bottom:4px;">${escapeHtml(noteLabel)}</div>
          <div style="font-size:14px;color:#78350f;line-height:1.55;white-space:pre-wrap;">${escapeHtml(note)}</div>
        </div>
      `
      : '';

  return `
    <div style="text-align:left;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
        ${rowsHtml}
      </div>
      ${noteHtml}
    </div>
  `;
};

/**
 * Render a list of items (e.g. products or expenses) below the detail card.
 * Truncates after `maxVisible` rows with a "+N more" line.
 */
export const renderItemList = (
  items: Array<{ name: string; right: string; rightColor?: string }>,
  maxVisible: number = 5,
  emptyText?: string,
): string => {
  if (!items || items.length === 0) {
    return emptyText
      ? `<div style="margin-top:12px;text-align:center;color:#94a3b8;font-size:13px;">${escapeHtml(emptyText)}</div>`
      : '';
  }

  const visible = items.slice(0, maxVisible);
  const rows = visible
    .map(
      (it, idx) => `
        <div style="display:flex;justify-content:space-between;gap:16px;padding:10px 18px;${idx > 0 ? 'border-top:1px solid #eef2f7;' : ''}font-size:14px;">
          <span style="color:#475569;flex:1;word-break:break-word;">${escapeHtml(it.name)}</span>
          <span style="color:${it.rightColor || '#0f172a'};font-weight:600;flex-shrink:0;">${escapeHtml(it.right)}</span>
        </div>
      `,
    )
    .join('');

  const more =
    items.length > maxVisible
      ? `<div style="padding:10px 18px;text-align:center;color:#94a3b8;font-size:13px;border-top:1px solid #eef2f7;background:#f8fafc;">และอีก ${items.length - maxVisible} รายการ</div>`
      : '';

  const header = `<div style="padding:8px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.3px;">รายการ (${items.length})</div>`;

  return `
    <div style="margin-top:14px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(15,23,42,0.04);text-align:left;">
      ${header}
      ${rows}
      ${more}
    </div>
  `;
};
