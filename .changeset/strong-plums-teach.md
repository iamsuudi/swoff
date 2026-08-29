---
"@swoff/cli": patch
---

Generated framework adapters are now written via read-write transforms instead of brittle file copies, fixing a broken `realtime/notifications` import (mapped to `push-notification/index`), and normalizing module specifiers to each project's file extension. Also removed the unused guide generator and the dead `swoff add`/`swoff info` command surface.