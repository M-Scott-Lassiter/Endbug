# Endbug

**A low-friction debug message relay tool for Minecraft Bedrock addon developers.**  
Use `endbug.js` in your addon scripts to send log messages to an external terminal, with automatic
fallback to in-game console output when offline.

---

## ✨ Features

- 🧠 Global logger — drop-in usage with `endbug.log()`, `warn()`, `error()`, and more
- 🖥 External log server with clean, color-coded terminal output
- 🪛 Structured log payloads include level, tick, and sender IP
- 🛑 Graceful fallback to in-game `console.log()` if the server is offline
- ⚙️ Fully configurable with CLI flags or a config file
- 🧪 Optional manifest injection support to automate setup
- 📦 Easy install with `npx` — no global dependencies required

---

## Quick Start

Initialize your addon project to use Endbug:

```bash
npx endbug init
```

Start the debug server:

```bash
npx endbug server
```

Optional: Inject the logger into your behavior pack’s manifest:

```bash
npx endbug init --manifest ./path/to/manifest.json
```

## Using Endbug in Minecraft Scripts

Once scripts/endbug.js is added to your behavior pack, use the logger like this:

```javascript
endbug.enable()
endbug.connect()

endbug.log('Debug initialized')
endbug.warn('Something might be wrong')
endbug.error('Definitely broken')
endbug.say('This message is visible in chat')
```

Endbug automatically includes contextual metadata like server tick and sender IP (when running
externally).

## Server CLI Options

Run the debug relay server with:

```bash
npx endbug server [options]
```

### Available Flags:

| Flag              | Description                               | Default      |
| ----------------- | ----------------------------------------- | ------------ |
| `--port <number>` | Port to listen on                         | `3000`       |
| `--remote`        | Allow LAN devices to connect              | `false`      |
| `--max-body <kb>` | Maximum accepted body size (in kilobytes) | `16`         |
| `--config <file>` | Path to a JSON config file                | _(optional)_ |
| `--help`          | Show usage instructions                   |              |

## Manifest Injection

Use the `--manifest` flag during init to automatically register `scripts/endbug.js` in your behavior
pack manifest:

```bash
npx endbug init --manifest ./BP/manifest.json
```

- Adds the script to the modules array
- Ensures it's the first module entry
- Skips injection if already present

## Example Config File

Instead of passing flags repeatedly, you can use a JSON config file:

```json
{
    "port": 4000,
    "allowRemote": true,
    "maxBodyKb": 32
}
```

Run the server with:

```bash
npx endbug server --config ./endbug.config.json
```

## Terminal Output Styling

Endbug’s log output is clean and color-coded:

```bash
[endbug] [info  ] Minecraft server started
[endbug] [warn  ] Missing scoreboard tag
[endbug] [error ] Crash in tick handler
```

- [endbug] — Cyan (source tag)
- [info] — White
- [warn] — Yellow
- [error] — Red
- Log message body — Always white

## Development

To work on Endbug locally:

```bash
git clone https://github.com/yourname/endbug
cd endbug
npm install
npm link
```

Now you can run endbug from any directory.

## License

MIT License © Wayfind Entertainment LLC

## About

Endbug is part of the Wayfind Creator Tools family, developed to streamline Minecraft Bedrock addon
development.

For updates, tutorials, and related tools, visit
[wayfindminecraft.com](https://wayfindminecraft.com).
