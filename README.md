[![npm](https://img.shields.io/npm/v/zaml.svg)](https://www.npmjs.com/package/zaml)
[![Build Status](https://travis-ci.org/gilbert/zaml.svg?branch=master)](https://travis-ci.org/gilbert/zaml)

# Zaml – The Final Form of Configuration Files

JSON is tedious to type for humans. YAML is [error-prone and hard to parse](https://arp242.net/weblog/yaml_probably_not_so_great_after_all.html). TOML is verbose for nested data structures.

Enter Zaml.

Zaml is the [final form](https://youtu.be/zGdFXUJ1o1U?t=4m17s) of configuration files. It's a zero-dependency, type-checking machine that points out your errors as graceful as a dove. It takes the pain out of your gain.

Never again deal with the boilerplate of validating config data structures. Make config easier for you *and* your users.

Zaml isn't even an ancronym. That's how good it is.

## Install

    npm install zaml

or

    yarn add zaml

or check out [the online editor](https://gilbert.github.io/zaml/editor.html)!

## Table of Contents

- [Introduction](#introduction)
- [Syntax & Features](#features)
- [Using the JavaScript API](#javascript-api)
- [Spec](#spec)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Introduction

Zaml's syntax is inspired by [NGINX's conf format](https://nginx.org/en/docs/beginners_guide.html#conf_structure). Clean, effective, and not obsessed with your shift key:

```js
import {parse} from 'zaml'

var schema = 'fileRoots:{dev:list,prod:list}'

var zamlContent = `

  # This is Zaml!
  # You'd probably load this from a file instead.

  fileRoots {
    dev {
      $HOME/dev/services
      $HOME/dev/states
    }
    prod {
      $HOME/prod/services-2
      $HOME/prod/states
    }
  }
`

var result = parse(zamlContent, schema, { vars: process.env })
console.log("Got result:", result)
```

(You can [run this example in your browser](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvAHkIGYA+FjAAkIBOMMAF4AOiBLEADnEQB6eQHMIxQgFcARvjpZl0TTAHF5AL2xQJnAFoWW8jJ14B5dTLeJ7HTmLQtpQrwQACbiIEJw6lDEcFb2ATCclCBwMLDUxBD0CIggAIyIAEwALCAAvhTo2Li5+ABWCFR0DEzEeABuGAK85mQAwvSMDLwivAAGvry8AMS8ACqEEHBBy7ZkAISTvJCwAEq0tDG8wFtTwTDtx6dTvAAkABLOALIAovLn7fKpAu0Q1PDXKYPZ5vD5fYgYRixNA3Xhla4BWjBK4w2F3R6veSI4JfIy-f5wAC0hUB6JBWIESPBkIBqKm8NRDImaE63Tg1EIMCwfFGAHIdjB9oc5MAPogoEtiBRseLJWVeb5WbxWctRsBeBiXoheLz5IRaDgHBL-ry4b5iAIAJ4oqZK2huEa8NZQfDSLqpAAUvSgAxaDAovHZnO5AfVKrhAEothEojF8BA0GgjPc5k8ADKOgBSAGVnAA5fBwC0JlRgS0e+1StBRKAUU28qNoBnUSEcj1GAQRm28GPRODxxPJ1MZ0Yd-A4OBwDBKGC+BnJXTSaBGPCaDCGchUVLpTLZPAFPIAdnKlRAmBweB0k4Xg1aeHKAF0qBK0ABrHKoM-VPAJ84AD3wTRKQAd2+epGhAdQBHIXIpFkBR5HUNBpFfJQdANMwLAAAQABnwABOfBCneSV5F-GAAKA2hQKMcDkmIS1pBqFJqAECBpDaMoHzKIA))

Parsing the above will result in this data structure:

```json
{
  "fileRoots": {
    "dev": [
      "/home/alice/dev/services",
      "/home/alice/dev/states"
    ],
    "prod": [
      "/home/alice/prod/services-2",
      "/home/alice/prod/states"
    ]
  }
}
```

No quotes, no commas, no colons. Only what you need and nothing else.

Your users also get nice, accurate error messages if they make a mistake writing their config. It's a win-win!

### More Examples

See the [examples/](./examples) folder for more complete syntax & schema examples like the above.

## Features

Here are Zaml's features, each with an example use, from simplest to most complex.

### Comments

A comment is any line that **begins** with `#`

```zaml
# I am a comment
# title This is a comment
title This is # not a comment
```

### bool

A `bool` accepts `true` or `false`

```zaml
# schema = autoCleanup:bool
autoCleanup true

#=> { "autoCleanup": bool }
```

### num

A `num` accepts a single numerical value.

```zaml
# schema = port:num
port 3000

#=> { "port": 3000 }
```

### str

A `str` is the default type of any unspecified schema key.

```zaml
# schema = title OR title:str
title ~/home/my-proj

#=> { "title": "~/home/my-proj" }
```

### kv

A `kv` is a set of key-value pairs. It requires a block.

```zaml
# schema = redirects:kv
redirects {
  /contact       /contact-us
  /profile/:user /u/:user
}

#=> { "redirects": { "/contact": "/contact-us", "/profile/:user": "/u/:user" } }
```

Please note Zaml **is not** indentation sensitive.

### block

A block is a specified inner schema. It translates to a hash that only allows your specified keys.

```zaml
# schema = project:{title,private:bool}
project {
  title My Sweet App
  private true
}

#=> { "project": { "title": "My Sweet App", "private": true } }
```

### list

A `list` is *always* sequence of `str`. A user can write lists either inline or with a block (but not both).

```zaml
# schema = tags:list

# Inline example
tags library npm "with spaces" js

# Block example
tags {
  library
  npm
  with spaces
  js
}

#=> { "tags": ["library", "npm", "with spaces", "js"] }
```

You can also enhance your list by making a [block](#block) available to each `str`.

```zaml
# schema = users:list{admin:bool}
users {
  andy@xx.com
  beth@yy.com {
    admin true
  }
  carl@zz.com
}

#=> { "users": [["andy"], ["beth", {admin: true}], ["carl"]] }
```

Note how a block changes the shape of the above parsed result. This allows you to use destructuring for each result:

```js
var result = parse(source, schema)
for (let [user, options] of result.users) {
  //
  // `options` will be {admin: true} for beth,
  //  and undefined for andy & carl
  //
}
```

### key|list

NOTE: THIS FEATURE IS NOT IMPLEMENTED YET

If you use `list` as a key attribute instead of a type, your schema will accept an arbitrary number of inline arguments AND a [block](#block).

```zaml
# schema = when|list{include|multi}

when development test {
  include lib/profiler.js
  include linter.js
}

#=> { "when": [["development", "test"], { include: ["lib/profiler.js", "linter.js"] }] }
```

Note that a [block](#block) the only valid type when using the `|list` attribute.

### key|multi

Appending the `|multi` attribute to a key allows your users to specify it more than once.

```zaml
# schema = project|multi:{title,type}
project {
  title A
}
project {
  title B
  type personal
}

#=> { "project": [{ "title": "A" }, { "title": "B", "type": "personal" }] }
```

It will also guarantee your key is always present, even if the user does not provide any.

```zaml
# schema = project|multi:{title,type}

# (intentionally left blank)

#=> { "project": [] }
```

### tuple

A tuple captures two or more values for a given key. You can specify one with parenthesis:

```zaml
# schema = redirect:(num,str,str)

redirect 302 /old /new

#=> { "redirect": [302, "old", "new"] }
```

Please note that tuples may only contain basic types (`str`, `num`, and `bool`). However, you're free to mix tuples with other features:

```zaml
# schema = redirect|multi:(num,str,str){enableAt}

redirect 301 /x /y

redirect 302 /old /new {
  enableAt 2020-10-10
}

#=> { "redirect": [[301, "x", "y"], [302, "/old", "/new", { "enableAt": "2020-10-10" }]] }
```

## JavaScript API

- [parse(source, schema [, parseOptions])](#parse)

### parse

The primary way you interact with Zaml is through its `parse` function. This is how you convert Zaml source to a JavaScript data structure.

`port` takes two, maybe three arguments:

1. The Zaml source code (as a string)
2. A schema to parse with (as a string)
3. [Options to enable extra features](#parse-options) (optional parameter)

Here's a full example that includes reading from the file system. Assuming you have the following `my-config.zaml`:

```zaml
host www.example.com
port 443
disallow /admin
disallow /dashboard
```

You can parse the above with this node.js code:

```js
var fs = require('fs')
var zaml = require('zaml')

var source = fs.readFileSync(__dirname + '/my-config.zaml')
var result = zaml.parse(source, 'host,port:num,disallow|multi')
result
//=> { "host": "www.example.com", "port": 443, "disallow": ["/admin", "/dashboard"] }
```

## Parse Options

parseOptions, the third parameter to `parse()`, has the following options:

### vars

Type: `Record<string,string>`

Each key-value in the provided `vars` object will be made available for users to interpolate using the `$` operator. Example:

```js
let source = `
  title Welcome to $APP_NAME
`
zaml.parse(source, 'title:str', {
  vars: { APP_NAME: 'My App' }
})
//=> { "title": "Welcome to My App" }
```

Note that you can easily use this feature to provide the user access to their own environment variables in a node.js environment:

```js
zaml.parse(source, 'title:str', {
  vars: process.env
})
```

### failOnUndefinedVars

If `vars` is set, then setting `failOnUndefinedVars` to `true` will ensure users cannot use variables that are not defined. This is useful if you want to e.g. ensure a key is always defined:

```js
let source = `
  title Welcome to $iDontExist
`
//
// This will throw an error!
//
zaml.parse(source, 'title:str', {
  vars: { anyOtherKey: '' },
  failOnUndefinedVars: true,
})
```

## Spec

Zaml has not yet reached 1.0, so there is no spec as of yet. However, here's a rough ABNF grammar for the lexer:

```
line = statement | comment
statement = key rest ["{\n" *statement "}"] "\n"

key = string-with-no-whitespace
rest = string-with-no-newlines

comment = "#" rest ("\n" | EOF)
```

After lexing, the parser uses the schema to determine how to parse the `rest` and `*statement` for each statement.

## Roadmap

- Allow inline `kv`
- Enhanced `kv` type for arbitrarily-nested arbitrary data?
- Multiline strings? `text` type?
- Split `num` into `int` and `float`?
- Pluggable validation?
- Default values for tuple types?
- Required fields?
- Command line interface?

## Contributing

Interested in contributing? There are several ways you can help:

- Open or discuss an issue for an item on the roadmap
- Implement Zaml in another programming language
- Report any bugs you come across
- Report a behavior that you think *should* be bug
- Help start a spec!

## Developing

```
npm install
npm start # In a separate terminal
npm test
```
