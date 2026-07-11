import { Notice, Plugin, normalizePath } from 'obsidian';
import { ExportSettingTab } from './settings.js';
import { loadExportSettings, saveExportSettings, ExportSettings } from './utils.js';
import { buildHtmlDocument } from './markdown.js';

export default class Md2HtmlPlugin extends Plugin {
	settings!: ExportSettings;

	async onload() {
		this.settings = await loadExportSettings(this);
		console.debug('Loaded settings:', this.settings);

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

	async updateTheme(theme: 'light' | 'dark' | 'blue') {
		this.settings.exportTheme = theme;
		await saveExportSettings(this, this.settings);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async convertActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			new Notice('Open a Markdown file first.');
			return;
		}

		const mdContent = await this.app.vault.read(activeFile);
		const htmlOutput = buildHtmlDocument(mdContent, this.settings.exportTheme || 'light', activeFile.basename);

		// Work out the destination folder (vault-relative).
		const customFolder = (this.settings.exportPath || '').trim();
		const parentPath = activeFile.parent ? activeFile.parent.path : '';
		const destFolder = customFolder ? customFolder : parentPath;
		const destFolderNormalized = normalizePath(destFolder || '/');

		if (
			destFolderNormalized &&
			destFolderNormalized !== '/' &&
			!(await this.app.vault.adapter.exists(destFolderNormalized))
		) {
			await this.app.vault.createFolder(destFolderNormalized).catch(() => {
				// Folder may already exist due to a race; ignore.
			});
		}

		const outputPath = normalizePath(
			destFolderNormalized && destFolderNormalized !== '/'
				? `${destFolderNormalized}/${activeFile.basename}.html`
				: `${activeFile.basename}.html`
		);

		try {
			const existing = this.app.vault.getAbstractFileByPath(outputPath);
			if (existing) {
				await this.app.vault.adapter.write(outputPath, htmlOutput);
			} else {
				await this.app.vault.create(outputPath, htmlOutput);
			}
			new Notice(`Exported: ${activeFile.basename}.html`);
		} catch (err) {
			console.error('md2html export failed:', err);
			new Notice('Conversion failed. See console for details.');
		}
	}
}
