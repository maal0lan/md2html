// ---------------------------------------------------------------------------
// Themes: every theme is just a small colour palette. The layout/typography
// CSS (BASE_CSS) is shared, so adding a new theme = adding one palette line.
// ---------------------------------------------------------------------------

export type ThemeName =
	| 'light' | 'dark' | 'blue'
	| 'github' | 'sepia' | 'nord' | 'dracula'
	| 'solarized' | 'forest' | 'rose' | 'midnight'
	| 'auto';

interface Palette {
	bg: string;       // page background
	fg: string;       // body text
	muted: string;    // secondary text (quotes, h6, missing images)
	heading: string;  // headings
	link: string;     // links
	border: string;   // rules, table borders, table header
	soft: string;     // code blocks, quotes, striped rows
	accent: string;   // quote bar, highlights, wikilinks
	dark?: boolean;   // tells the browser to use dark scrollbars/controls
	serif?: boolean;  // use a serif body font
}

const PALETTES: Record<Exclude<ThemeName, 'auto'>, Palette> = {
	light:     { bg: '#ffffff', fg: '#333333', muted: '#666666', heading: '#2c3e50', link: '#3498db', border: '#e5e7eb', soft: '#f8f9fa', accent: '#3498db' },
	dark:      { bg: '#121212', fg: '#eeeeee', muted: '#bbbbbb', heading: '#ffffff', link: '#64b5f6', border: '#333333', soft: '#1e1e1e', accent: '#64b5f6', dark: true },
	blue:      { bg: '#ecf0f1', fg: '#2c3e50', muted: '#566573', heading: '#1a5276', link: '#154360', border: '#aed6f1', soft: '#d6eaf8', accent: '#2e86c1' },
	github:    { bg: '#ffffff', fg: '#1f2328', muted: '#59636e', heading: '#1f2328', link: '#0969da', border: '#d1d9e0', soft: '#f6f8fa', accent: '#0969da' },
	sepia:     { bg: '#f4ecd8', fg: '#433422', muted: '#7a6a53', heading: '#5b4636', link: '#9c4a1a', border: '#dccfae', soft: '#eadfc4', accent: '#b5651d', serif: true },
	nord:      { bg: '#2e3440', fg: '#d8dee9', muted: '#9aa5b8', heading: '#eceff4', link: '#88c0d0', border: '#434c5e', soft: '#3b4252', accent: '#88c0d0', dark: true },
	dracula:   { bg: '#282a36', fg: '#f8f8f2', muted: '#a9b0d0', heading: '#bd93f9', link: '#8be9fd', border: '#44475a', soft: '#1e1f29', accent: '#ff79c6', dark: true },
	solarized: { bg: '#fdf6e3', fg: '#586e75', muted: '#7f9296', heading: '#073642', link: '#268bd2', border: '#eee8d5', soft: '#eee8d5', accent: '#2aa198' },
	forest:    { bg: '#f3f7f1', fg: '#26362b', muted: '#5c7062', heading: '#1e5631', link: '#2d7a46', border: '#cfe0d0', soft: '#e3eee2', accent: '#3a9d5d' },
	rose:      { bg: '#fff7f8', fg: '#3d2b30', muted: '#8a6b73', heading: '#9d2449', link: '#c2185b', border: '#f3d5db', soft: '#fdebee', accent: '#e0517a' },
	midnight:  { bg: '#0b1020', fg: '#d6deeb', muted: '#7f8fb0', heading: '#82aaff', link: '#7fdbca', border: '#1d2a4a', soft: '#111a33', accent: '#c792ea', dark: true }
};

export const THEME_LABELS: Record<ThemeName, string> = {
	light: 'Light',
	dark: 'Dark',
	blue: 'Blue',
	github: 'GitHub',
	sepia: 'Sepia (serif)',
	nord: 'Nord',
	dracula: 'Dracula',
	solarized: 'Solarized light',
	forest: 'Forest',
	rose: 'Rose',
	midnight: 'Midnight',
	auto: 'Automatic (follows device)'
};

export const THEME_NAMES = Object.keys(THEME_LABELS) as ThemeName[];

export function isThemeName(value: unknown): value is ThemeName {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEME_LABELS, value);
}

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`;
const SERIF = `Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace`;

function vars(p: Palette, scheme?: string): string {
	return [
		`color-scheme:${scheme ?? (p.dark ? 'dark' : 'light')}`,
		`--bg:${p.bg}`, `--fg:${p.fg}`, `--muted:${p.muted}`, `--heading:${p.heading}`,
		`--link:${p.link}`, `--border:${p.border}`, `--soft:${p.soft}`, `--accent:${p.accent}`,
		`--font:${p.serif ? SERIF : SANS}`, `--mono:${MONO}`
	].join(';');
}

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { font-family: var(--font); font-size: 17px; line-height: 1.7; color: var(--fg); background-color: var(--bg); max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; }
h1, h2, h3, h4, h5, h6 { color: var(--heading); line-height: 1.3; font-weight: 700; margin: 1.8em 0 0.6em; }
h1 { font-size: 2.2em; margin-top: 0.6em; border-bottom: 2px solid var(--border); padding-bottom: 0.3em; }
h2 { font-size: 1.7em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
h3 { font-size: 1.4em; }
h4 { font-size: 1.2em; }
h5 { font-size: 1.05em; }
h6 { font-size: 1em; color: var(--muted); }
p { margin: 0 0 1.1em; }
a { color: var(--link); text-decoration: none; border-bottom: 1px solid transparent; }
a:hover { border-bottom-color: currentColor; }
blockquote { margin: 1.5em 0; padding: 0.6em 1.2em; border-left: 4px solid var(--accent); background-color: var(--soft); color: var(--muted); border-radius: 0 6px 6px 0; }
blockquote > :last-child { margin-bottom: 0; }
code { background-color: var(--soft); padding: 0.15em 0.4em; border-radius: 4px; font-family: var(--mono); font-size: 0.88em; }
pre { background-color: var(--soft); padding: 1em 1.2em; overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); line-height: 1.5; }
pre code { background: none; padding: 0; font-size: 0.9em; }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; }
th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
th { background-color: var(--border); font-weight: 600; }
tbody tr:nth-child(even) { background-color: var(--soft); }
ul, ol { margin: 0 0 1.1em; padding-left: 2em; }
li { margin-bottom: 0.3em; }
li.task { list-style: none; margin-left: -1.4em; }
li.task input { margin-right: 0.5em; }
hr { border: 0; border-top: 1px solid var(--border); margin: 2.2em 0; }
img { display: block; max-width: 100%; height: auto; margin: 1.2em auto; border-radius: 6px; }
mark { background-color: var(--accent); color: var(--bg); padding: 0 0.25em; border-radius: 3px; }
.wikilink { color: var(--accent); }
.missing-embed { color: var(--muted); font-style: italic; border: 1px dashed var(--border); padding: 0.1em 0.5em; border-radius: 4px; }
::selection { background-color: var(--accent); color: var(--bg); }
@media (max-width: 600px) { body { padding: 24px 16px 60px; font-size: 16px; } }
@media print { body { max-width: none; padding: 0; } }
`;

export function getThemeCss(name: ThemeName): string {
	if (name === 'auto') {
		return `:root{${vars(PALETTES.light, 'light dark')}}\n@media (prefers-color-scheme: dark){:root{${vars(PALETTES.dark)}}}\n${BASE_CSS}`;
	}
	return `:root{${vars(PALETTES[name])}}\n${BASE_CSS}`;
}