import { getThemeCss, isThemeName, type ThemeName } from './themes.js';

// ---------------------------------------------------------------------------
// Minimal, dependency-free Markdown -> HTML converter (Obsidian flavoured)
// Supports: headers, hr, blockquotes, fenced code, ordered/unordered/task
// lists, GFM tables, paragraphs, and inline bold/italic/strikethrough/
// highlight/code/links/images, plus Obsidian ![[image.png]] embeds and
// [[wikilinks]].
// ---------------------------------------------------------------------------

export interface ConvertOptions {
	/** Map of image reference (as written in the note) -> data: URI. */
	images?: Map<string, string>;
	/** Resolved Obsidian note targets -> exported relative HTML URLs (Smart Export). */
	wikilinks?: Map<string, string>;
	/** Preferred resolver (uses Obsidian link path rules). */
	resolveWikilink?: (target: string) => string | undefined;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i;
const REMOTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const HOLD = '\uE000'; // sentinel used to protect already-rendered HTML

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Image reference helpers (shared with images.ts so both sides use same keys)
// ---------------------------------------------------------------------------

/** `![[photo.png|300]]` inner text -> "photo.png" */
export function wikiEmbedTarget(inner: string): string {
	const [target = ''] = inner.split('|');
	const [file = ''] = target.split('#');
	return file.trim();
}

/** `![alt](my%20img.png)` src -> "my img.png"; null for http/data/etc. */
export function localImageKey(src: string): string | null {
	let s = src.trim();
	if (s.startsWith('<') && s.endsWith('>')) s = s.slice(1, -1);
	if (REMOTE_RE.test(s)) return null;
	try {
		s = decodeURIComponent(s);
	} catch {
		// keep the raw string if it isn't valid URI encoding
	}
	return s;
}

/** All local image references used by a note (code blocks are ignored). */
export function extractImageRefs(md: string): string[] {
	const text = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
	const refs = new Set<string>();

	const embedRe = /!\[\[([^\]]+)\]\]/g;
	let m: RegExpExecArray | null;
	while ((m = embedRe.exec(text)) !== null) {
		const target = wikiEmbedTarget(m[1] ?? '');
		if (IMAGE_EXT_RE.test(target)) refs.add(target);
	}

	const stdRe = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)/g;
	while ((m = stdRe.exec(text)) !== null) {
		const key = localImageKey(m[1] ?? '');
		if (key && IMAGE_EXT_RE.test(key)) refs.add(key);
	}

	return Array.from(refs);
}

// ---------------------------------------------------------------------------
// Inline rendering
// ---------------------------------------------------------------------------

function safeHref(href: string): string {
	let h = href.trim();
	if (h.startsWith('<') && h.endsWith('>')) h = h.slice(1, -1);
	if (/^\s*(javascript|vbscript):/i.test(h)) h = '#';
	return escapeHtml(h);
}

function renderEmbed(inner: string, ctx: ConvertOptions): string {
	const pipe = inner.indexOf('|');
	const extra = pipe === -1 ? '' : inner.slice(pipe + 1).trim();
	const target = wikiEmbedTarget(inner);

	// Non-image embeds (notes, PDFs, audio...) are shown as plain text.
	if (!IMAGE_EXT_RE.test(target)) {
		return `<span class="wikilink">${escapeHtml(target)}</span>`;
	}

	const src = ctx.images?.get(target);
	if (!src) {
		return `<span class="missing-embed">Image not found: ${escapeHtml(target)}</span>`;
	}

	let alt = target;
	let attrs = '';
	const size = /^(\d+)(?:x(\d+))?$/.exec(extra);
	if (size) {
		attrs += ` width="${size[1] ?? ''}"`;
		if (size[2]) attrs += ` height="${size[2]}"`;
	} else if (extra) {
		alt = extra;
	}
	return `<img src="${attrSrc(src)}" alt="${escapeHtml(alt)}"${attrs}>`;
}

function renderMarkdownImage(alt: string, src: string, title: string | undefined, ctx: ConvertOptions): string {
	let attrs = '';
	const sized = /^(.*?)\|(\d+)(?:x(\d+))?$/.exec(alt); // Obsidian: ![alt|300](x.png)
	if (sized) {
		alt = sized[1] ?? '';
		attrs += ` width="${sized[2] ?? ''}"`;
		if (sized[3]) attrs += ` height="${sized[3]}"`;
	}
	if (title) attrs += ` title="${escapeHtml(title)}"`;

	const key = localImageKey(src);
	const resolved = key !== null ? ctx.images?.get(key) : undefined;
	const finalSrc = resolved ?? src.trim().replace(/^<|>$/g, '');
	return `<img src="${attrSrc(finalSrc)}" alt="${escapeHtml(alt)}"${attrs}>`;
}

function attrSrc(src: string): string {
	if (/^(?:data:|https?:|\/\/)/i.test(src)) return escapeHtml(src);
	return escapeHtml(src.split('/').map((seg) => (seg === '..' || seg === '.' ? seg : encodeURIComponent(seg))).join('/'));
}

function slugify(text: string): string {
	return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '');
}

