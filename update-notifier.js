import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';

const CACHE_DIR = path.join(os.homedir(), '.cache', 'msauthify');
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json');
const TTL_MS = 24 * 60 * 60 * 1000;

function readCache(currentVersion) {
    try {
        const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
        if (cache.currentVersion !== currentVersion) return null;
        if (typeof cache.checkedAt !== 'number') return null;
        if (Date.now() - cache.checkedAt > TTL_MS) return null;
        return cache.latestVersion ?? null;
    } catch {
        return null;
    }
}

function writeCache(currentVersion, latestVersion) {
    try {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(CACHE_FILE, JSON.stringify({
            checkedAt: Date.now(),
            currentVersion,
            latestVersion,
        }));
    } catch {
        // silent: cache is best-effort, never break the CLI
    }
}

async function fetchLatestRelease(pkg) {
    const url = `https://api.github.com/repos/${pkg.author}/${pkg.repository}/releases/latest`;
    try {
        return (await axios.get(url)).data.tag_name;
    } catch (error) {
        console.warn(`Error fetching latest release. Check manually: https://github.com/${pkg.author}/${pkg.repository}/releases/latest`);
        return null;
    }
}

function logUpdate(pkg, latestVersion) {
    console.warn(`Update available ${pkg.version} -> ${latestVersion}`);
    console.warn(`Run 'npm i -g ${pkg.name}' to update`);
    console.warn(`GitHub -> https://github.com/${pkg.author}/${pkg.repository}/releases/latest`);
}

export async function checkUpdate(pkg) {
    let latestVersion = readCache(pkg.version);
    if (!latestVersion) {
        latestVersion = await fetchLatestRelease(pkg);
        if (latestVersion) {
            writeCache(pkg.version, latestVersion);
        }
    }

    if (latestVersion && pkg.version !== latestVersion) {
        logUpdate(pkg, latestVersion);
        return true;
    }
    return false;
}
