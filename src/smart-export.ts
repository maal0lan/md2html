import { Notice, TFile, TFolder, normalizePath, type App } from 'obsidian';
import { collectImages } from './images.js';
import { convertMarkdownToHtml } from './markdown.js';
import { cleanAssetsFolder, cleanFolder, ensureFolder, writeTextFile, type ExportSettings } from './utils.js';
import { getThemeCss } from './themes.js';

const MANIFEST = '.md2html-manifest.json';
const WIN_BAD = /[<>:"|?*\u0000-\u001f]/g;

interface ManifestEntry { path: string; mtime: number; size: number; output: string; }
interface Manifest { version: 2; sourceFolder: string; settingsKey: string; files: ManifestEntry[]; generated: string[]; }

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function cleanRelative(path: string): string { return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''); }
function depth(path: string): number { return cleanRelative(path).split('/').filter(Boolean).length; }
function encodeHref(path: string): string {
	if (!path || path === './') return path || './';
	const hash = path.indexOf('#');
	const main = hash === -1 ? path : path.slice(0, hash);
	const frag = hash === -1 ? '' : path.slice(hash);
	return main.split('/').map((seg) => (seg === '..' || seg === '.' ? seg : encodeURIComponent(seg))).join('/') + frag;
}
function relativeHref(fromHtml: string, toHtml: string): string {
	const from = cleanRelative(fromHtml).split('/').slice(0, -1).filter(Boolean);
	const to = cleanRelative(toHtml).split('/').filter(Boolean);
	let i = 0;
	while (i < from.length && i < to.length && from[i] === to[i]) i++;
	const result = [...Array(from.length - i).fill('..'), ...to.slice(i)].join('/');
	return encodeHref(result || './');
}
function safeSegment(seg: string): string {
	const cleaned = seg.replace(WIN_BAD, '-').replace(/\.+$/g, '').trim();
	return cleaned || 'untitled';
}
function safeOutputPath(relPath: string): string {
	return cleanRelative(relPath).split('/').filter(Boolean).map(safeSegment).join('/');
}
function relativeToSource(path: string, sourceRoot: string): string {
	const p = cleanRelative(path);
	const root = cleanRelative(sourceRoot);
	if (!root) return p;
	if (p === root) return '';
	if (p.startsWith(`${root}/`)) return p.slice(root.length + 1);
	return p;
}
function noteOutput(file: TFile, sourceRoot: string): string {
	const rel = relativeToSource(file.path.replace(/\.md$/i, ''), sourceRoot);
	return `${safeOutputPath(rel)}.html`;
}
function shortHash(text: string): string {
	let hash = 5381;
	for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
	return hash.toString(36).slice(0, 7);
}
function stripFrontmatter(md: string): string {
	return md.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
}
function isInside(path: string, parent: string): boolean {
	const p = cleanRelative(path);
	const root = cleanRelative(parent);
	if (!root) return true;
	return p === root || p.startsWith(`${root}/`);
}
function sourceNotes(app: App, sourceRoot: string, exportDir: string): TFile[] {
	return app.vault.getMarkdownFiles()
		.filter((file: TFile) => isInside(file.path, sourceRoot) && !isInside(file.path, exportDir))
		.sort((a: TFile, b: TFile) => a.path.localeCompare(b.path));
}
function foldersForNotes(files: TFile[], sourceRoot: string): string[] {
	const folders = new Set<string>(['']);
	for (const file of files) {
		let current = relativeToSource(file.parent?.path ?? '', sourceRoot);
		while (current) {
			folders.add(current);
			current = parentFolder(current);
		}
	}
	return [...folders].sort((a, b) => a.localeCompare(b));
}
function folderIndex(folder: string): string { return folder ? `${safeOutputPath(folder)}/index.html` : 'index.html'; }
function titleForFolder(folder: string, sourceRoot: string): string {
	if (folder) return folder.split('/').filter(Boolean).pop() || titleForFolder('', sourceRoot);
	return cleanRelative(sourceRoot).split('/').filter(Boolean).pop() || 'Vault';
}
function parentFolder(folder: string): string { const parts = folder.split('/').filter(Boolean); parts.pop(); return parts.join('/'); }
function relativeAssetPrefix(htmlPath: string): string {
	const d = depth(htmlPath) - 1;
	return d > 0 ? '../'.repeat(d) : '';
}
function makeSettingsKey(settings: ExportSettings): string {
	return JSON.stringify({ theme: settings.exportTheme, imageMode: settings.imageMode, assetsFolder: cleanAssetsFolder(settings.assetsFolder) });
}
function pageShell(title: string, body: string, css: string, nav: string, homeHref: string, currentHref: string): string {
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="md2html Smart Export"><title>${escapeHtml(title)}</title><style>
${css}
:root{--site-width:1240px;--rail-width:260px}html{background:var(--bg)}body{max-width:none;padding:0;margin:0}.site{min-height:100vh}.topbar{position:sticky;top:0;z-index:10;backdrop-filter:blur(16px);background:color-mix(in srgb,var(--bg) 90%,transparent);border-bottom:1px solid var(--border)}.topinner{max-width:var(--site-width);margin:auto;padding:12px 22px;display:flex;align-items:center;gap:12px}.brand{font-weight:800;color:var(--heading);border:0;white-space:nowrap}.toolbtn{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--soft);color:var(--fg);cursor:pointer;font:inherit;font-size:13px}.toolbtn:hover{border-color:var(--accent)}.search{width:min(340px,38vw);margin-left:auto;background:var(--soft);border:1px solid var(--border);border-radius:12px;padding:10px 12px;color:var(--fg);font:inherit;font-size:14px}.layout{max-width:var(--site-width);margin:auto;padding:28px 22px;display:grid;grid-template-columns:minmax(0,1fr);gap:0}.sidebar{position:fixed;z-index:40;left:14px;top:72px;bottom:18px;width:min(280px,82vw);box-sizing:border-box;padding:16px 14px 18px;background:color-mix(in srgb,var(--bg) 94%,var(--soft));border:1px solid var(--border);border-radius:22px;box-shadow:0 18px 48px color-mix(in srgb,var(--fg) 14%,transparent);overflow:auto;min-width:0;transform:translateX(calc(-100% - 36px));visibility:hidden;opacity:0;transition:transform .22s ease,opacity .18s ease,visibility .22s}.sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}.nav-close{flex:0 0 auto;width:32px;height:32px;border:1px solid var(--border);border-radius:10px;background:var(--soft);color:var(--fg);cursor:pointer;font:inherit;line-height:1}.nav-close:hover{border-color:var(--accent);color:var(--accent)}.nav-peek{position:fixed;z-index:39;left:0;top:46%;padding:16px 9px;border:1px solid var(--border);border-left:0;border-radius:0 14px 14px 0;background:var(--soft);color:var(--fg);cursor:pointer;writing-mode:vertical-rl;letter-spacing:.08em;font:inherit;font-size:11px;font-weight:700;box-shadow:0 6px 20px color-mix(in srgb,var(--fg) 10%,transparent)}.nav-peek:hover{border-color:var(--accent);color:var(--accent)}body.nav-open .sidebar{transform:translateX(0);visibility:visible;opacity:1}body.nav-open .nav-peek{opacity:0;pointer-events:none}.side-label{font-size:11px;letter-spacing:.14em;color:var(--muted);font-weight:800;margin:0}.navgroup{margin:12px 0 5px;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.navlink{display:block;padding:7px 9px;margin:2px 0;border:0;border-radius:9px;color:var(--muted);font-size:13px;overflow-wrap:anywhere}.navlink:hover,.navlink.active{background:var(--soft);color:var(--accent)}.content{min-width:0;animation:rise .24s ease both}.eyebrow{font-size:11px;letter-spacing:.15em;color:var(--accent);font-weight:800;text-transform:uppercase}.hero{padding:18px 0 24px}.hero h1{font-size:clamp(2.1rem,5vw,3.8rem);letter-spacing:-.045em;line-height:1.04;border:0;margin:.25em 0 .3em}.hero p{color:var(--muted);font-size:1.06rem;max-width:650px}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:13px;margin:18px 0}.page-card{display:block;border:1px solid var(--border);border-radius:15px;padding:18px;color:var(--fg);background:var(--bg);transition:transform .18s,border-color .18s,box-shadow .18s}.page-card:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:0 10px 28px color-mix(in srgb,var(--fg) 8%,transparent)}.page-card h2{font-size:1.02rem;margin:0 0 7px;border:0}.page-card p{font-size:13px;color:var(--muted);margin:0}.crumbs{font-size:13px;color:var(--muted);margin:0 0 22px}.crumbs a{border:0}.article{max-width:820px}.article h1:first-child{margin-top:0}.footer{max-width:var(--site-width);margin:28px auto;padding:18px 22px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}.empty{padding:22px;border:1px dashed var(--border);border-radius:14px;color:var(--muted)}html.invert{filter:invert(1) hue-rotate(180deg)}html.invert img,html.invert video,html.invert canvas{filter:invert(1) hue-rotate(180deg)}body.focus-mode .topbar{position:relative}body.focus-mode .topbar .brand,body.focus-mode #site-search{display:none}body.focus-mode .layout{max-width:900px;grid-template-columns:minmax(0,1fr);padding-top:34px}body.focus-mode .sidebar,body.focus-mode .nav-peek{display:none}body.focus-mode .article{max-width:760px;margin:auto}body.focus-mode .footer{max-width:900px}@keyframes rise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}@media(max-width:760px){.layout{grid-template-columns:minmax(0,1fr);gap:0;padding:20px 16px}.sidebar{left:10px;top:64px;bottom:12px;width:min(280px,88vw);padding:14px 12px;border-radius:20px}.navlink{display:block;max-width:100%}.topinner{padding:10px 12px;gap:7px}.brand{font-size:13px}.toolbtn{padding:8px;font-size:12px}.search{width:30vw;padding:9px}.hero{padding-top:8px}body.focus-mode .layout{padding:20px 16px}}
</style></head><body><div class="site"><header class="topbar"><div class="topinner"><a class="brand" href="${homeHref}">✳ md2html</a><input class="search" id="site-search" type="search" placeholder="Search notes…" aria-label="Search notes"><button class="toolbtn" id="invert-toggle" type="button" aria-pressed="false" title="Invert page colours">Invert</button><button class="toolbtn" id="focus-toggle" type="button" aria-pressed="false">Focus mode</button></div></header><button class="nav-peek" id="nav-peek" type="button" aria-controls="site-nav" aria-expanded="false" title="Hover or click to show pages">Pages</button><div class="layout"><aside class="sidebar" id="site-nav" aria-label="Folder navigation"><div class="sidebar-head"><p class="side-label">FOLDER NAVIGATION</p><button class="nav-close" id="nav-close" type="button" aria-label="Close navigation">✕</button></div><a class="navlink ${currentHref === 'index.html' ? 'active' : ''}" href="${homeHref}">⌂ &nbsp; Folder overview</a>${nav}</aside><main class="content">${body}</main></div><footer class="footer">Generated with md2html · Open this HTML in a browser (Obsidian hides .html files).</footer></div>
<script>(()=>{const root=document.documentElement;const body=document.body;const peek=document.getElementById('nav-peek');const panel=document.getElementById('site-nav');const closeBtn=document.getElementById('nav-close');const invertBtn=document.getElementById('invert-toggle');const focusBtn=document.getElementById('focus-toggle');const search=document.getElementById('site-search');let pinned=false;let closeTimer=0;const setOpen=(open)=>{body.classList.toggle('nav-open',open);peek.setAttribute('aria-expanded',String(open));};const cancelClose=()=>{if(closeTimer)window.clearTimeout(closeTimer);closeTimer=0};const scheduleClose=()=>{cancelClose();if(!pinned)closeTimer=window.setTimeout(()=>setOpen(false),260)};const unpin=()=>{pinned=false;setOpen(false);try{localStorage.setItem('md2html-nav-pinned','0')}catch{}};try{pinned=localStorage.getItem('md2html-nav-pinned')==='1'}catch{}if(pinned)setOpen(true);peek.addEventListener('click',()=>{cancelClose();pinned=!pinned;setOpen(pinned);try{localStorage.setItem('md2html-nav-pinned',pinned?'1':'0')}catch{}});closeBtn.addEventListener('click',()=>{cancelClose();unpin();peek.focus()});peek.addEventListener('pointerenter',()=>{cancelClose();if(!body.classList.contains('focus-mode'))setOpen(true)});peek.addEventListener('pointerleave',scheduleClose);panel.addEventListener('pointerenter',cancelClose);panel.addEventListener('pointerleave',scheduleClose);peek.addEventListener('focus',()=>setOpen(true));panel.addEventListener('focusin',cancelClose);panel.addEventListener('focusout',e=>{if(!panel.contains(e.relatedTarget))scheduleClose()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){unpin();peek.focus()}});const setInvert=(on)=>{root.classList.toggle('invert',on);invertBtn.setAttribute('aria-pressed',String(on));invertBtn.textContent=on?'Original':'Invert';try{localStorage.setItem('md2html-invert',on?'1':'0')}catch{}};try{if(localStorage.getItem('md2html-invert')==='1')setInvert(true)}catch{}invertBtn.addEventListener('click',()=>setInvert(!root.classList.contains('invert')));focusBtn.addEventListener('click',()=>{body.classList.toggle('focus-mode');const on=body.classList.contains('focus-mode');focusBtn.setAttribute('aria-pressed',String(on));focusBtn.textContent=on?'Exit focus':'Focus mode';if(on)unpin()});search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();document.querySelectorAll('.navlink[data-search]').forEach(a=>{a.hidden=!!q&&!a.dataset.search.includes(q)})});search.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=search.value.trim().toLowerCase();const links=[...document.querySelectorAll('.navlink[data-search]')];const match=links.find(a=>a.dataset.search.includes(q));if(match&&q)location.href=match.href;else if(q)location.href='${homeHref}?q='+encodeURIComponent(q)}});const params=new URLSearchParams(location.search);if(params.has('q')&&search){search.value=params.get('q')||'';search.dispatchEvent(new Event('input'))}})();</script></body></html>`;
}
function makeNav(files: TFile[], outputs: Map<string, string>, currentHtml: string, sourceRoot: string): string {
	let lastFolder = '\u0000';
	const links: string[] = [];
	for (const file of files) {
		const folder = relativeToSource(file.parent?.path ?? '', sourceRoot);
		if (folder !== lastFolder && folder) links.push(`<p class="navgroup">${escapeHtml(folder)}</p>`);
		lastFolder = folder;
		const output = outputs.get(file.path);
		if (!output) continue;
		const href = relativeHref(currentHtml, output);
		links.push(`<a class="navlink ${output === currentHtml ? 'active' : ''}" data-search="${escapeHtml((file.basename + ' ' + file.path).toLowerCase())}" href="${escapeHtml(href)}">${escapeHtml(file.basename)}</a>`);
	}
	return links.join('');
}

/** Export the selected folder (and its subfolders) as one static website. */
export async function exportFolderWebsite(app: App, folder: TFolder, settings: ExportSettings): Promise<void> {
	try {
		await exportFolderWebsiteInner(app, folder, settings);
	} catch (err) {
		console.error('md2html Smart Export failed:', err);
		new Notice('Smart Export failed. See the developer console for details.');
	}
}

async function exportFolderWebsiteInner(app: App, folder: TFolder, settings: ExportSettings): Promise<void> {
	const exportDir = cleanFolder(settings.exportPath) || 'exports-md2html';
	const sourceRoot = folder.path === '/' ? '' : folder.path;
	if (cleanRelative(sourceRoot) && isInside(sourceRoot, exportDir)) {
		new Notice('The export folder cannot be used as a source folder. Choose a vault folder outside the export folder.');
		return;
	}
	const files = sourceNotes(app, sourceRoot, exportDir);
	if (!files.length) {
		new Notice(`No Markdown notes in "${titleForFolder('', sourceRoot)}" or its subfolders.`);
		return;
	}
	new Notice(`Smart Export started: ${files.length} notes from "${titleForFolder('', sourceRoot)}"...`);
	await ensureFolder(app, exportDir);
	const folders = foldersForNotes(files, sourceRoot);
	const reserved = new Set(folders.map((path) => folderIndex(path).toLowerCase()));
	const outputs = new Map<string, string>();
	const used = new Set<string>(reserved);
	for (const file of files) {
		let output = noteOutput(file, sourceRoot);
		if (used.has(output.toLowerCase())) output = output.replace(/\.html$/i, `--${shortHash(file.path)}.html`);
		while (used.has(output.toLowerCase())) output = output.replace(/\.html$/i, `-${shortHash(output + file.path)}.html`);
		used.add(output.toLowerCase());
		outputs.set(file.path, output);
	}
	const css = getThemeCss(settings.exportTheme);
	const settingsKey = makeSettingsKey(settings);
	const manifestPath = normalizePath(`${exportDir}/${MANIFEST}`);
	let previous: Manifest | null = null;
	try {
		if (await app.vault.adapter.exists(manifestPath)) previous = JSON.parse(await app.vault.adapter.read(manifestPath)) as Manifest;
	} catch (err) { console.warn('md2html: previous manifest could not be read; rebuilding generated pages.', err); }
	const oldGenerated = new Set(previous?.generated ?? []);
	const generated = new Set<string>([MANIFEST]);
	const entries: ManifestEntry[] = [];
	const folderFiles = new Map<string, TFile[]>();
	for (const file of files) {
		const parent = relativeToSource(file.parent?.path ?? '', sourceRoot);
		if (!folderFiles.has(parent)) folderFiles.set(parent, []);
		folderFiles.get(parent)!.push(file);
	}
	const childFolders = new Map<string, string[]>();
	for (const path of folders) {
		if (!path) continue;
		const parent = parentFolder(path);
		if (!childFolders.has(parent)) childFolders.set(parent, []);
		childFolders.get(parent)!.push(path);
	}

	for (const file of files) {
		const output = outputs.get(file.path)!;
		const outputPath = normalizePath(`${exportDir}/${output}`);
		const md = await app.vault.read(file);
		const images = await collectImages(app, md, file.path, {
			mode: settings.imageMode,
			exportDir,
			assetsFolder: cleanAssetsFolder(settings.assetsFolder),
			assetPrefix: relativeAssetPrefix(output)
		});
		const body = convertMarkdownToHtml(stripFrontmatter(md), {
			images,
			resolveWikilink: (target: string) => {
				const dest = app.metadataCache.getFirstLinkpathDest(target, file.path);
				if (!dest) return undefined;
				const destOut = outputs.get(dest.path);
				if (!destOut) return undefined;
				return relativeHref(output, destOut);
			}
		});
		const parent = relativeToSource(file.parent?.path ?? '', sourceRoot);
		const crumbs = parent ? parent.split('/').map((part, i, arr) => {
			const crumbFolder = arr.slice(0, i + 1).join('/');
			return `<a href="${escapeHtml(relativeHref(output, folderIndex(crumbFolder)))}">${escapeHtml(part)}</a>`;
		}).join(' / ') : '';
		const homeHref = relativeHref(output, 'index.html');
		const wrapped = `<div class="crumbs"><a href="${escapeHtml(homeHref)}">Overview</a>${crumbs ? ` / ${crumbs}` : ''} / ${escapeHtml(file.basename)}</div><article class="article">${body}</article>`;
		const html = pageShell(file.basename, wrapped, css, makeNav(files, outputs, output, sourceRoot), homeHref, output);
		await writeIfChanged(app, outputPath, html);
		generated.add(outputPath.slice(exportDir.length + 1));
		entries.push({ path: file.path, mtime: file.stat.mtime, size: file.stat.size, output });
	}

	for (const sourceFolder of folders) {
		const output = folderIndex(sourceFolder);
		const directFiles = folderFiles.get(sourceFolder) ?? [];
		const directChildren = childFolders.get(sourceFolder) ?? [];
		const cards: string[] = [];
		for (const child of directChildren) {
			const childIndex = folderIndex(child);
			cards.push(`<a class="page-card" href="${escapeHtml(relativeHref(output, childIndex))}" data-search="${escapeHtml((titleForFolder(child, sourceRoot) + ' ' + child).toLowerCase())}"><h2>📁 ${escapeHtml(titleForFolder(child, sourceRoot))} ↗</h2><p>${escapeHtml(child)}</p></a>`);
		}
		for (const file of directFiles) {
			const target = outputs.get(file.path)!;
			cards.push(`<a class="page-card" href="${escapeHtml(relativeHref(output, target))}" data-search="${escapeHtml((file.basename + ' ' + file.path).toLowerCase())}"><h2>${escapeHtml(file.basename)} ↗</h2><p>${escapeHtml(relativeToSource(file.path, sourceRoot))}</p></a>`);
		}
		const title = titleForFolder(sourceFolder, sourceRoot);
		const body = `<section class="hero"><p class="eyebrow">EXPORTED FOLDER · ${sourceFolder ? escapeHtml(sourceFolder) : escapeHtml(cleanRelative(sourceRoot) || 'ROOT')}</p><h1>${escapeHtml(title)}</h1><p>A small site of notes from this folder.</p></section><p class="eyebrow">${directFiles.length} NOTES · ${directChildren.length} SUBFOLDERS</p>${cards.length ? `<div class="cards">${cards.join('')}</div>` : '<div class="empty">No notes or subfolders here yet.</div>'}`;
		const html = pageShell(title, body, css, makeNav(files, outputs, output, sourceRoot), relativeHref(output, 'index.html'), output);
		await writeIfChanged(app, normalizePath(`${exportDir}/${output}`), html);
		generated.add(output);
	}

	for (const oldPath of oldGenerated) {
		if (generated.has(oldPath) || oldPath === MANIFEST || !oldPath.toLowerCase().endsWith('.html')) continue;
		const path = normalizePath(`${exportDir}/${oldPath}`);
		if (await app.vault.adapter.exists(path)) {
			try { await app.vault.adapter.remove(path); } catch (err) { console.warn(`md2html: could not remove stale generated page ${path}`, err); }
		}
	}
	const manifest: Manifest = { version: 2, sourceFolder: sourceRoot, settingsKey, files: entries, generated: [...generated].filter((path) => path !== MANIFEST).sort() };
	await writeIfChanged(app, manifestPath, JSON.stringify(manifest, null, 2));
	const changedSettings = previous?.settingsKey !== settingsKey;
	new Notice(`Smart Export complete: ${files.length} notes → ${exportDir}/index.html (open in a browser)${changedSettings ? ' · theme/assets refreshed' : ''}`);
}

async function writeIfChanged(app: App, path: string, content: string): Promise<void> {
	const slash = path.lastIndexOf('/');
	if (slash > 0) await ensureFolder(app, path.slice(0, slash));
	if (await app.vault.adapter.exists(path)) {
		try { if (await app.vault.adapter.read(path) === content) return; } catch { /* overwrite unreadable generated file */ }
	}
	await writeTextFile(app, path, content);
}

export async function checkFolderSync(app: App, folder: TFolder, settings: ExportSettings): Promise<void> {
	const exportDir = cleanFolder(settings.exportPath) || 'exports-md2html';
	const sourceRoot = folder.path === '/' ? '' : folder.path;
	const manifestPath = normalizePath(`${exportDir}/${MANIFEST}`);
	if (!(await app.vault.adapter.exists(manifestPath))) { new Notice('No Smart Export manifest found. Run Smart Export first.'); return; }
	try {
		const manifest = JSON.parse(await app.vault.adapter.read(manifestPath)) as Manifest;
		const current = sourceNotes(app, sourceRoot, exportDir);
		if ((manifest.sourceFolder ?? '') !== sourceRoot) {
			new Notice(`Manifest is for "${manifest.sourceFolder || 'vault root'}", but this command is looking at "${sourceRoot || 'vault root'}". Run Smart Export on this folder.`);
			return;
		}
		const old = new Map((manifest.files ?? []).map((item) => [item.path, item]));
		const changed = current.filter((file) => { const entry = old.get(file.path); return !entry || entry.mtime !== file.stat.mtime || entry.size !== file.stat.size; });
		const removed = (manifest.files ?? []).filter((entry) => !current.some((file) => file.path === entry.path));
		const settingsChanged = manifest.settingsKey !== makeSettingsKey(settings);
		if (!changed.length && !removed.length && !settingsChanged) new Notice(`Website is in sync ✓ (${current.length} notes)`);
		else new Notice(`Website needs sync: ${changed.length} new/changed, ${removed.length} removed${settingsChanged ? ', theme/image settings changed' : ''}. Run Smart Export to refresh.`);
	} catch (err) { console.error('md2html sync check failed', err); new Notice('Could not read the export manifest. Re-export the folder website.'); }
}
