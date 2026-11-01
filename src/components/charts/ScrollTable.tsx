/** Plain two/three column table used for every chart's table view. */
export function ScrollTable({
  head,
  rows,
  numericFrom = 99,
}: {
  head: string[];
  rows: string[][];
  numericFrom?: number;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-ui text-faint">
        Nothing recorded in this range yet.
      </p>
    );
  }
  return (
    <div className="kf-tw max-h-[260px] overflow-y-auto">
      <table className="w-full border-collapse text-ui">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className="font-mono sticky top-0 border-b px-2 py-2 text-label tracking-[.08em]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--panel)",
                  color: "var(--text3)",
                  textAlign: i >= numericFrom ? "right" : "left",
                }}
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={ci >= numericFrom ? "font-mono px-2 py-2 text-right" : "px-2 py-2"}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: ci >= numericFrom ? "var(--text)" : "var(--text2)",
                    fontVariantNumeric: ci >= numericFrom ? "tabular-nums" : undefined,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
