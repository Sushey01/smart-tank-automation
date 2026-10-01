export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-faint">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-2 font-medium">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-surface-border">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 align-top text-ink">{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
