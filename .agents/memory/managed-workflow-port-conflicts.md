---
name: Managed workflow port conflicts
description: How to diagnose artifact workflow restarts that fail because a port is already occupied.
---

When a managed API or web workflow reports `EADDRINUSE`, an older Node child process can still be holding the assigned port while the app remains reachable through the shared preview proxy.

**Why:** A workflow restart did not stop the old service processes; after confirming their exact commands, stopping only those stale processes allowed the managed workflows to restart cleanly.

**How to apply:** Check workflow logs, assigned-port responses, and process commands before retrying. Stop only verified stale processes for the affected artifact, then restart its managed workflow once.
