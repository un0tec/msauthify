# msauthify

[![License: MIT](https://img.shields.io/github/license/un0tec/msauthify?color=orange&cache=none)](LICENSE)
[![Release](https://img.shields.io/github/v/release/un0tec/msauthify?color=green&label=Release)](https://github.com/un0tec/msauthify/releases/latest)

1. :notebook_with_decorative_cover: [Description](#-description)
2. :warning: [Before running](#-before-running)
3. :hammer: [Installation](#-installation)
4. :writing_hand: [Usage](#-usage)
5. :bookmark_tabs: [Options](#-options)
6. :monocle_face: [Examples](#-examples)
7. :page_with_curl: [License](#-license)
8. :heart: [Contribution](#-contributing)

## # Description

`msauthify` is a Node.js application for automating OAuth2 authentication with Microsoft services. It retrieves access tokens by leveraging the resource owner password credentials grant flow. This tool simplifies authentication for developers working with Microsoft APIs.

## # Before Running

Ensure that your AWS SSO profiles are configured using `aws sso configure` and your profiles are configured in a JSON file named `msauthify.config`. The format of the configuration file should include the following details:

- `tenantId`: The Microsoft Azure tenant ID.
- `clientId`: The application (client) ID from Azure.
- `clientSecret`: The client secret for the application.
- `scope`: The API scopes requested.
- `username`: The username of the account for authentication.
- `password`: The password of the account for authentication.

The `msauthify.config` file should be placed as follows:

- **Linux/macOS:** ~/msauthify.config
- **Windows:** %userprofile%\msauthify.config

## # Installation

`npm i -g msauthify`

## # Usage

Basic usage example:

    msauthify [OPTIONS]

The application will authenticate using the credentials provided in `msauthify.config` and output the access token.

## # Options

N/A

## # Examples

Linux: `~/msauthify.config`\
Windows: `%userprofile%/msauthify.config`

```
{
    "tenantId": "your-tenant-id",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "scope": "your-scope-app",
    "username": "user@example.com",
    "password": "your-password"
}
```
**Application Output:**
```
token...
```

## # License

Distributed under the MIT License. See `LICENSE` for more information.

## # Contributing

We welcome contributions to improve the functionality of `msauthify`! Here's how you can contribute:

1. Fork the project
2. Create a new feature branch (`git checkout -b feature/YourFeature`)
3. Make your changes and commit (`git commit -m 'Add feature'`)
4. Push to your branch (`git push origin feature/YourFeature`)
5. Open a pull request

Your contributions will be greatly appreciated!

:star: Feel free to contribute :star:
