// ---------------------------------------------------------------------------
// Themes (ported 1:1 from the old md2html.py THEMES dict)
// ---------------------------------------------------------------------------

export const THEMES: Record<'light' | 'dark' | 'blue', string> = {
	light: `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fff; }
h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 2.2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
h2 { font-size: 1.8em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; }
h3 { font-size: 1.5em; }
p { margin-bottom: 1em; }
a { color: #3498db; text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote { border-left: 4px solid #ddd; margin: 1.5em 0; padding: 0.5em 1em; color: #666; background-color: #f9f9f9; }
code { background-color: #f8f9fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: 'Courier New', Courier, monospace; }
pre { background-color: #f8f9fa; padding: 1em; overflow-x: auto; border-radius: 5px; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
tr:nth-child(even) { background-color: #f9f9f9; }
ul, ol { margin-bottom: 1em; padding-left: 2em; }
li { margin-bottom: 0.3em; }
hr { border: 0; border-top: 1px solid #eee; margin: 2em 0; }
img { max-width: 100%; height: auto; }
`,
	dark: `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #eee; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #121212; }
h1, h2, h3, h4, h5, h6 { color: #fff; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 2.2em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
h2 { font-size: 1.8em; border-bottom: 1px solid #333; padding-bottom: 0.2em; }
h3 { font-size: 1.5em; }
p { margin-bottom: 1em; }
a { color: #64b5f6; text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote { border-left: 4px solid #444; margin: 1.5em 0; padding: 0.5em 1em; color: #bbb; background-color: #1e1e1e; }
code { background-color: #1e1e1e; padding: 0.2em 0.4em; border-radius: 3px; font-family: 'Courier New', Courier, monospace; color: #f8f8f2; }
pre { background-color: #1e1e1e; padding: 1em; overflow-x: auto; border-radius: 5px; border: 1px solid #333; }
pre code { background: none; padding: 0; color: #f8f8f2; }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
th, td { border: 1px solid #444; padding: 8px; text-align: left; }
th { background-color: #1e1e1e; }
tr:nth-child(even) { background-color: #1a1a1a; }
ul, ol { margin-bottom: 1em; padding-left: 2em; }
li { margin-bottom: 0.3em; }
hr { border: 0; border-top: 1px solid #333; margin: 2em 0; }
img { max-width: 100%; height: auto; }
`,
	blue: `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #2c3e50; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ecf0f1; }
h1, h2, h3, h4, h5, h6 { color: #1a5276; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 2.2em; border-bottom: 2px solid #aed6f1; padding-bottom: 0.3em; }
h2 { font-size: 1.8em; border-bottom: 1px solid #aed6f1; padding-bottom: 0.2em; }
h3 { font-size: 1.5em; }
p { margin-bottom: 1em; }
a { color: #154360; text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote { border-left: 4px solid #aed6f1; margin: 1.5em 0; padding: 0.5em 1em; color: #566573; background-color: #d6eaf8; }
code { background-color: #d6eaf8; padding: 0.2em 0.4em; border-radius: 3px; font-family: 'Courier New', Courier, monospace; }
pre { background-color: #d6eaf8; padding: 1em; overflow-x: auto; border-radius: 5px; border: 1px solid #aed6f1; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
th, td { border: 1px solid #aed6f1; padding: 8px; text-align: left; }
th { background-color: #aed6f1; }
tr:nth-child(even) { background-color: #ebf5fb; }
ul, ol { margin-bottom: 1em; padding-left: 2em; }
li { margin-bottom: 0.3em; }
hr { border: 0; border-top: 1px solid #aed6f1; margin: 2em 0; }
img { max-width: 100%; height: auto; }
`
};