function wikiHref(ctx: ConvertOptions, target: string): string | undefined {
	if (ctx.resolveWikilink) {
		const href = ctx.resolveWikilink(target);
		if (href) return href;
	}
	if (!ctx.wikilinks) return undefined;
	return ctx.wikilinks.get(target)
		?? ctx.wikilinks.get(target.replace(/\.md$/i, ''))
		?? ctx.wikilinks.get(target.toLowerCase());
}

function inlineMarkdown(text: string, ctx: ConvertOptions): string {
	const stash: string[] = [];
	const hold = (html: string): string => {
		stash.push(html);
		return `${HOLD}${stash.length - 1}${HOLD}`;
	};

	let out = text;

	// 1. Inline code (protect from everything else)
	out = out.replace(/`([^`]+?)`/g, (_m: string, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

	// 2. Obsidian embeds ![[...]]
	out = out.replace(/!\[\[([^\]]+)\]\]/g, (_m: string, inner: string) => hold(renderEmbed(inner, ctx)));

	// 3. Standard images ![alt](src "title")
	out = out.replace(
		/!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
		(_m: string, alt: string, src: string, title: string | undefined) =>
			hold(renderMarkdownImage(alt, src, title, ctx))
	);

	// 4. Links [text](href) - the text stays in the stream so it can be formatted
	out = out.replace(
		/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
		(_m: string, txt: string, href: string, title: string | undefined) =>
			hold(`<a href="${safeHref(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>`) + txt + hold('</a>')
	);

	// 5. Obsidian wikilinks. Smart Export resolves known notes to real HTML routes.
	out = out.replace(/\[\[([^\]]+)\]\]/g, (_m: string, inner: string) => {
		const pipe = inner.indexOf('|');
		const rawTarget = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
		const display = pipe === -1 ? rawTarget.replace(/#/g, ' > ') : inner.slice(pipe + 1).trim();
		const hash = rawTarget.indexOf('#');
		const targetWithoutHeading = (hash === -1 ? rawTarget : rawTarget.slice(0, hash)).trim();
		const heading = hash === -1 ? '' : rawTarget.slice(hash + 1).trim();
		let href: string | undefined;
		if (!targetWithoutHeading && heading) href = `#${slugify(heading)}`;
		else if (targetWithoutHeading) {
			href = wikiHref(ctx, targetWithoutHeading);
			if (href && heading) href = `${href}#${slugify(heading)}`;
		}
		return hold(href
			? `<a class="wikilink" href="${safeHref(href)}">${escapeHtml(display)}</a>`
			: `<span class="wikilink">${escapeHtml(display)}</span>`);
	});

	// 6. Escape whatever is left, then apply emphasis
	out = escapeHtml(out);

	out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
	out = out.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
	out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	out = out.replace(/(^|\W)_([^_]+)_(?!\w)/g, '$1<em>$2</em>');
	out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
	out = out.replace(/==([^=]+)==/g, '<mark>$1</mark>');

	// 7. Restore protected HTML
	const restoreRe = new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g');
	return out.replace(restoreRe, (_m: string, i: string) => stash[Number(i)] ?? '');
}

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

function isTableSeparator(line: string): boolean {
	return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line) ||
		/^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*$/.test(line);
}

function splitTableRow(line: string): string[] {
	let row = line.trim();
	if (row.startsWith('|')) row = row.slice(1);
	if (row.endsWith('|')) row = row.slice(0, -1);
	return row.split('|').map(cell => cell.trim());
}

function renderListItem(text: string, ctx: ConvertOptions): string {
	const task = /^\[([ xX])\]\s+(.*)$/.exec(text);
	if (task) {
		const checked = task[1] === ' ' ? '' : ' checked';
		return `<li class="task"><input type="checkbox" disabled${checked}> ${inlineMarkdown(task[2] ?? '', ctx)}</li>`;
	}
	return `<li>${inlineMarkdown(text, ctx)}</li>`;
}

const HR_RE = /^\s*([-*_])\s*(\1\s*){2,}$/;
const UL_RE = /^\s*[-*+]\s+/;
const OL_RE = /^\s*\d+[.)]\s+/;

