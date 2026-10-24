import { Notice, Plugin, TFolder, normalizePath } from 'obsidian';
import { ExportSettingTab } from './settings.js';
import {
	DEFAULT_EXPORT_FOLDER,
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
import { checkFolderSync, exportFolderWebsite } from './smart-export.js';

export default class Md2HtmlPlugin extends Plugin {
	settings!: ExportSettings;

	async onload() {
		this.settings = await loadExportSettings(this);

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
			name: 'Smart Export: current folder as website',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking) {
					const folder = file.parent;
					if (folder instanceof TFolder) void exportFolderWebsite(this.app, folder, this.settings);
				}
				return true;
			}
		});

		this.addCommand({
			id: 'check-smart-export-sync',
			name: 'Smart Export: check folder sync status',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (!checking && file.parent instanceof TFolder) void checkFolderSync(this.app, file.parent, this.settings);
				return true;
			}
		});

		this.addCommand({
			id: 'export-using-selected-mode',
			name: 'Export current note/folder using selected mode',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') return false;
				if (!checking) {
					if (this.settings.exportMode === 'smart' && file.parent instanceof TFolder) void exportFolderWebsite(this.app, file.parent, this.settings);
					else void this.convertActiveFile();
				}
				return true;
			}
		});

		this.addSettingTab(new ExportSettingTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		await saveExportSettings(this, this.settings);
	}

	private async convertActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			new Notice('Open a Markdown file first.');
			return;
		}

		try {
			const mdContent = await this.app.vault.read(activeFile);

			// <vault>/exports-md2html (the folder you deploy)
			const exportDir = cleanFolder(this.settings.exportPath) || DEFAULT_EXPORT_FOLDER;
			await ensureFolder(this.app, exportDir);

			// Images -> <vault>/exports-md2html/assets/*.png (or base64, depending on settings)
			const images = await collectImages(this.app, mdContent, activeFile.path, {
				mode: this.settings.imageMode,
				exportDir,
				assetsFolder: cleanAssetsFolder(this.settings.assetsFolder)
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

			new Notice(`Exported: ${exportDir}/${fileName} — open it in a browser (Obsidian hides .html files)`);
		} catch (err) {
			console.error('md2html export failed:', err);
			new Notice('Conversion failed. See console for details.');
		}
	}
}