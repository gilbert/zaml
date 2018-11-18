# Example: package.json

If npm used Zaml instead of JSON:

```zaml
name zaml
version 1.0.0
description Fast, type-checked, zero-dep configuration.
main index.js
scripts {
  start tsc --watch
  test ospec
}
keywords config parser
author Gilbert
license ISC
devDependencies {
  ospec ^3.0.1
  typescript ^3.1.6
}
```

with a schema of:

```
name, version, description,
main, author, license,
scripts:kv,
keywords:list,
devDependencies:kv
```

Compared to:

```json
{
  "name": "zaml",
  "version": "1.0.0",
  "description": "Fast, type-checked, zero-dep configuration.",
  "main": "index.js",
  "scripts": {
    "start": "tsc --watch",
    "test": "ospec"
  },
  "keywords": ["config", "parser"],
  "author": "Gilbert",
  "license": "ISC",
  "devDependencies": {
    "ospec": "^3.0.1",
    "typescript": "^3.1.6"
  }
}

```
