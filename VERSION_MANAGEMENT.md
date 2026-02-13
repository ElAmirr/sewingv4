# Version Management Guide

## How to Release a New Version

To release a new version of the Sewing Monitor application with auto-update:

### 1. Update Version Number

Edit `package.json` and increment the version number following [Semantic Versioning](https://semver.org/):

```json
{
  "version": "1.0.1"  // Change this to your new version
}
```

**Version Format:** `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

### 2. Commit and Push

```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git push origin main
```

### 3. Automatic Build and Release

GitHub Actions will automatically:
1. Build the Electron app
2. Create a GitHub release with tag `v1.0.1`
3. Upload the installer (`.exe`) and update manifest (`latest.yml`)

### 4. Client Auto-Update

Installed apps will:
1. Check for updates on startup (after 10 seconds)
2. Check for updates every 4 hours
3. Download updates in the background
4. Notify users when update is ready
5. Install update on next app restart

## Important Notes

- **Always increment the version** before pushing updates
- The version in `package.json` must be higher than the previous release
- Updates only work in production builds, not in development mode
- The `latest.yml` file is critical for auto-updates - don't delete it from releases

## Checking Update Status

Check the app logs at: `%APPDATA%/SewingMonitor/app.log`

Look for lines starting with `[AutoUpdater]` to see update status.
