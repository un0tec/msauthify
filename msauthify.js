import { readFileSync } from 'fs';
import os from 'os';
import pkg from './package.json' with {type: 'json'};
import { checkUpdate } from './update-notifier.js';
import axios from 'axios';

const updateAvailable = await checkUpdate({
    author: pkg.author,
    repository: pkg.repository.name,
    name: pkg.name,
    version: pkg.version
})

if (updateAvailable) { process.exit(); }

init().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

async function init() {

    // config
    const data = readFileSync(os.homedir() + "/msauthify.config", "utf8");
    const config = JSON.parse(data);

    const url = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

    const payload = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope,
        username: config.username,
        password: config.password,
        grant_type: "password",
    });

    const token = (await axios.post(url, payload.toString())).data.access_token;

    console.log(token);

}