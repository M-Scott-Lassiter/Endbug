/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
// server.js - Endbug Log Server (MVP with Chalk Colors)

import express from 'express'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const app = express()

// Parse CLI args
const args = process.argv.slice(2)

// Handle --help flag
if (args.includes('--help')) {
    console.log(chalk.cyan('Endbug Debug Log Server'))
    console.log('Usage: node server.js [options]')
    console.log(chalk.white('Options:'))
    console.log('  --port <number>       Port to listen on (default: 3000)')
    console.log('  --remote              Allow external connections (default: off)')
    console.log('  --max-body <number>   Max body size in KB (default: 5.0)')
    console.log('  --config <path>       Path to config file (default: endbug.config.json)')
    console.log('  --help                Show this help message and exit')
    console.log(chalk.white('Config File:'))
    console.log('  You can create an endbug.config.json file with any of the above options.')
    console.log(chalk.white('Example:'))
    console.log('  node server.js --port 4000 --remote --max-body 10')
    process.exit(0)
}

const portIndex = args.indexOf('--port')
const maxBodyIndex = args.indexOf('--max-body')
const configIndex = args.indexOf('--config')
const remoteEnabledFlag = args.includes('--remote')

// Load config from file
let config = {}
try {
    let configPath = path.resolve(process.cwd(), 'endbug.config.json')
    if (configIndex !== -1 && args[configIndex + 1]) {
        configPath = path.resolve(process.cwd(), args[configIndex + 1])
    }
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
} catch (err) {
    console.warn(chalk.yellow('[endbug] Warning: Failed to parse config file:'), err.message)
}

// Resolve remote flag
const remoteEnabled = remoteEnabledFlag || config.allowRemote === true

// Resolve and validate port
let port = 3000
if (portIndex !== -1) {
    const raw = args[portIndex + 1]
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed % 1 !== 0 || parsed < 1024 || parsed > 65535) {
        console.error(
            chalk.red(`[endbug] Invalid port: "${raw}". Must be an integer between 1024 and 65535.`)
        )
        process.exit(1)
    }
    port = parsed
} else if (typeof config.port === 'number') {
    if (
        !Number.isFinite(config.port) ||
        config.port % 1 !== 0 ||
        config.port < 1024 ||
        config.port > 65535
    ) {
        console.error(
            chalk.red(
                `[endbug] Invalid config.port: ${config.port}. Must be an integer between 1024 and 65535.`
            )
        )
        process.exit(1)
    }
    port = config.port
}

// Resolve and validate max-body
let maxBodyKb = 5.0
if (maxBodyIndex !== -1) {
    const raw = args[maxBodyIndex + 1]
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0.1) {
        console.error(chalk.red(`[endbug] Invalid --max-body: "${raw}". Must be at least 0.1 KB.`))
        process.exit(1)
    }
    maxBodyKb = parsed
} else if (typeof config.maxBodyKb === 'number') {
    if (!Number.isFinite(config.maxBodyKb) || config.maxBodyKb < 0.1) {
        console.error(
            chalk.red(
                `[endbug] Invalid config.maxBodyKb: ${config.maxBodyKb}. Must be at least 0.1 KB.`
            )
        )
        process.exit(1)
    }
    maxBodyKb = config.maxBodyKb
}
const maxBodyBytes = Math.floor(maxBodyKb * 1024)

const host = remoteEnabled ? '0.0.0.0' : '127.0.0.1'
if (remoteEnabled) {
    console.warn(
        chalk.yellow(
            '[endbug] ⚠ Remote access enabled — make sure your firewall is properly configured.'
        )
    )
}

// Middleware
app.use(express.json({ limit: maxBodyBytes }))

// Routes
app.get('/ping', (req, res) => {
    res.send('pong')
})

app.post('/log', (req, res) => {
    const ip = req.ip.replace(/^::ffff:/, '')
    const payload = req.body

    payload._meta = {
        ...payload._meta,
        ip
    }

    const levelTag = payload.level.padEnd(6)
    let tagColor
    switch (payload.level) {
        case 'error':
            tagColor = chalk.red
            break
        case 'warn':
            tagColor = chalk.yellow
            break
        default:
            tagColor = chalk.white
    }

    const msg = `${tagColor(`[${levelTag}]`)} ${chalk.white(payload.message)}`
    console.log(msg, payload.context || {})
    res.sendStatus(200)
})

// Error handling
// the `next` function is required for Express to recognize this as an error handling function.
// eslint-disable-next-line no-unused-vars
app.use(function errorHandler(err, req, res, next) {
    if (err.type === 'entity.too.large') {
        console.warn(chalk.yellow(`[endbug] Rejected oversized payload from ${req.ip}`))
        return res.status(413).json({ error: 'Payload too large' })
    }

    console.error(chalk.red('[endbug] Unexpected server error:'), err)
    return res.status(500).json({ error: 'Internal server error' })
})

// Start server with error handler
const server = app.listen(port, host, () => {
    console.log(chalk.cyan(`[endbug] Log server running on http://${host}:${port}`))
    console.log(chalk.cyan(`[endbug] Max request body size: ${maxBodyBytes} bytes`))
    console.log(chalk.cyan('[endbug] Press Ctrl+C to stop the server gracefully.'))
})

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(
            chalk.red(`[endbug] Port ${port} is already in use. Is another instance running?`)
        )
    } else if (err.code === 'EACCES') {
        console.error(
            chalk.red(
                `[endbug] Permission denied on port ${port}. Ports below 1024 require elevated privileges.`
            )
        )
    } else {
        console.error(chalk.red('[endbug] Unexpected server error:'), err)
    }
    process.exit(1)
})

function shutdown(reason) {
    console.log(chalk.cyan(`[endbug] Received ${reason}. Shutting down server...`))
    server.close(() => {
        console.log(chalk.cyan('[endbug] Server closed. Goodbye.'))
        process.exit(0)
    })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
