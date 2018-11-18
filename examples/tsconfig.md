# Example: tsconfig.json

If TypeScript used Zaml instead of JSON:

```zaml
compilerOptions {
  target es2017
  module commonjs
  jsx preserve
  outDir ./dist
  strict true
  # etc.
}
include src/**/*
exclude {
  node_modules
  **/*.spec.ts
}
```

with a schema of:

```
compilerOptions {
  target, module, jsx, outDir,
  strict:bool
}
include:list
exclude:list
```

Compared to:

```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "jsx": "preserve",
    "outDir": "./dist",
    "strict": true,
    /* etc. */
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts"
  ]
}
```
