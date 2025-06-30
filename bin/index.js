#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const endbugPkgVersion = JSON.parse(
    fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version

// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

// --version flag
if (args.includes('--version')) {
    console.log(endbugPkgVersion)
    process.exit(0)
}

// Default help
if (args.length === 0 || args.includes('--help')) {
    console.log(chalk.cyan('\nEndbug CLI'))
    console.log('Usage: npx endbug <command> [options]\n')
    console.log(chalk.white('Commands:'))
    console.log('  init                  Copy endbug.js into your project')
    console.log('  server [flags]        Start the Endbug logging server')
    console.log('\nUse "--version" to show version info.\n')
    process.exit(0)
}

const command = args[0]
const subargs = args.slice(1)

if (command === 'init') {
    // Parse flags
    const force = subargs.includes('--force')
    const targetIndex = subargs.indexOf('--target')
    const manifestIndex = subargs.indexOf('--manifest')

    const targetDir =
        targetIndex !== -1 && subargs[targetIndex + 1]
            ? path.resolve(process.cwd(), subargs[targetIndex + 1])
            : process.cwd()

    const manifestPath =
        manifestIndex !== -1 && subargs[manifestIndex + 1]
            ? path.resolve(process.cwd(), subargs[manifestIndex + 1])
            : null

    const destPath = path.join(targetDir, 'endbug.js')
    const sourcePath = path.resolve(__dirname, '../lib/endbug.js')

    if (!fs.existsSync(sourcePath)) {
        console.error(chalk.red('[endbug] Could not find endbug.js to copy.'))
        process.exit(1)
    }

    if (fs.existsSync(destPath) && !force) {
        console.error(
            chalk.red(`[endbug] File already exists at ${destPath}. Use --force to overwrite.`)
        )
        process.exit(1)
    }

    fs.copyFileSync(sourcePath, destPath)
    console.log(chalk.cyan(`[endbug] Copied endbug.js to ${destPath}`))

    // Optional manifest modification
    if (manifestPath) {
        try {
            const raw = fs.readFileSync(manifestPath, 'utf8')
            const data = JSON.parse(raw)
            const mod = {
                type: 'script',
                language: 'javascript',
                entry: 'scripts/endbug.js'
            }
            if (!Array.isArray(data.modules)) {
                data.modules = [mod]
                console.log(chalk.yellow('[endbug] Added "modules" array to manifest.'))
            } else if (!data.modules.some((m) => m.entry === mod.entry)) {
                data.modules.unshift(mod)
                console.log(chalk.yellow('[endbug] Inserted endbug module into manifest.'))
            } else {
                console.log(chalk.cyan('[endbug] Manifest already includes endbug module.'))
            }
            fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf8')
        } catch (err) {
            console.error(chalk.red(`[endbug] Failed to update manifest: ${err.message}`))
        }
    }

    process.exit(0)
}

if (command === 'server') {
    const { spawn } = await import('child_process')
    const serverPath = path.resolve(__dirname, '../lib/server.js')
    const proc = spawn('node', [serverPath, ...subargs], { stdio: 'inherit' })
    proc.on('exit', (code) => process.exit(code))
} else {
    console.error(chalk.red(`[endbug] Unknown command: ${command}`))
    process.exit(1)
}
