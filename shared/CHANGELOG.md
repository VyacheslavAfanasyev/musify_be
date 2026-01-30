# Changelog

All notable changes to the `@app/shared` library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial version of shared library
- Types: auth, media, response, saga, social, user-profile, user
- Entities: AuthUser, User
- Schemas: Follow, MediaFile, UserProfile, UserProfileReplica
- Utils: Error utilities
- Libs: Logger, Prometheus, Tracing
- Configs: Shared configurations

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## Versioning Guide

### Semantic Versioning (SemVer)

This library follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0) - Breaking changes that require updates in consuming services
- **MINOR** version (0.X.0) - New features that are backward compatible
- **PATCH** version (0.0.X) - Bug fixes and minor changes that are backward compatible

### When to bump versions

- **PATCH (1.0.0 → 1.0.1)**: Bug fixes, typo corrections, documentation updates
- **MINOR (1.0.0 → 1.1.0)**: New types, entities, schemas, or utilities (backward compatible)
- **MAJOR (1.0.0 → 2.0.0)**: Breaking changes (removed exports, changed interfaces, renamed types)

### Examples

#### PATCH version bump
- Fix typo in interface name
- Add missing optional field to existing interface
- Fix bug in utility function

#### MINOR version bump
- Add new type definition
- Add new entity or schema
- Add new utility function
- Add optional field to existing interface

#### MAJOR version bump
- Remove exported type or interface
- Rename exported type or interface
- Change required field to optional (or vice versa) in interface
- Change function signature