// ---------------------------------------------------------------------------
// Minimal, dependency-free Markdown -> HTML converter
// Supports: headers, hr, blockquotes, fenced code blocks, ordered/unordered
// lists, tables (GFM-style), paragraphs, and inline bold/italic/strikethrough/
// code/links/images.
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
	// Escape HTML first, then re-introduce markdown-driven tags.
	let out = escapeHtml(text);

	// Inline code (protect from further inline processing)
	const codeSpans: string[] = [];
	out = out.replace(/`([^`]+?)`/g, (_, code: string) => {
		codeSpans.push(code);
		return `\u0000CODE${codeSpans.length - 1}\u0000`;
	});

	// Images ![alt](src)
	out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
		(_, alt: string, src: string, title: string) => `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''}>`);

	// Links [text](href)
	out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
		(_, txt: string, href: string, title: string) => `<a href="${href}"${title ? ` title="${title}"` : ''}>${txt}</a>`);

	// Bold + italic combos
	out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
	out = out.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
	out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
	out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	out = out.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

	// Strikethrough
	out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

	// Restore code spans
	out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, i: string) => `<code>${codeSpans[Number(i)]}</code>`);

	return out;
}

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

export function convertMarkdownToHtml(mdText: string): string {
	const lines = mdText.replace(/\r\n/g, '\n').split('\n');
	const html: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Blank line
		if (line.trim() === '') { i++; continue; }

		// Fenced code block
		const fenceMatch = line.match(/^```(\S*)\s*$/);
		if (fenceMatch) {
			const lang = fenceMatch[1];
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !/^```\s*$/.test(lines[i])) {
				codeLines.push(lines[i]);
				i++;
			}
			i++; // skip closing fence
			const langAttr = lang ? ` class="language-${lang}"` : '';
			html.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
			continue;
		}

		// Horizontal rule
		if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
			html.push('<hr>');
			i++;
			continue;
		}

		// Headers
		const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
		if (headerMatch) {
			const level = headerMatch[1].length;
			html.push(`<h${level}>${inlineMarkdown(headerMatch[2].trim())}</h${level}>`);
			i++;
			continue;
		}

		// Blockquote
		if (/^\s*>/.test(line)) {
			const quoteLines: string[] = [];
			while (i < lines.length && /^\s*>/.test(lines[i])) {
				quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
				i++;
			}
			html.push(`<blockquote>${convertMarkdownToHtml(quoteLines.join('\n'))}</blockquote>`);
			continue;
		}

		// Table (header row + separator row)
		if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
			const headerCells = splitTableRow(line);
			i += 2;
			const bodyRows: string[][] = [];
			while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
				bodyRows.push(splitTableRow(lines[i]));
				i++;
			}
			let table = '<table>\n<thead>\n<tr>';
			for (const cell of headerCells) table += `<th>${inlineMarkdown(cell)}</th>`;
			table += '</tr>\n</thead>\n<tbody>\n';
			for (const row of bodyRows) {
				table += '<tr>';
				for (const cell of row) table += `<td>${inlineMarkdown(cell)}</td>`;
				table += '</tr>\n';
			}
			table += '</tbody>\n</table>';
			html.push(table);
			continue;
		}

		// Unordered list
		if (/^\s*[-*+]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
				i++;
			}
			html.push('<ul>\n' + items.map(it => `<li>${inlineMarkdown(it)}</li>`).join('\n') + '\n</ul>');
			continue;
		}

		// Ordered list
		if (/^\s*\d+[.)]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
				i++;
			}
			html.push('<ol>\n' + items.map(it => `<li>${inlineMarkdown(it)}</li>`).join('\n') + '\n</ol>');
			continue;
		}

		// Paragraph (collect consecutive non-blank, non-special lines)
		const paraLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!/^```/.test(lines[i]) &&
			!/^(#{1,6})\s+/.test(lines[i]) &&
			!/^\s*>/.test(lines[i]) &&
			!/^\s*[-*+]\s+/.test(lines[i]) &&
			!/^\s*\d+[.)]\s+/.test(lines[i]) &&
			!/^\s*([-*_])\s*(\1\s*){2,}$/.test(lines[i])
		) {
			paraLines.push(lines[i]);
			i++;
		}
		if (paraLines.length) {
			html.push(`<p>${inlineMarkdown(paraLines.join(' ').trim())}</p>`);
		}
	}

	return html.join('\n');
}

export function buildHtmlDocument(mdText: string, themeName: 'light' | 'dark' | 'blue', title: string): string {
	const bodyHtml = convertMarkdownToHtml(mdText);
	const themeCss = THEMES[themeName] || THEMES.light;
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
${themeCss}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
