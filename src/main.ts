import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { SampleSettingTab } from "./settings.js";
import { loadExportSettings, saveExportSettings, ExportSettings } from "./utils.js";

const path = (window as any).require('path');
const { execFile, execSync } = (window as any).require('child_process');

export default class MyPlugin extends Plugin {
	settings!: ExportSettings;

	async onload() {
		this.settings = await loadExportSettings(this);
		console.log('Loaded settings:', this.settings);

		this.addCommand({
	id: "convert-md-to-html",
	name: "Convert current Markdown to HTML",
	checkCallback: (checking) => {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") return false;

		if (!checking) {
			this.convertActiveFile();
		}
		return true;
	}
});

		this.addSettingTab(new SampleSettingTab(this.app, this));
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
		const process = (window as any).require('process');

		for (const cmd of commands) {
			try {
				const result = process.platform === 'win32'
					? execSync(`where ${cmd}`, { encoding: 'utf8' })
					: execSync(`which ${cmd}`, { encoding: 'utf8' });

				const pythonPath = result
					.split(/\r?\n/)[0]
					.trim()
					.replace(/\r/g, '');

				if (pythonPath) {
					console.log('Found Python:', pythonPath);
					return pythonPath;
				}
			} catch {}
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

		const basePath = (this.app.vault.adapter as any).getBasePath();
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

		const scriptPath = path.join(
			basePath,
			'.obsidian',
			'plugins',
			this.manifest.id,
			'md2html.py'
		);

		const fs = (window as any).require('fs');

		console.log('SCRIPT:', scriptPath);
		console.log('INPUT:', inputPath);
		console.log('OUTPUT:', outputPath);
		
		if (!fs.existsSync(scriptPath)) {
			new Notice('❌ md2html.py not found');
			return;
		}

		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const pythonPath = this.findPython();
		if (!pythonPath) {
			new Notice('❌ Python not found');
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
			(error: any, stdout: string, stderr: string) => {
				if (error) {
					console.error('EXEC ERROR:', error);
					console.error('STDOUT:', stdout);
					console.error('STDERR:', stderr);
					console.log('STDOUT:', stdout);
					console.log('STDERR:', stderr);
					new Notice('❌ Conversion failed');
					return;
				}

				new Notice(`✅ Exported: ${activeFile.basename}.html`);
			}
		);
	}
}

class DemoModal extends Modal {
	onOpen() {
		this.contentEl.setText('Woah!');
	}
	onClose() {
		this.contentEl.empty();
	}
}