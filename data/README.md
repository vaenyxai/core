# Legacy Private Instance Data

This directory is the legacy location for an installed Vaenyx Instance's private
data.

Runtime files in this directory are ignored by Git and must never be committed.

New installations use `private/data/` by default. Existing installations that
already have `data/vaenyx.db` remain supported so Vaenyx does not accidentally
start with an empty database.

Legacy runtime files may include:

- `vaenyx.db`: private SQLite instance database
- `vaenyx.pid`: production process identifier while Vaenyx is running

Backups now default to `private/backups/`. Legacy backups in `backups/` remain
restorable.
