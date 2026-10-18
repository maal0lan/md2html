import { Notice, Plugin, normalizePath } from 'obsidian';
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

export default class Md2HtmlPlugin extends Plugin {
	settings!: ExportSettings;

	async onload() {
		this.settings = await loadExportSettings(this);

		this.addCommand({
			id: 'convert-md-to-html',
			name: 'Convert current Markdown to HTML',
			checkCallback: (checking) => {
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

			// <vault>/exports  (the folder you deploy)
			const exportDir = cleanFolder(this.settings.exportPath) || DEFAULT_EXPORT_FOLDER;
			await ensureFolder(this.app, exportDir);

			// Images -> <vault>/exports/assets/*.png (or base64, depending on settings)
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

			new Notice(`Exported: ${exportDir}/${fileName}`);
		} catch (err) {
			console.error('md2html export failed:', err);
			new Notice('Conversion failed. See console for details.');
		}
	}
}