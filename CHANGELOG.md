# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v2

### Added

- Way to use escaped or unescaped regular expressions.
- Ability to omit the `include` and `exclude` inputs and cache `all` changed files.
- Automatic escaping of special characters in the regular expressions.
- Info about regexp escaping in the project ReadMe.
- Tests for the regexp escaping mechanism.

### Changed

- Set regular expressions to optional Action inputs.
- Simplified unit test for `DiffCache.diff` method.

### Removed

- Unnecessary steps in CI/CD workflows.

## v1

### Added

- CHANGELOG and ReadMe contents.
- Linting configs for ESLint and Markdown Lint.
- TypeScript support (+ Babel).
- Unit tests for caching and workflow file access.
- Workflows for unit-testing, linting and vulnerabilities checking.
- Way of accessing contents of workflow file that triggered the action.
- Caching mechanism for files that were changed but not checked.
- Set up the structure of the project via JS Action template from GitHub.
