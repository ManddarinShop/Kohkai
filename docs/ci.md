# Kohkai CI and release

Kohkai is the standalone package repository for the runtime-neutral
serialization contract used by Hikoutei and other runtimes.

- GitHub repository: `ManddarinShop/Kohkai`
- npm package: `@hikoutei/kohkai`
- Package versioning: reviewed manifest changes
- Package release tag: `vX.Y.Z`
- npm channel: `latest`

The npm scope is lowercase even though the GitHub repository is named
`Kohkai`.

## CI

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`. It
checks:

- TypeScript source and test typechecks
- package unit, malformed-input, golden-vector, and Apps Script parity tests
- production build
- runtime-neutral source boundary
- npm tarball contents
- an installed packed-consumer smoke test

The package tarball contains only `dist/`, `README.md`, and `LICENSE`. Source,
tests, fixtures, and Apps Script mirror files remain repository-only.

## Release

`.github/workflows/publish.yml` is triggered only by a numeric tag matching the
package version:

```text
package.json 0.1.0
        ↓
git tag v0.1.0
        ↓
@hikoutei/kohkai@0.1.0 → npm latest
```

The workflow verifies the tag, reruns the full checks, creates and checksums a
single package artifact, and publishes that exact artifact with npm provenance.
The package is immutable on npm; reusing an existing version fails rather than
replacing it.

The repository requires an `NPM_TOKEN` Actions secret with permission to publish
the public `@hikoutei` scope. Kohkai does not use a `RELEASE_TOKEN`: it does not
automatically commit versions or create tags from another branch.

## Hikoutei integration order

Hikoutei consumes an exact published version rather than a workspace link:

```json
{
  "dependencies": {
    "@hikoutei/kohkai": "0.1.0"
  }
}
```

The first integration release must follow this order:

1. Merge and verify the Kohkai package changes.
2. Push `v0.1.0` and publish `@hikoutei/kohkai@0.1.0`.
3. Merge Hikoutei's dependency integration PR.
4. Allow Hikoutei's `develop` workflow to produce its next patch release.

Publishing Kohkai first is required because Hikoutei's release verification
checks that the exact declared dependency is available on npm.

Apps Script cannot import an npm package at runtime. `apps-script/KohkaiCodec.gs`
is therefore a self-contained mirror. Hikoutei's gateway keeps its own
Hikoutei-specific source and validates its output against the same stable
vectors and protocol contract.
