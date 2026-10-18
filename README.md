# Guide: md2html (Markdown to HTML) for Obsidian

The plugin converts the note you have open into a themed HTML file. It is pure TypeScript, so there is no Python(older version was made with python but yk obsidian excpects eveything on js so ya ) or any other external tool to install.

## Prerequisites

1. **Node.js** installed (`node --version` should work).
2. **Obsidian** installed, with a vault you can safely test in.
3. In Obsidian, turn off Restricted mode: Settings → Community plugins → Turn on community plugins.

## Installation (development)

The easiest way is to keep the plugin source directly inside your test vault:

```
<your vault>/.obsidian/plugins/mdtohtml/
```

The folder name must match the `id` in `manifest.json` (`mdtohtml`).

1. Put the project files in that folder (`src/`, `manifest.json`, `package.json`, `tsconfig.json`, your `esbuild.config.mjs`, etc.).
2. Open a terminal in that folder and run:
   ```
   npm install
   npm run dev
   ```
   Leave this running. It rebuilds `main.js` every time you save a source file.
   For a one-off production build use `npm run build` instead (this also type-checks and shows any TypeScript errors).
3. In Obsidian: Settings → Community plugins → press the refresh button, then toggle **md2html** ON.

To pick up new code after a rebuild, reload Obsidian (`Ctrl+R` / `Cmd+R`) or toggle the plugin off and on.

## Test note

Create a note called `Test Note` in the vault and paste this in. Put any picture in the vault first (for example drag a PNG into the note so Obsidian saves it) and use its real file name in the lines marked below.

````markdown
---
title: frontmatter should NOT show up in the export
tags: [test]
---

# Test Note

Normal paragraph with **bold**, *italic*, ~~strike~~, ==highlight== and `inline code`.
A second line right below (should stay a line break).

![[YOUR-IMAGE.png]]

![[YOUR-IMAGE.png|200]]

![[does-not-exist.png]]

![alt text](YOUR-IMAGE.png)

A [[Some Other Note|wikilink with alias]] and a [normal link](https://obsidian.md).

> A quote with **bold** text.

- [ ] open task
- [x] done task
- plain bullet

1. first
2. second

| Name | Value |
| ---- | ----- |
| A    | 1     |
| B    | 2     |

```js title
console.log("this fence line used to freeze the converter");
```

---

End.
````

## Testing steps

### 1. Basic conversion

1. Open `Test Note` (the command only appears while a Markdown note is the active file).
2. Press `Ctrl+P` / `Cmd+P` and run **Convert current Markdown to HTML**.
3. You should see a notice like: `Exported: exports/Test-Note.html`.

### 2. Verify the output

The export folder is created in the vault root:

```
<your vault>/
└── exports/
    ├── Test-Note.html
    └── assets/
        └── your-image-1a2b3c.png
```

Obsidian's file explorer only lists notes and images, so open the `.html` from your system file manager (right-click the `exports` folder in Obsidian → "Show in system explorer") and double-click it to open in a browser.

Check:

- Frontmatter is not shown.
- Bold, italic, strike, highlight, code, quote, lists, task checkboxes and the table render correctly.
- Single line breaks inside a paragraph are kept.
- The image shows for `![[...]]`, the `|200` version is narrower, and the standard `![alt](...)` one shows too.
- The missing image shows an italic "Image not found: does-not-exist.png" label instead of a broken icon.
- The wikilink shows only its alias text.
- The `js title` code block renders and the export finishes (no freeze).

### 3. Test settings

Settings → **md2html**:

| Setting | What to try |
| --- | --- |
| Export theme | Try several (Dark, Dracula, Sepia, Automatic...). Re-run the command and re-open the HTML. For Automatic, switch your OS between light and dark mode. |
| Export folder | Default is `exports`. Change it to e.g. `site/out`, re-run, and check the new folder (parent folders are created automatically). |
| Images | "Save as separate files" writes into the image folder. "Embed inside the HTML" puts images inside the HTML as base64 (no `assets` folder needed, the single file works anywhere). |
| Image folder name | Default is `assets`. Change it to e.g. `media` and re-run. |

Re-running the command overwrites the existing HTML. Unchanged images are not rewritten.

### 4. Test error handling

1. Click into something that is not a Markdown note (a PDF, an image, or close all tabs). **Convert current Markdown to HTML** should disappear from the command palette.
2. Open DevTools (`Ctrl+Shift+I` / `Cmd+Option+I`) → Console while converting. A normal run prints no errors. Image problems are logged as `md2html: could not export image "..."`.
3. Temporarily set the export folder to something odd like `../outside`. It should fall back to `exports` instead of writing outside the vault.

## Expected behavior

### Success
- Notice: `Exported: <export folder>/<Note-Name>.html`
- HTML file in the export folder, spaces in the note name replaced by dashes.
- Images in `<export folder>/<image folder>/` (or embedded, depending on the Images setting).
- Self-contained styling: the theme CSS is inside the HTML, no external requests.

### Errors
- No Markdown note open: the command isn't offered (if triggered another way: `Open a Markdown file first.`).
- Anything unexpected during export: `Conversion failed. See console for details.`

## Configuration

Settings are stored in:

`<vault>/.obsidian/plugins/mdtohtml/data.json`

Example:

```json
{
  "exportTheme": "dark",
  "exportPath": "exports",
  "assetsFolder": "assets",
  "imageMode": "files"
}
```

Deleting this file resets everything to the defaults.

## Troubleshooting

### Plugin doesn't show up in Community plugins
1. Check the folder is `.obsidian/plugins/mdtohtml/` and contains `main.js` and `manifest.json`. `main.js` only exists after `npm run dev` or `npm run build` has run.
2. Press the refresh button in the Community plugins list.
3. Check `minAppVersion` in `manifest.json` is not higher than your Obsidian version.

### `npm run build` shows TypeScript errors
Copy the full message. The build runs `tsc` first, so type errors stop it before bundling.

### No notice appears
1. Open DevTools → Console and look for red errors.
2. Make sure the plugin toggle is ON and the active file is a `.md` note.

### Images are broken in the browser
1. Open the HTML from inside the `exports` folder. If you move or email only the `.html`, the `assets` folder has to travel with it. Switch **Images** to "Embed inside the HTML" if you need one standalone file.
2. Check the image really exists in the vault. Missing images show the "Image not found" label.

### HTML file not created
1. Check the notice for the output path.
2. Look in the Console for the error details.

## Notes

- Deployment later: the whole `exports` folder is the deploy root (for example for Vercel), because pages link images with relative paths like `assets/name.png`.
- Not supported yet: nested lists, callouts (`> [!note]`), and syntax highlighting in code blocks.