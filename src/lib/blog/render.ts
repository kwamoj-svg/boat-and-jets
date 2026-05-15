/**
 * Tiny markdown-to-HTML renderer for blog posts. Supports the subset the
 * content generator actually produces: H2/H3, paragraphs, unordered lists,
 * ordered lists, links, **bold**, *italic*, `code`, blockquotes, horizontal
 * rules. Anything fancier passes through escaped.
 *
 * No external dependency — keeps the bundle slim and avoids a markdown lib
 * for ~30 posts. Output is sanitized (no raw HTML allowed in source).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  // Escape first, then re-introduce inline markdown spans.
  let out = escapeHtml(s);
  // Links [text](href)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text: string, href: string) => {
      const isExternal = /^https?:\/\//i.test(href);
      const attrs = isExternal ? ' target="_blank" rel="noopener nofollow"' : "";
      return `<a href="${href}" class="text-gold hover:text-gold-light underline"${attrs}>${text}</a>`;
    }
  );
  // Bold **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *x*  (negative-lookbehind for ** already consumed above)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Inline code `x`
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] text-gold-light text-[0.95em]">$1</code>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inList: "ul" | "ol" | null = null;
  let para: string[] = [];

  function flushPara() {
    if (para.length === 0) return;
    out.push(`<p class="text-gray-300 leading-relaxed mb-4">${inline(para.join(" "))}</p>`);
    para = [];
  }
  function closeList() {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  }

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      flushPara();
      closeList();
      i++;
      continue;
    }

    // Headings
    if (/^### /.test(line)) {
      flushPara();
      closeList();
      out.push(`<h3 class="text-xl font-light text-white mt-8 mb-3">${inline(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (/^## /.test(line)) {
      flushPara();
      closeList();
      out.push(`<h2 class="text-2xl font-light text-white mt-10 mb-4 border-l-2 border-gold/40 pl-3">${inline(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (/^# /.test(line)) {
      flushPara();
      closeList();
      out.push(`<h2 class="text-3xl font-light text-white mt-10 mb-4">${inline(line.slice(2))}</h2>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      flushPara();
      closeList();
      out.push('<hr class="my-8 border-white/10" />');
      i++;
      continue;
    }

    // Blockquote
    if (/^> /.test(line)) {
      flushPara();
      closeList();
      const buf: string[] = [];
      while (i < lines.length && /^> /.test(lines[i].trim())) {
        buf.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(
        `<blockquote class="border-l-2 border-gold/40 pl-4 italic text-gray-400 my-5">${inline(buf.join(" "))}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      flushPara();
      if (inList !== "ul") {
        closeList();
        out.push('<ul class="list-disc list-outside pl-6 space-y-2 my-4 text-gray-300">');
        inList = "ul";
      }
      out.push(`<li>${inline(line.replace(/^[-*] /, ""))}</li>`);
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      flushPara();
      if (inList !== "ol") {
        closeList();
        out.push('<ol class="list-decimal list-outside pl-6 space-y-2 my-4 text-gray-300">');
        inList = "ol";
      }
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
      i++;
      continue;
    }

    // Default: paragraph line
    closeList();
    para.push(line);
    i++;
  }

  flushPara();
  closeList();
  return out.join("\n");
}
