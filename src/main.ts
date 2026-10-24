import { Notice, Plugin, TFolder, normalizePath } from 'obsidian';
import { ExportSettingTab } from './settings.js';
import {
	DEFAULT_EXPORT_FOLDER,
	DEFAULT_SETTINGS,
	cleanAssetsFolder,
	cleanFolder,
	ensureFolder,
	loadExportSettings,
	saveExportSettings,
	writeTextFile,
	type ExportSettings
} from './utils.js';
import { buildHtmlDocument } from './markdown.js';
import { collectImages } from './images.js';
import { exportFolderWebsite } from './smart-export.js';

export default class Md2HtmlPlugin extends Plugin {
	settings!: ExportSettings;

	async onload() {
		try {
			this.settings = await loadExportSettings(this);
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			console.error(`[md2html] Could not load settings; using defaults: ${reason}`, err);
			this.settings = { ...DEFAULT_SETTINGS };
			new Notice(`md2html could not load saved settings; defaults are active. ${reason}`);
		}

		this.addCommand({
			id: 'convert-md-to-html',
			name: 'Convert current Markdown to HTML',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') {
					return false;
				}

				if (!checking) {
					void this.convertActiveFile();
				}

				return true;
			}
		});

		this.addCommand({
			id: 'export-current-folder-smart',
			name: 'Export current folder as website',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				const folder = file?.parent;
				if (!(folder instanceof TFolder)) return false;
				if (!checking) void exportFolderWebsite(this.app, folder, this.settings);
				return true;
			}
		});

		this.addCommand({
			id: 'export-all-folders-as-website',
			name: 'Export all folders as website',
			callback: () => {
				const root = this.app.vault.getRoot();
				if (root instanceof TFolder) void exportFolderWebsite(this.app, root, this.settings);
				else new Notice('Could not find the vault root folder.');
			}
		});

		this.addSettingTab(new ExportSettingTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		try {
			await saveExportSettings(this, this.settings);
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			console.error(`[md2html] Could not save settings: ${reason}`, err);
			new Notice(`md2html could not save settings: ${reason}`);
		}
	}

	private async convertActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			new Notice('Open a Markdown file first.');
			return;
		}

		const startedAt = Date.now();
		const imageIssues: string[] = [];
		const notice = new Notice(`md2html: exporting ${activeFile.path}…`);
		console.info(`[md2html] Legacy export started: ${activeFile.path}`);
		try {
			const mdContent = await this.app.vault.read(activeFile);

			// <vault>/exports-md2html (the folder you deploy)
			const exportDir = cleanFolder(this.settings.exportPath) || DEFAULT_EXPORT_FOLDER;
			await ensureFolder(this.app, exportDir);

			// Images -> <vault>/exports-md2html/assets/*.png (or base64, depending on settings)
			const images = await collectImages(this.app, mdContent, activeFile.path, {
				mode: this.settings.imageMode,
				exportDir,
				assetsFolder: cleanAssetsFolder(this.settings.assetsFolder),
				onIssue: (reference, reason) => {
					imageIssues.push(`${reference} (${reason})`);
					console.warn(`[md2html] Legacy image issue in ${activeFile.path}: ${reference} — ${reason}`);
				}
			});

			const htmlOutput = buildHtmlDocument(
				mdContent,
				this.settings.exportTheme,
				activeFile.basename,
				{ images }
			);

			// Spaces in file names make ugly URLs, so use dashes.
			const fileName = `${activeFile.basename.replace(/\s+/g, '-')}.html`;
			await writeTextFile(this.app, normalizePath(`${exportDir}/${fileName}`), htmlOutput);

			const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
			console.info('[md2html] Legacy export complete', { source: activeFile.path, output: `${exportDir}/${fileName}`, imageIssues, elapsedSeconds: elapsed });
			notice.setMessage(`Exported ${activeFile.basename} → ${exportDir}/${fileName} · ${imageIssues.length} image issues · ${elapsed}s${imageIssues.length ? ' · see console' : ''}`);
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			console.error(`[md2html] Legacy export failed for ${activeFile.path}: ${reason}`, err);
			notice.setMessage(`Conversion failed for ${activeFile.path}: ${reason}`);
		}
	}
}