import { Notice, Plugin } from 'obsidian';
import { ExportSettingTab } from './settings.js';
import { loadExportSettings, saveExportSettings, ExportSettings } from './utils.js';

interface NodePath {
	join(...paths: string[]): string;
	isAbsolute(path: string): boolean;
	dirname(path: string): string;
}

type ExecFileCallback = (error: Error | null, stdout: string, stderr: string) => void;

interface ChildProcessModule {
	execFile(command: string, args: string[], options: { windowsHide: boolean }, callback: ExecFileCallback): void;
	execSync(command: string, options: { encoding: string }): string;
}

interface FsModule {
	existsSync(path: string): boolean;
	mkdirSync(path: string, options: { recursive: boolean }): void;
}

interface WindowWithRequire extends Window {
	require(module: 'path'): NodePath;
	require(module: 'child_process'): ChildProcessModule;
	require(module: 'fs'): FsModule;
	require(module: 'process'): { platform: string };
}

const windowWithRequire = window as unknown as WindowWithRequire;
const path = windowWithRequire.require('path');
const { execFile, execSync } = windowWithRequire.require('child_process');

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

	// 🔥 FIXED Python finder
	private findPython(): string {
		const commands = ['python', 'python3', 'py'];
		const processModule = windowWithRequire.require('process');

		for (const cmd of commands) {
			try {
				const result = processModule.platform === 'win32'
					? execSync(`where ${cmd}`, { encoding: 'utf8' })
					: execSync(`which ${cmd}`, { encoding: 'utf8' });

				if (!result) {
					continue;
				}

				const pythonPath = result
					.split(/\r?\n/)[0]
					.trim()
					.replace(/\r/g, '');

				if (pythonPath) {
					console.debug('Found Python:', pythonPath);
					return pythonPath;
				}
			} catch {
				// ignore missing Python executable
			}
		}

		return '';
	}

	private async convertActiveFile() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			new Notice('Open a Markdown file first.');
			return;
		}

		const settings = await loadExportSettings(this);

		const basePath = (this.app.vault.adapter as unknown as { getBasePath: () => string }).getBasePath();
		const inputPath = path.join(basePath, activeFile.path);

		let outputPath: string;
		const custom = settings.exportPath.trim();

		if (!custom) {
			outputPath = path.join(
				basePath,
				activeFile.parent?.path || '',
				activeFile.basename + '.html'
			);
		} else if (path.isAbsolute(custom)) {
			outputPath = path.join(custom, activeFile.basename + '.html');
		} else {
			outputPath = path.join(basePath, custom, activeFile.basename + '.html');
		}

		const configDir = (this.app.vault as { configDir?: string }).configDir ?? '.obsidian';
		const scriptPath = path.join(
			basePath,
			configDir,
			'plugins',
			this.manifest.id,
			'md2html.py'
		);

		const fs = windowWithRequire.require('fs');

		console.debug('SCRIPT:', scriptPath);
		console.debug('INPUT:', inputPath);
		console.debug('OUTPUT:', outputPath);
		
		if (!fs.existsSync(scriptPath)) {
			new Notice('Md2html.py not found');
			return;
		}

		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const pythonPath = this.findPython();
		if (!pythonPath) {
			new Notice('Python not found');
			new Notice('Please install Python');
			return;
		}

		execFile(
			pythonPath,
			[
				scriptPath,
				inputPath,
				'-o',
				outputPath,
				'-t',
				this.settings.exportTheme || 'light'
			],
			{ windowsHide: true },
			(error: Error | null, stdout: string, stderr: string) => {
				if (error) {
					console.error('EXEC ERROR:', error);
					console.debug('STDOUT:', stdout);
					console.debug('STDERR:', stderr);
					new Notice('Conversion failed pip install markdown2');
					return;
				}

				new Notice(`Exported: ${activeFile.basename}.html`);
			}
		);
	}
}

