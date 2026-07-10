# Security Policy

## Supported versions

Security fixes are applied to the latest code on the `main` branch.

| Version       | Supported |
| ------------- | --------- |
| latest `main` | yes       |
| older commits | no        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report security issues privately by opening a
[GitHub Security Advisory](https://github.com/phaethix/polished-arcade-shooter/security/advisories/new)
or contacting the repository maintainer directly.

Include as much detail as possible:

- A description of the issue and its potential impact
- Steps to reproduce
- Affected files, endpoints, or user flows
- Any suggested fix, if you have one

You should receive an acknowledgment within a reasonable timeframe. We will
investigate valid reports and publish fixes when appropriate.

## Scope

This project is a client-side browser game. Reports are in scope when they
demonstrate a realistic security impact such as:

- Cross-site scripting through untrusted input handling
- Unsafe use of browser storage or permissions
- Dependency vulnerabilities with a practical exploit path in this app

Gameplay balance issues, cheat requests, and general bug reports should use the
regular issue templates instead.
