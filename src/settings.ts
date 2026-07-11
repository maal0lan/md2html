import { App, PluginSettingTab, Setting } from 'obsidian';
import Md2HtmlPlugin from './main.js';

export interface Md2HtmlPluginSettings {
  exportTheme: 'light' | 'dark' | 'blue';
  exportPath: string;
}

export const DEFAULT_SETTINGS: Md2HtmlPluginSettings = {
  exportTheme: 'light',
  exportPath: ''
};

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
      .setDesc('Choose the CSS theme for the exported HTML')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('light', 'Light')
          .addOption('dark', 'Dark')
          .addOption('blue', 'Blue')
          .setValue(this.plugin.settings.exportTheme)
          .onChange(async (value) => {
            this.plugin.settings.exportTheme = value as 'light' | 'dark' | 'blue';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Export folder')
      .setDesc('Vault-relative folder where the HTML file will be saved (empty = same folder as source)')
      .addText((text) =>
        text
          .setPlaceholder('Leave empty or type a vault-relative folder path')
          .setValue(this.plugin.settings.exportPath)
          .onChange(async (value) => {
            this.plugin.settings.exportPath = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
