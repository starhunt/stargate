# Star Gate

[English](./README.md) | [한국어](./README_KO.md)

Clip web pages with a multi-tab browser, AI analysis templates, and content capture.

## Features

- Multi-tab embedded browser with pinned and temporary tabs.
- AI analysis templates for briefings, concept notes, insights, knowledge maps, and deep analysis.
- Quick Save for raw page content and selected text.
- YouTube metadata extraction for richer captured notes.
- Configurable AI providers, models, note templates, and pinned sites.

## Installation

### From Community Plugins

1. Open Settings → Community plugins.
2. Search for **Star Gate**.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub release](https://github.com/starhunt/stargate/releases/latest).
2. Create the plugin folder: `<vault>/.obsidian/plugins/stargate/`.
3. Copy the downloaded files into that folder.
4. Restart the app or reload plugins, then enable **Star Gate** in Community plugins.

### Build from source

```bash
git clone https://github.com/starhunt/stargate.git
cd stargate
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/stargate/`.

## Usage

1. Enable **Star Gate** in Community plugins.
2. Open the command palette or use the plugin ribbon/sidebar entry.
3. Configure provider keys, folders, templates, or review options in plugin settings as needed.
4. Run the relevant command for your workflow.

## Commands

- `Open Browser`
- `Open Browser in New Tab`
- `Open AI Analysis`
- `Quick Save (Raw Content)`

## Privacy and network use

Star Gate can load web pages that you open in its embedded browser. AI analysis uses only the providers and services you configure. The plugin does not collect telemetry.

## Platform

This plugin is desktop-only because it uses desktop-only APIs.

## License

MIT License. See [LICENSE](./LICENSE).
