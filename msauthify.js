#!/usr/bin/env node --no-warnings=ExperimentalWarning
import { readFileSync } from 'fs';
import os from 'os';
import { Command } from 'commander';
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
    .version(pkg.version, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help')
    .option('-l, --list', 'List available profiles from msauthify.config')
    .argument('[profiles...]', 'Profile names defined in msauthify.config')
    .action(async (profiles, opts) => {
        const config = loadConfig();
        if (opts.list) {
            listProfiles(config);
            return;
        }
        await run(profiles, config);
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

async function run(argv, config) {
    validateArgs(argv, config);

    let profiles = argv.length > 0
        ? Object.fromEntries(Object.entries(config).filter(([key]) => argv.includes(key)))
        : config;

    let results = [];
    for (let profile in profiles) {
        const token = await fetchToken(config[profile]);
        results.push({ name: profile, token: token })
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
