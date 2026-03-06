// src/components/ui/DataTable.tsx
"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Local cn helper (kept inline to avoid missing imports).
 */
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * ColumnDef is intentionally minimal and Blueprint-friendly.
 * NOTE: For backwards compatibility, DataTable also supports a legacy `render`
 * function on the column (alias of `cell`).
 */
export type ColumnDef<Row> = {
  id: string;
  header: React.ReactNode;
  /** Primary cell renderer */
  cell?: (row: Row) => React.ReactNode;
  /**
   * Legacy alias used by some pages.
   * If provided and `cell` is missing, DataTable will call this.
   */
  render?: (row: Row) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Optional sort accessor */
  sortValue?: (row: Row) => string | number | null | undefined;
};

type Props<Row> = {
  columns: ColumnDef<Row>[];
  rows: Row[];
  /**
   * Required by design, but we provide a safe fallback:
   * - if row has `id` string -> uses it
   * - else uses row index
   */
  rowKey?: (row: Row, index: number) => string;
  selectedRowId?: string;
  onRowClick?: (row: Row) => void;
  /** Optional toolbar slot */
  toolbarRight?: React.ReactNode;
  compact?: boolean;
};

export default function DataTable<Row>({
  columns,
  rows,
  rowKey,
  selectedRowId,
  onRowClick,
  toolbarRight,
  compact,
}: Props<Row>) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    const col = columns.find((c) => c.id === sortBy);
    if (!col?.sortValue) return rows;

    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...rows];

    copy.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);

      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;

      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });

    return copy;
  }, [rows, columns, sortBy, sortDir]);

  function keyFor(row: Row, index: number) {
    if (rowKey) return rowKey(row, index);
    const anyRow = row as any;
    if (anyRow && typeof anyRow.id === "string") return anyRow.id;
    return String(index);
  }

  function toggleSort(colId: string) {
    if (sortBy !== colId) {
      setSortBy(colId);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <div className={cn("card", compact && "tableCompact")}>
      {toolbarRight ? (
        <div className="tableToolbar">
          <div />
          <div>{toolbarRight}</div>
        </div>
      ) : null}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => {
                const sortable = !!c.sortValue;
                const active = sortBy === c.id;
                return (
                  <th
                    key={c.id}
                    className={cn(c.headerClassName, sortable && "sortable", active && "active")}
                    onClick={sortable ? () => toggleSort(c.id) : undefined}
                    role={sortable ? "button" : undefined}
                    tabIndex={sortable ? 0 : undefined}
                  >
                    <div className="thInner">
                      <span>{c.header}</span>
                      {sortable ? (
                        <span className="sortIcon">
                          {active ? (
                            sortDir === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ChevronDown size={14} className="muted" />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((r, idx) => {
              const id = keyFor(r, idx);
              const selected = !!selectedRowId && selectedRowId === id;

              return (
                <tr
                  key={id}
                  className={cn(selected && "selected", onRowClick && "clickable")}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  {columns.map((c) => {
                    const renderer = c.cell || c.render;
                    const cell = renderer ? renderer(r) : null;

                    return (
                      <td key={c.id} className={cn(c.className)}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
