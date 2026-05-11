#!/usr/bin/env node --no-warnings=ExperimentalWarning
import { readFileSync } from 'fs';
import os from 'os';
import { Command } from 'commander';
import clipboard from 'clipboardy';
import pkg from './package.json' with {type: 'json'};
import { checkUpdate } from './update-notifier.js';
import axios from 'axios';

const CONFIG_PATH = `${os.homedir()}/msauthify.config`;

const updateAvailable = await checkUpdate({
    author: pkg.author,
    repository: pkg.repository.name,
    name: pkg.name,
    version: pkg.version
})

if (updateAvailable) { process.exit(); }

const program = new Command();

program
    .name('msauthify')
    .description(pkg.description)
    .usage('[options] <profile>')
    .version(pkg.version, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help')
    .option('-l, --list', 'List available profiles from msauthify.config')
    .option('-d, --decode', 'Decode the JWT and output its header and payload as JSON')
    .option('-c, --copy', 'Copy the token to the system clipboard')
    .argument('[profile]', 'Profile name defined in msauthify.config')
    .showHelpAfterError('(use --help for more info, or --list to see available profiles)')
    .action(async (profile, opts) => {
        const config = loadConfig();
        if (opts.list) {
            listProfiles(config);
            return;
        }
        if (!profile) {
            program.error("error: missing required argument 'profile'");
        }
        await run(profile, config, opts);
    });

program.parseAsync().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

function listProfiles(config) {
    const profiles = Object.keys(config);
    for (const name of profiles) {
        console.log(name);
    }
}

async function run(profile, config, opts) {
    validateProfile(profile, config);

    const token = await fetchToken(config[profile]);

    if (opts.copy) {
        const payload = opts.decode
            ? JSON.stringify(decodeJwt(token), null, 2)
            : token;
        await clipboard.write(payload);
        console.error(`Token for '${profile}' copied to clipboard`);
        return;
    }

    if (opts.decode) {
        console.log(JSON.stringify(decodeJwt(token), null, 2));
        return;
    }

    console.log(token);
}

function decodeJwt(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT: expected 3 dot-separated segments');
    }
    const [headerB64, payloadB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    return { header, payload };
}

function validateProfile(profile, config) {
    if (!Object.prototype.hasOwnProperty.call(config, profile)) {
        throw new Error(`Invalid config: '${profile}' not found in ${CONFIG_PATH}`);
    }
}

function loadConfig() {
    const data = readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
}

async function fetchToken(config) {
    const url = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

    const payload = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope,
        username: config.username,
        password: config.password,
        grant_type: "password",
    });

    try {
        return (await axios.post(url, payload)).data.access_token;
    } catch (error) {
        const data = error.response?.data;
        if (data?.error_description || data?.error) {
            const code = data.error ?? 'unknown_error';
            const description = data.error_description ?? 'No description provided';
            const correlationId = data.correlation_id ?? 'N/A';
            throw new Error(`[${code}] ${description} (correlation_id: ${correlationId})`);
        }
        throw error;
    }
}
