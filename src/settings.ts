import { App, PluginSettingTab, Setting } from 'obsidian';
import type Md2HtmlPlugin from './main.js';
import { THEME_LABELS, THEME_NAMES, isThemeName } from './themes.js';
import { DEFAULT_ASSETS_FOLDER, DEFAULT_EXPORT_FOLDER, cleanAssetsFolder, cleanFolder } from './utils.js';

export class ExportSettingTab extends PluginSettingTab {
	plugin: Md2HtmlPlugin;

	constructor(app: App, plugin: Md2HtmlPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Export theme')
			.setDesc('Choose the look of the exported HTML file')
			.addDropdown((dropdown) => {
				for (const name of THEME_NAMES) {
					dropdown.addOption(name, THEME_LABELS[name]);
				}
				dropdown
					.setValue(this.plugin.settings.exportTheme)
					.onChange(async (value) => {
						if (!isThemeName(value)) return;
						this.plugin.settings.exportTheme = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Export folder')
			.setDesc(`Vault-relative folder that receives the HTML files. This folder is the one you deploy (default: ${DEFAULT_EXPORT_FOLDER}).`)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_EXPORT_FOLDER)
					.setValue(this.plugin.settings.exportPath)
					.onChange(async (value) => {
						this.plugin.settings.exportPath = cleanFolder(value) || DEFAULT_EXPORT_FOLDER;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Images')
			.setDesc('Save images as separate files (smaller pages, best for hosting) or embed them inside the HTML (one single file).')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('files', 'Save as separate files')
					.addOption('embed', 'Embed inside the HTML')
					.setValue(this.plugin.settings.imageMode)
					.onChange(async (value) => {
						this.plugin.settings.imageMode = value === 'embed' ? 'embed' : 'files';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Image folder name')
			.setDesc(`Folder inside the export folder that holds the images (default: ${DEFAULT_ASSETS_FOLDER}).`)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_ASSETS_FOLDER)
					.setValue(this.plugin.settings.assetsFolder)
					.onChange(async (value) => {
						this.plugin.settings.assetsFolder = cleanAssetsFolder(value);
						await this.plugin.saveSettings();
					})
			);
	}
}