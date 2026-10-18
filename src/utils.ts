import { TFile, normalizePath, type App, type Plugin } from 'obsidian';
import { isThemeName, type ThemeName } from './themes.js';

export type ImageMode = 'files' | 'embed';

export const DEFAULT_EXPORT_FOLDER = 'exports';
export const DEFAULT_ASSETS_FOLDER = 'assets';

export interface ExportSettings {
	exportTheme: ThemeName;
	/** Vault-relative folder that receives the HTML files (the deployable root). */
	exportPath: string;
	/** Sub-folder of exportPath that receives the images. */
	assetsFolder: string;
	/** 'files' = images saved next to the HTML (best for hosting), 'embed' = base64 inside the HTML. */
	imageMode: ImageMode;
}

export const DEFAULT_SETTINGS: ExportSettings = {
	exportTheme: 'light',
	exportPath: DEFAULT_EXPORT_FOLDER,
	assetsFolder: DEFAULT_ASSETS_FOLDER,
	imageMode: 'files'
};

/** Clean a user-typed vault-relative folder ("./exports/" -> "exports"). Returns '' if unusable. */
export function cleanFolder(input: string): string {
	const trimmed = (input || '').trim().replace(/^\.?\/+/, '');
	if (!trimmed || trimmed.split('/').includes('..')) return '';
	return normalizePath(trimmed).replace(/^\/+|\/+$/g, '');
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
			await app.vault.createFolder(current).catch(() => {
				// Folder may already exist due to a race; ignore.
			});
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

/** Write a binary file; skips the write when an identically-sized file is already there. */
export async function writeBinaryFile(app: App, path: string, data: ArrayBuffer): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		if (existing.stat.size !== data.byteLength) await app.vault.modifyBinary(existing, data);
	} else if (await app.vault.adapter.exists(path)) {
		await app.vault.adapter.writeBinary(path, data);
	} else {
		await app.vault.createBinary(path, data);
	}
}

/**
 * Load export settings using Obsidian's built-in storage
 */
export async function loadExportSettings(plugin: Plugin): Promise<ExportSettings> {
	const data = (await plugin.loadData()) as Partial<ExportSettings> | null;
	const settings: ExportSettings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };

	if (!isThemeName(settings.exportTheme)) settings.exportTheme = DEFAULT_SETTINGS.exportTheme;
	settings.exportPath = cleanFolder(String(settings.exportPath ?? '')) || DEFAULT_EXPORT_FOLDER;
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