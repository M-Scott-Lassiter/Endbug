/* eslint-disable no-console */
/* eslint-disable no-underscore-dangle */
// endbug.js - MVP Debugger Singleton for Minecraft Bedrock

// eslint-disable-next-line import/no-unresolved
import { world, Http } from '@minecraft/server'

// Internal State
let _mode = 'console' // 'external', 'console', 'chat', 'none'
let _enabled = false
const _version = '0.1.0'

/**
 * Safely checks if the external debug server is reachable.
 * Returns a Promise<boolean>.
 */
async function ping() {
    try {
        const res = await Http.request({
            url: 'http://localhost:3000/ping',
            method: 'GET',
            timeout: 200
        })
        return res.status === 200
    } catch {
        return false
    }
}

/**
 * Attempts to connect to the external debug server.
 * Sets mode based on result and logs fallback.
 */
async function connect() {
    const available = await ping()
    _mode = available ? 'external' : 'console'
    if (!available) {
        console.warn('[endbug] External debug server not detected — falling back to console mode.')
    }
}

/**
 * Sends a structured debug message to the appropriate output based on mode.
 */
function sendDebugMessage(level, message, context = {}) {
    if (!_enabled) return

    let safeContext = {}
    try {
        safeContext = JSON.parse(JSON.stringify(context))
    } catch (err) {
        console.warn('[endbug] Context could not be serialized:', err.message)
        safeContext = { __error: 'Unserializable context object' }
    }

    const payload = {
        timestamp: Date.now(),
        tick: typeof world.getTime === 'function' ? world.getTime() : -1,
        level,
        message,
        context: safeContext,
        _meta: {
            from: 'endbug',
            version: _version,
            mode: _mode
        }
    }

    switch (_mode) {
        case 'external': {
            try {
                Http.request({
                    url: 'http://localhost:3000/log',
                    method: 'POST',
                    headers: [{ name: 'Content-Type', value: 'application/json' }],
                    body: JSON.stringify(payload),
                    timeout: 200
                })
            } catch (err) {
                // Fall back to in-game console if external logging fails
                console.warn('[endbug] Failed to send external log:', err?.message)
            }
            break
        }
        case 'console': {
            const out = `[endbug] ${message}`
            if (level === 'error') console.error(out, safeContext)
            else if (level === 'warn') console.warn(out, safeContext)
            else console.log(out, safeContext)
            break
        }
        case 'chat': {
            try {
                world.sendMessage(`§7[endbug] §r${message}`)
            } catch (err) {
                console.warn('[endbug] Failed to send chat message:', err?.message)
            }
            break
        }
        case 'none':
        default:
            break
    }
}

const endbug = {
    enable() {
        _enabled = true
    },
    disable() {
        _enabled = false
    },
    connect,
    ping,
    log(msg, ctx) {
        sendDebugMessage('info', msg, ctx)
    },
    warn(msg, ctx) {
        sendDebugMessage('warn', msg, ctx)
    },
    error(msg, ctx) {
        sendDebugMessage('error', msg, ctx)
    },
    say(msg) {
        sendDebugMessage('say', msg)
    }
}

Object.defineProperty(endbug, 'mode', {
    get: () => _mode,
    enumerable: true
})

Object.defineProperty(endbug, 'enabled', {
    get: () => _enabled,
    enumerable: true
})

Object.defineProperty(endbug, 'tick', {
    get: () => (typeof world.getTime === 'function' ? world.getTime() : -1),
    enumerable: true
})

globalThis.endbug = endbug
