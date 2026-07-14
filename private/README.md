# Vaenyx Private Folder

This folder is the default home for local private instance files.

Do not commit the contents of this folder. Git tracks only this README.

Expected private subfolders:

- `data/` - local SQLite database and runtime files
- `backups/` - local backup snapshots
- `logs/` - local server logs
- `exports/` - future private transfer or export files
- `project-memory/` - owner-specific architecture, roadmap, decisions, and
  Codex handoff notes

For old installations, Vaenyx may still use the legacy `data/` folder if it
already contains `vaenyx.db` and `private/data/vaenyx.db` does not exist.
