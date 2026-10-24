# Cursor agent changes

Date: 24 Oct 2026

This file records what the agent found and changed in this session after the plugin was reported as not exporting well in Obsidian.

## Why export looked broken

Smart Export was wired up, but several bugs made it fail or look like nothing happened:

1. **The current folder was ignored.** The command is named “Smart Export: current folder as website”, but it exported **every Markdown note in the vault**, including empty folders. On a large vault that is slow, noisy, and not what the command says.
2. **Nested HTML paths had no parent folders.** Notes in subfolders were written as `exports-md2html/sub/note.html` without creating `sub/` first. `vault.create` then fails on Windows/Obsidian.
3. **Failures were silent.** Smart Export had no `try/catch`, so a throw produced no notice.
4. **Wikilinks stayed as plain text.** `[[Note]]` did not become a real `<a href>` to the exported page.
5. **Output folder moved.** Default is now `exports-md2html/` (not the old `exports/`). Existing `exportPath: "exports"` is migrated. Easy to look in the wrong place.
6. **Obsidian hides `.html` files** in the file explorer, so a successful export is easy to miss unless you open the folder in the system file manager.

Legacy **Convert current Markdown to HTML** was already writing a single themed HTML file. Smart Export was the broken path.

## Files changed

| File | What changed |
| --- | --- |
| `src/smart-export.ts` | Folder-scoped export, nested folder creation, URL-safe paths, Obsidian wikilink resolution, start/success/error notices |
| `src/markdown.ts` | `resolveWikilink` option, heading ids, safer image `src` attributes |
| `src/main.ts` | Clearer success notice that HTML must be opened in a browser |
| `src/settings.ts` | Settings copy now matches folder-website behaviour |
| `src/utils.ts` | Comment on `exportMode` |

Related files that were already in the working tree before this session (not rewritten here, but part of the feature): `src/images.ts` (`assetPrefix`), `src/obsidian.d.ts`.

## Behaviour now

### Smart Export (current folder as website)

- Exports **the folder of the active note**, plus subfolders, not the whole vault (unless the note is in the vault root).
- Site root is that folder: `exports-md2html/index.html` is the folder overview.
- Nested notes keep relative structure, e.g. `sub/note.html`.
- Parent folders are created before writing.
- Windows-illegal characters in titles (`: * ?` etc.) are replaced in output filenames.
- `[[wikilinks]]` use `metadataCache.getFirstLinkpathDest` so they match Obsidian’s own link rules. Links to notes **outside** the exported folder stay unlinked text.
- Heading links like `[[Note#Heading]]` get a `#` fragment; headings in the HTML get `id`s.
- Image paths stay relative (`../assets/...`) and are URI-encoded.
- Notices: started → complete, or a failure notice pointing at the developer console.
- Manifest `.md2html-manifest.json` records `sourceFolder` so sync check matches the folder you exported.

### Legacy convert (single note)

- Still writes one HTML file: `exports-md2html/<Note-Name>.html` (spaces in the name become dashes).
- Success notice now says to open the file in a browser because Obsidian hides `.html`.

## How to test

1. Keep `npm run dev` running so `main.js` rebuilds.
2. Reload Obsidian (`Ctrl+R`).
3. Open a Markdown note **inside the folder you want as a site**.
4. Command palette → **Smart Export: current folder as website**.
5. Expect notices: `Smart Export started…` then `Smart Export complete: N notes → exports-md2html/index.html`.
6. In Obsidian, right-click `exports-md2html` → **Show in system explorer**, then open `index.html` in a browser.

For one page only: **Convert current Markdown to HTML**.

If it still fails: `Ctrl+Shift+I` → Console and look for `md2html` errors.

## Not done in this session

- No git commit (not requested).
- README still mentions the old `exports/` folder in places.
- Nested Markdown lists and Obsidian callouts (`> [!note]`) are still unsupported, same as before.
- No in-Obsidian live run was possible from this environment; verification is the reload + command steps above.
