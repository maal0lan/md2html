import { App, TFile, arrayBufferToBase64, normalizePath } from 'obsidian';
import { extractImageRefs } from './markdown.js';
import { ensureFolder, writeBinaryFile, type ImageMode } from './utils.js';

const MIME_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	bmp: 'image/bmp',
	avif: 'image/avif',
	ico: 'image/x-icon'
};

export interface ImageExportOptions {
	mode: ImageMode;
	/** Vault-relative folder the HTML is written to. */
	exportDir: string;
	/** Folder name (inside exportDir) that receives the images. */
	assetsFolder: string;
	/** Relative prefix from the current HTML page back to the site root. */
	assetPrefix?: string;
	/** Receives image source metadata for dependency-aware incremental exports. */
	onResolved?: (reference: string, file: { path: string; mtime: number; size: number }) => void;
	/** Reports whether a copied asset was written or reused unchanged. */
	onAssetWritten?: (reference: string, outputPath: string, changed: boolean) => void;
	/** Receives recoverable image issues so Smart Export can include them in its report. */
	onIssue?: (reference: string, reason: string) => void;
}

function resolveFile(app: App, ref: string, sourcePath: string): TFile | null {
	// Obsidian's own link resolution (handles ![[name.png]] and shortest paths)
	const viaLink = app.metadataCache.getFirstLinkpathDest(ref, sourcePath);
	if (viaLink) return viaLink;

	// Fallback: path relative to the note's folder
	const slash = sourcePath.lastIndexOf('/');
	const dir = slash === -1 ? '' : sourcePath.slice(0, slash);
	const rel = app.vault.getAbstractFileByPath(normalizePath(dir ? `${dir}/${ref}` : ref));
	return rel instanceof TFile ? rel : null;
}

function slug(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
}

/** Short stable hash so two different "image.png" files never overwrite each other. */
function shortHash(text: string): string {
	let h = 5381;
	for (let i = 0; i < text.length; i++) {
		h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
	}
	return h.toString(36).slice(0, 6);
}

/**
 * Finds every local image used in the note and returns a map of
 * reference-as-written -> src to put in the HTML:
 *  - 'files': images are copied to <exportDir>/<assetsFolder>/ and the src is a
 *    relative path like "assets/photo-1a2b3c.png" (deploy-friendly, cacheable)
 *  - 'embed': images become base64 data: URIs (single self-contained file)
 */
export async function collectImages(
	app: App,
	md: string,
	sourcePath: string,
	opts: ImageExportOptions
): Promise<Map<string, string>> {
	const images = new Map<string, string>();
	const assetsDir = normalizePath(`${opts.exportDir}/${opts.assetsFolder}`);
	let folderReady = false;

	for (const ref of extractImageRefs(md)) {
		const file = resolveFile(app, ref, sourcePath);
		if (!file) {
			opts.onIssue?.(ref, 'image reference could not be resolved');
			continue;
		}

		const ext = file.extension.toLowerCase();
		const mime = MIME_TYPES[ext];
		if (!mime) continue;
		opts.onResolved?.(ref, { path: file.path, mtime: file.stat.mtime, size: file.stat.size });

		try {
			const data = await app.vault.readBinary(file);

			if (opts.mode === 'embed') {
				images.set(ref, `data:${mime};base64,${arrayBufferToBase64(data)}`);
				continue;
			}

			if (!folderReady) {
				await ensureFolder(app, assetsDir);
				folderReady = true;
			}
			const name = `${slug(file.basename)}-${shortHash(file.path)}.${ext}`;
			const assetPath = normalizePath(`${assetsDir}/${name}`);
			const changed = await writeBinaryFile(app, assetPath, data);
			opts.onAssetWritten?.(ref, assetPath, changed);
			images.set(ref, `${opts.assetPrefix ?? ''}${opts.assetsFolder}/${name}`);
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			console.error(`md2html: could not export image "${ref}" from ${file.path}: ${reason}`, err);
			opts.onIssue?.(ref, `${file.path}: ${reason}`);
		}
	}

	return images;
}