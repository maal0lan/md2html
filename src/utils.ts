import { Plugin } from 'obsidian';

export interface ExportSettings {
  exportTheme: 'light' | 'dark' | 'blue';
  exportPath: string;
}

const DEFAULT_SETTINGS: ExportSettings = {
  exportTheme: 'light',
  exportPath: ''
};

/**
 * Load export settings using Obsidian's built-in storage
 */
export async function loadExportSettings(plugin: Plugin): Promise<ExportSettings> {
  const data = (await plugin.loadData()) as Partial<ExportSettings> | null;
  return {
    ...DEFAULT_SETTINGS,
    ...(data ?? {})
  };
}

/**
 * Save export settings using Obsidian's built-in storage
 */
export async function saveExportSettings(
  plugin: Plugin,
  settings: ExportSettings
): Promise<void> {
  await plugin.saveData(settings);
}
