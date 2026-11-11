# gag

A static website exported from Rahat Site Builder. No server, no build step — every `.html` file in this folder is complete and self-contained; open one directly in a browser or host the whole folder as-is.

## Pages
- `index.html` — Home

## Hosting on GitHub Pages
This is a plain static site, so GitHub Pages works with no extra setup: commit this folder to a repo, enable Pages in the repo's Settings → Pages, and point it at the branch/folder containing these files. There is no build/CI step required.

**Important — this is a one-way export, not a live sync.** Editing these files with a code editor (or `git`) does *not* update the project inside Rahat Site Builder, and editing inside the builder does not update files already committed to your repo. Each time you want your published site to reflect changes made in the builder, re-export and re-commit/push the updated files — there is currently no automatic two-way connection between a cloned repo folder and the builder app.

## Re-importing into the builder
Every exported `.html` file has the full project data embedded in an HTML comment near the top (safe, invisible when the page is viewed normally). Use "Import Project" in the builder and select either that `.html` file or a `.rsb.json` export to restore the full editable project — including any custom blocks, which are also automatically added to your personal Custom Block library for reuse in other projects.

## Theme colors
Three colors drive the whole site's look, set in Theme → Brand Colors:

| Role | Current value | Used for |
|---|---|---|
| Primary | `#ffb347` | Accents only — selection states, one CTA, a drop-cap. Not a default text color. |
| Warning | `#e07a7a` | Errors, required-field markers, destructive actions only. |
| Base (white) | `#ffffff` | The default color for nearly all text on the site — headings, body copy, labels. |

All built-in blocks read these through CSS variables (`--theme-primary`, `--theme-warning`, `--theme-white`, plus derived `--theme-text2`/`--theme-text3` for secondary/tertiary text) rather than hardcoding colors, so changing any of the three above updates the whole site consistently. If you (or an AI) ever add a custom block with a hardcoded color instead of `var(--theme-primary)` etc., it will not follow future color changes — that is the one thing to watch for.

## Glass effect
Set in Theme → Glass. Border Radius, Blur, and Distortion shape the frosted-glass look itself. Glass Darkness (or Auto-Detect Background, described below) tints every glass panel on the site at once — there is nothing to configure per block.

- **Manual** (Auto-Detect off): a single Glass Darkness slider plus a Brighten Color and a Darken Color — pick a fixed tint by eye.
- **Auto-Detect Background** (on): a single Auto Darken Intensity slider instead. The site samples its own background image live in the browser and darkens the glass automatically — more on a light background, none on a dark one — always toward your Darken Color, never brighter (brightening was left out on purpose: it makes white text on glass unreadable).

## Custom blocks on this site
(none on this site)

## Known engineering rules (do not reintroduce these bugs)
- The shared glass-blur filter (`#frosted`) is one expensive resource for the whole page — keep it to 1-2 elements per block; never resize/redeclare the filter itself.
- Glass tint (Theme → Glass → Glass Darkness, or Auto-Detect Background) is applied ONCE, inside the shared `#frosted` filter itself (a `feFlood`+`feComposite` layered over the blur/displacement) — never per-block. Do not add a block-level overlay/`filter:brightness()` "to fix contrast"; it will double up on a site-wide setting and drift out of sync the moment that setting changes.
- Auto-Detect Background (when on) samples the live background image via canvas on every background change and rewrites the filter's `#glassTintFlood` element's `flood-color`/`flood-opacity` at runtime — it is intentionally darken-only (brightening was ruled out: it makes white text on glass unreadable). If Auto-Detect ever seems to have "no effect", check that Auto Darken Intensity isn't 0, not that the sampling code is broken.
- The Paragraph (multi-box) block's row-count is NOT controlled by a fixed viewport breakpoint — its boxes wrap naturally via `flex-wrap`, changing rows only when they genuinely no longer fit at their real pixel width. Only below ~960px does it force a single stacked column. Do not reintroduce a wide fixed-viewport breakpoint (e.g. 1200px) for this block — it caused rows to collapse to one column while there was still plenty of room for two.
- Any data embedded inside this page's own `<style>` tag must have its closing-tag sequences escaped, or a custom block containing its own `<style>` block will truncate the real page CSS.
- Custom block code is run through the browser's own parser to auto-repair malformed markup before being embedded — still, keep custom block code to just the block's own snippet, not a whole page.
