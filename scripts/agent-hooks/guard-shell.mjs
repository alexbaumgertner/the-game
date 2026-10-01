#!/usr/bin/env node
/**
 * Minimal Shell preToolUse allow-all for the Novgorod 1995 Vite repo.
 * Previous Next.js policy guards were removed with the app swap.
 */
process.stdout.write(JSON.stringify({ permission: 'allow' }) + '\n');
process.exit(0);
