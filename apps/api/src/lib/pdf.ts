function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const out: string[] = [];
  let rest = line;
  while (rest.length > width) {
    out.push(rest.slice(0, width));
    rest = rest.slice(width);
  }
  if (rest.length > 0) out.push(rest);
  return out;
}

export function buildSimplePdf(title: string, lines: string[]): Uint8Array {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 40;
  const fontSize = 9;
  const lineHeight = 11;
  const maxCols = 92;
  const maxLines = Math.floor((pageHeight - 2 * margin - 24) / lineHeight);

  const wrapped: string[] = [];
  for (const line of lines) {
    const chunks = wrapLine(line.length === 0 ? " " : line, maxCols);
    wrapped.push(...chunks);
  }
  if (wrapped.length === 0) wrapped.push(" ");

  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += maxLines) {
    pages.push(wrapped.slice(i, i + maxLines));
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontId = 3;
  let nextId = 4;
  for (let i = 0; i < pages.length; i++) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  const ordered: { id: number; body: string }[] = [
    { id: 1, body: objects[0]! },
    { id: 2, body: objects[1]! },
    { id: 3, body: objects[2]! },
  ];

  for (let i = 0; i < pages.length; i++) {
    const pageId = pageIds[i]!;
    const contentId = contentIds[i]!;
    const header = escapePdf(`${title} — pág. ${i + 1}/${pages.length}`);
    const ops: string[] = [];
    ops.push("BT");
    ops.push(`/F1 10 Tf`);
    ops.push(`1 0 0 1 ${margin} ${pageHeight - margin} Tm`);
    ops.push(`(${header}) Tj`);
    ops.push(`/F1 ${fontSize} Tf`);
    ops.push(`${-0} ${-18} Td`);
    for (const line of pages[i]!) {
      ops.push(`(${escapePdf(line)}) Tj`);
      ops.push(`0 ${-lineHeight} Td`);
    }
    ops.push("ET");
    const stream = ops.join("\n");
    ordered.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    });
    ordered.push({
      id: contentId,
      body: `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    });
  }

  ordered.sort((a, b) => a.id - b.id);

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of ordered) {
    offsets[obj.id] = Buffer.byteLength(out, "utf8");
    out += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, "utf8");
  out += `xref\n0 ${ordered.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= ordered.length; i++) {
    out += `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer << /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, "utf8");
}
