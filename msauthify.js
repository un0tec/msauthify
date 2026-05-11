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
    .usage('[options] <profiles...>')
    .version(pkg.version, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help')
    .option('-l, --list', 'List available profiles from msauthify.config')
    .option('-d, --decode', 'Decode the JWT and output its header and payload as JSON')
    .option('-c, --copy', 'Copy the token to the system clipboard (single profile only)')
    .argument('[profiles...]', 'Profile names defined in msauthify.config')
    .showHelpAfterError('(use --help for more info, or --list to see available profiles)')
    .action(async (profiles, opts) => {
        const config = loadConfig();
        if (opts.list) {
            listProfiles(config);
            return;
        }
        if (profiles.length === 0) {
            program.error("error: missing required argument 'profiles'");
        }
        if (opts.copy && profiles.length > 1) {
            program.error('error: --copy can only be used with a single profile');
        }
        await run(profiles, config, opts);
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

async function run(argv, config, opts) {
    validateArgs(argv, config);

    const profiles = Object.fromEntries(
        Object.entries(config).filter(([key]) => argv.includes(key))
    );

    let results = [];
    for (let profile in profiles) {
        const token = await fetchToken(config[profile]);
        results.push({ name: profile, token: token })
    }

    if (opts.copy) {
        const { name, token } = results[0];
        const payload = opts.decode
            ? JSON.stringify(decodeJwt(token), null, 2)
            : token;
        await clipboard.write(payload);
        console.error(`Token for '${name}' copied to clipboard`);
        return;
    }

    if (opts.decode) {
        printDecoded(results);
        return;
    }

    if (results.length === 1) {
        console.log(results[0].token);
    } else {
        for (let { name, token } of results) {
            const tokenMessage = `Token '${name}'`;
            console.log('-'.repeat(tokenMessage.length));
            console.log(tokenMessage);
            console.log('-'.repeat(tokenMessage.length));
            console.log(token);
        }
    }
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

function printDecoded(results) {
    if (results.length === 1) {
        console.log(JSON.stringify(decodeJwt(results[0].token), null, 2));
        return;
    }
    const output = {};
    for (const { name, token } of results) {
        output[name] = decodeJwt(token);
    }
    console.log(JSON.stringify(output, null, 2));
}

function validateArgs(argv, config) {
    const invalidProfiles = argv.filter(profile => !config.hasOwnProperty(profile));
    if (invalidProfiles.length > 0) {
        throw new Error(`Invalid config: '${invalidProfiles.join(", ")}' not found in ${CONFIG_PATH}`);
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