export function convertMarkdownToHtml(mdText: string, ctx: ConvertOptions = {}): string {
	const lines = mdText.replace(/\r\n/g, '\n').split('\n');
	const html: string[] = [];
	const at = (idx: number): string => lines[idx] ?? '';
	let i = 0;

	while (i < lines.length) {
		const line = at(i);

		// Blank line
		if (line.trim() === '') { i++; continue; }

		// Fenced code block (```lang optional-title)
		const fenceMatch = /^```(.*)$/.exec(line);
		if (fenceMatch) {
			const lang = ((fenceMatch[1] ?? '').trim().split(/\s+/)[0] ?? '').replace(/[^\w+#.-]/g, '');
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !/^```\s*$/.test(at(i))) {
				codeLines.push(at(i));
				i++;
			}
			i++; // skip closing fence
			const langAttr = lang ? ` class="language-${lang}"` : '';
			html.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
			continue;
		}

		// Horizontal rule
		if (HR_RE.test(line)) {
			html.push('<hr>');
			i++;
			continue;
		}

		// Headers
		const headerMatch = /^(#{1,6})\s+(.*)$/.exec(line);
		if (headerMatch) {
			const level = (headerMatch[1] ?? '#').length;
			const headingText = (headerMatch[2] ?? '').trim();
			const id = slugify(headingText);
			html.push(`<h${level}${id ? ` id="${escapeHtml(id)}"` : ''}>${inlineMarkdown(headingText, ctx)}</h${level}>`);
			i++;
			continue;
		}

		// Blockquote
		if (/^\s*>/.test(line)) {
			const quoteLines: string[] = [];
			while (i < lines.length && /^\s*>/.test(at(i))) {
				quoteLines.push(at(i).replace(/^\s*>\s?/, ''));
				i++;
			}
			html.push(`<blockquote>${convertMarkdownToHtml(quoteLines.join('\n'), ctx)}</blockquote>`);
			continue;
		}

		// Table (header row + separator row)
		if (line.includes('|') && i + 1 < lines.length && isTableSeparator(at(i + 1))) {
			const headerCells = splitTableRow(line);
			i += 2;
			const bodyRows: string[][] = [];
			while (i < lines.length && at(i).trim() !== '' && at(i).includes('|')) {
				bodyRows.push(splitTableRow(at(i)));
				i++;
			}
			let table = '<table>\n<thead>\n<tr>';
			for (const cell of headerCells) table += `<th>${inlineMarkdown(cell, ctx)}</th>`;
			table += '</tr>\n</thead>\n<tbody>\n';
			for (const row of bodyRows) {
				table += '<tr>';
				for (const cell of row) table += `<td>${inlineMarkdown(cell, ctx)}</td>`;
				table += '</tr>\n';
			}
			table += '</tbody>\n</table>';
			html.push(table);
			continue;
		}

		// Unordered list
		if (UL_RE.test(line)) {
			const items: string[] = [];
			while (i < lines.length && UL_RE.test(at(i))) {
				items.push(renderListItem(at(i).replace(UL_RE, ''), ctx));
				i++;
			}
			html.push('<ul>\n' + items.join('\n') + '\n</ul>');
			continue;
		}

		// Ordered list
		if (OL_RE.test(line)) {
			const items: string[] = [];
			while (i < lines.length && OL_RE.test(at(i))) {
				items.push(renderListItem(at(i).replace(OL_RE, ''), ctx));
				i++;
			}
			html.push('<ol>\n' + items.join('\n') + '\n</ol>');
			continue;
		}

		// Paragraph (consecutive non-blank, non-special lines)
		const paraLines: string[] = [];
		while (
			i < lines.length &&
			at(i).trim() !== '' &&
			!/^```/.test(at(i)) &&
			!/^(#{1,6})\s+/.test(at(i)) &&
			!/^\s*>/.test(at(i)) &&
			!UL_RE.test(at(i)) &&
			!OL_RE.test(at(i)) &&
			!HR_RE.test(at(i))
		) {
			paraLines.push(at(i));
			i++;
		}
		if (paraLines.length === 0) {
			// Safety net: never get stuck on a line nothing else claimed.
			paraLines.push(line);
			i++;
		}
		// Obsidian shows single newlines as line breaks, so we do too.
		html.push(`<p>${paraLines.map(l => inlineMarkdown(l.trim(), ctx)).join('<br>\n')}</p>`);
	}

	return html.join('\n');
}

export function buildHtmlDocument(
	mdText: string,
	themeName: ThemeName,
	title: string,
	options: ConvertOptions = {}
): string {
	// Drop YAML frontmatter (--- ... ---) at the very top of the note.
	const body = mdText
		.replace(/\r\n/g, '\n')
		.replace(/^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/, '');

	const bodyHtml = convertMarkdownToHtml(body, options);
	const themeCss = getThemeCss(isThemeName(themeName) ? themeName : 'light');
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${themeCss}
html{background:var(--bg)}
html.invert{filter:invert(1) hue-rotate(180deg)}
html.invert img,html.invert video,html.invert canvas{filter:invert(1) hue-rotate(180deg)}
.invert-btn{position:fixed;top:14px;right:14px;z-index:20;border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--soft);color:var(--fg);cursor:pointer;font:inherit;font-size:13px}
.invert-btn:hover{border-color:var(--accent)}
@media print{.invert-btn{display:none}}
</style>
</head>
<body>
<button class="invert-btn" id="invert-toggle" type="button" aria-pressed="false" title="Invert page colours">Invert</button>
${bodyHtml}
<script>(()=>{const root=document.documentElement;const btn=document.getElementById('invert-toggle');const setInvert=(on)=>{root.classList.toggle('invert',on);btn.setAttribute('aria-pressed',String(on));btn.textContent=on?'Original':'Invert';try{localStorage.setItem('md2html-invert',on?'1':'0')}catch{}};try{if(localStorage.getItem('md2html-invert')==='1')setInvert(true)}catch{}btn.addEventListener('click',()=>setInvert(!root.classList.contains('invert')))})();</script>
</body>
</html>`;
}