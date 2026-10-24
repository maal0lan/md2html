import { TFile, normalizePath, type App, type Plugin } from 'obsidian';
import { isThemeName, type ThemeName } from './themes.js';

export type ImageMode = 'files' | 'embed';
export type ExportMode = 'legacy' | 'smart';

export const DEFAULT_EXPORT_FOLDER = 'exports-md2html';
export const DEFAULT_ASSETS_FOLDER = 'assets';

export interface ExportSettings {
	/** Kept for older settings files. Commands now choose single-note vs website export. */
	exportMode: ExportMode;
	exportTheme: ThemeName;
	/** Vault-relative folder that receives the HTML files (the deployable root). */
	exportPath: string;
	/** Sub-folder of exportPath that receives the images. */
	assetsFolder: string;
	/** 'files' = images saved next to the HTML (best for hosting), 'embed' = base64 inside the HTML. */
	imageMode: ImageMode;
}

export const DEFAULT_SETTINGS: ExportSettings = {
	exportMode: 'legacy',
	exportTheme: 'light',
	exportPath: DEFAULT_EXPORT_FOLDER,
	assetsFolder: DEFAULT_ASSETS_FOLDER,
	imageMode: 'files'
};

/** Clean a user-typed vault-relative folder ("./exports/" -> "exports"). Returns '' if unusable. */
export function cleanFolder(input: string): string {
	const trimmed = (input || '').trim().replace(/^\.?\/+/, '');
	if (!trimmed) return '';
	const normalized = normalizePath(trimmed).replace(/^\/+|\/+$/g, '');
	if (!normalized || normalized.split('/').includes('..')) return '';
	return normalized;
}

/** The assets folder is always a single folder name inside the export folder. */
export function cleanAssetsFolder(input: string): string {
	const name = cleanFolder(input).replace(/\//g, '-');
	return name || DEFAULT_ASSETS_FOLDER;
}

/** Create a folder and any missing parents. */
export async function ensureFolder(app: App, path: string): Promise<void> {
	let current = '';
	for (const part of path.split('/').filter(Boolean)) {
		current = current ? `${current}/${part}` : part;
		if (!(await app.vault.adapter.exists(current))) {
			try {
				await app.vault.createFolder(current);
			} catch (err) {
				// Ignore a race only if another operation actually created the folder.
				if (!(await app.vault.adapter.exists(current))) {
					const reason = err instanceof Error ? err.message : String(err);
					throw new Error(`Could not create folder "${current}": ${reason}`);
				}
			}
		}
	}
}

/** Write a text file, creating or updating it. */
export async function writeTextFile(app: App, path: string, content: string): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else if (await app.vault.adapter.exists(path)) {
		await app.vault.adapter.write(path, content);
	} else {
		await app.vault.create(path, content);
	}
}

/** Write binary content only when bytes differ (equal size does not imply equal content). */
export async function writeBinaryFile(app: App, path: string, data: ArrayBuffer): Promise<boolean> {
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		if (existing.stat.size === data.byteLength) {
			try {
				const old = new Uint8Array(await app.vault.readBinary(existing));
				const next = new Uint8Array(data);
				if (old.length === next.length && old.every((byte, index) => byte === next[index])) return false;
			} catch (err) {
				console.warn(`md2html: could not compare existing asset ${path}; rewriting it.`, err);
			}
		}
		await app.vault.modifyBinary(existing, data);
	} else if (await app.vault.adapter.exists(path)) {
		try {
			const old = new Uint8Array(await app.vault.adapter.readBinary(path));
			const next = new Uint8Array(data);
			if (old.length === next.length && old.every((byte, index) => byte === next[index])) return false;
		} catch (err) {
			console.warn(`md2html: could not compare existing asset ${path}; rewriting it.`, err);
		}
		await app.vault.adapter.writeBinary(path, data);
	} else {
		await app.vault.createBinary(path, data);
	}
	return true;
}

/**
 * Load export settings using Obsidian's built-in storage
 */
export async function loadExportSettings(plugin: Plugin): Promise<ExportSettings> {
	const data = (await plugin.loadData()) as Partial<ExportSettings> | null;
	const settings: ExportSettings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };

	if (settings.exportMode !== 'legacy' && settings.exportMode !== 'smart') settings.exportMode = 'legacy';
	if (!isThemeName(settings.exportTheme)) settings.exportTheme = DEFAULT_SETTINGS.exportTheme;
	settings.exportPath = cleanFolder(String(settings.exportPath ?? '')) || DEFAULT_EXPORT_FOLDER;
	if (settings.exportPath === 'exports') settings.exportPath = DEFAULT_EXPORT_FOLDER;
	settings.assetsFolder = cleanAssetsFolder(String(settings.assetsFolder ?? ''));
	if (settings.imageMode !== 'files' && settings.imageMode !== 'embed') settings.imageMode = 'files';
	return settings;
}

/**
 * Save export settings using Obsidian's built-in storage
 */
export async function saveExportSettings(plugin: Plugin, settings: ExportSettings): Promise<void> {
	await plugin.saveData(settings);
}