# Security Policy

## Supported versions

We release security updates for the current minor version. Upgrade to the latest release to get fixes.

## Reporting a vulnerability

If you discover a security issue, please report it privately:

- **Do not** open a public GitHub issue for security vulnerabilities.
- Send a description and steps to reproduce to the maintainers (e.g. via GitHub Security Advisories: **Security** → **Advisories** → **Report a vulnerability** for this repository), or another contact method listed in the repo.

We will acknowledge your report and work on a fix. We may credit you in the advisory unless you prefer to stay anonymous.

## Security considerations for deployment

- Set **`GATEKEEPER_SIGNING_SECRET`** in production to a strong, random value (not the default).
- Run the gateway behind HTTPS and restrict access (firewall, auth) as needed.
- Do not commit `.env` or any file containing secrets; use environment variables or a secrets manager.
