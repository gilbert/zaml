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

or

[Check out the online editor](https://gilbert.github.io/zaml/editor.html)!

## Table of Contents

- [Introduction](#introduction)
- [Syntax & Features](#features)
- [Using the JavaScript API](#javascript-api)
- [Spec](#spec)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Introduction

Zaml's syntax is clean, effective, and not obsessed with your shift key:

```js
import {parse} from 'zaml'

var schema = '{ fileRoots: { dev:list, prod:list } }'

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

(You can [run this example in your browser](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvAHkIGYA+FjAAkIBOMMAF4AOiBLEADnEQB6eQHMIxQgFcARvjpZl0TTAHF5AL2xQJnAFoWW8jJ14B5dTLeJ7HTmLQtpQrwQACbiIEJw6lDEcFb2ATCclCBwMLDUxBD0CIggAIyIAEwALCAAvhTo2Li5+ABWCFR0DEzEeABuGAK85mQAwvSMDLwivAAGvry8AMS8ACqEEHBBy7ZkAISTvJCwAEq0tDG8wFtTwTDtx6dTvAAkABLOALIAovLn7fKpAu0Q1PDXKYPZ5vD5fYgYRixNA3Xhla4BWjBK4w2F3R6veSI4JfIy-f5wAC0hUB6JBWIESPBkIBqKm8NRDImaE63Tg1EIMCwfFGAHJgNtoDB9oc5MdeB9EFAlsQKLxsVKZWU4bzfKzeKzlqMBRiXoheLz5IRaDgHNL-ry4b5iAIAJ4oqbq2huEa8NZQfDSLqpAAUvSgAxaDDl7M53LlAs1cIAlFsIlEYvgIGg0EZ7nMngAZV0AKQAys4AHL4OA25MqMC2n3O2VoKJQCiW3mxtAM6iQjk+owCaMO3jx6JwJMptMZ7Ojbv4HBwOAYJQwXwM5K6aRCgR4TQYQzkKipdKZbJ4PLFIoAdnKlRAmBweB0M+Xg1aeHKAF0qNK0ABrHKoK-VPDJucAAe+CaJSADu3z1I0IDqAI5C5FIsgKPI6hoNIn5KDoJpmBYAACAAM+AAJwke8MryIBMAgWBtCQUY0HJMQtrSDUKTUAIEDSG0ZQvmUQA)

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
# if your schema is {autoCleanup:bool}

autoCleanup true

#=> { "autoCleanup": true }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMBBXALgewMIA2MCAdhgA7IBGOOBAviADTg4YBOEMKImuhxMuQAEWdhm70gA)

### num

A `num` accepts a single numerical value.

```zaml
# if your schema is {port:num}

port 3000

#=> { "port": 3000 }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMADgewE4BdkB2ArnAL4gA04mR2EMKIWeABAMwAMXAOgSKUA)

### str

A `str` is the default type of any unspecified schema key. It accepts any character until it reaches a newline.

```zaml
# if your schema is {title} OR {title:str}

title You, Yourself, and U

#=> { "title": "You, Yourself, and U" }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMALgS3QGxgXxABpwB7AVwCcIYUQtcYACAPwHopS4Y24BPALQAHSqQBWAHQB2IfEA)

### enum

An `enum` is a [str](#str) with restricted options. It's useful for a "choose one" situation.

```zaml
# if your schema is { paymentMode: enum(test,live) }

paymentMode test

#=> { "paymentMode": "test" }
```

Naturally, if the user provides a value outside the schema, Zaml will reject it and report a readable error message.

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMADggnnGA7AFwFkB7AExmXwFc4AKAmMAgGgBsBLANxgEoBfEC3AlqAJwgwUITDnzFyMAASNmAHTwh+QA)

### kv

A `kv` is a set of key-value pairs. It requires a block.

```zaml
# if your schema is {redirects:kv}

redirects {
  /contact       /contact-us
  /profile/:user /u/:user
}

#=> { "redirects": { "/contact": "/contact-us", "/profile/:user": "/u/:user" } }
```

Please note Zaml **is not** indentation sensitive.

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMATjAJgS0xAFzGQGsA3AXxABpwB7AV3QhhRE13yIAJgAdAHbduAegh0BBBIWGzhYiVMIBaBmEHyADujoAzHABsYI5GpjpRDE2fSCKgkBSA)

### hash block

A `{}` block is a specified inner schema. It translates to a hash that only allows your specified keys.

```zaml
# if your schema is { project: { title, private:bool } }

project {
  title My Sweet App
  private true
}

#=> { "project": { "title": "My Sweet App", "private": true } }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMADgJwPYCsYQAuywhAloQDYwA0WZAbgoTMgEbbaUC+3IN4bAFdMEGChBY8BQgAJgAHQB2s2eSoxZAWQCesgMoB3GDDkBBdOmWr6TFmsxCYy7spDcgA)

You can also enhance basic types with blocks. This lets you specify cleaner config:

```zaml
# if your schema is { page|multi: str {hide:bool} }

page index.html
page wip.html {
  hide true
}

#=> { "page": [
#     ["index.html", {}],
#     ["index.html", { "hide": true }],
#   ] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABABwQcxgHzgFcAbAFwEtl0wyAndYKCgExmQCMB7LkgX3R8QAGnBcidCDBQhsedBQB2bAB4A6KGTgkAOorkx0AdwqYNWkoz3p0zNunpEYevnpB8gA)

### list

A `list` is a sequence of values. A user can write lists either inline or with a block (but not both).

```zaml
# if your schema is {tags:list} OR {tags:list(str)}

# Inline example
tags library, npm, with spaces, js

# Block example
tags {
  library
  npm
  with spaces
  js
}

#=> { "tags": ["library", "npm", "with spaces", "js"] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMALgg5mZAbASzHQF8QAacAewFcAnCGFEAYgAIBJAO0K5jZgAPBHAAOeGAB0u7TDjaEARnQR0Anmy6i4bSSADuBdFDZhRCRmD1sAVla7T2AITxUIAawHCxE6XLBswNJsCgTKqmrBmtpRhsam5pZRdtIk0iAkQA)

You can specify the type of items in your list by specifying it in parethesis. When no item type is specified, it is defaulted to `str`, resulting in `list(str)`.

```zaml
# if your schema is { fav_nums:list(num) }
fav_nums 10, 20

#=> { "fav-nums": [10, 20] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABAMwQNwPoB2ArnGMgDYCWYALgBTFwCU6AviADTgD2RAThBgoQ2fIzDoAjAAYO6AEzSAOgRCsgA)

The list item type may also be enhanced with a block. Note that you **must** specify an item type when you do!

```zaml
# if your schema is { users:list(str { admin:bool }) }

users {
  andy
  beth {
    admin true
  }
  carl
}

#=> { "users": [["andy", {}], ["beth", {admin: true}], ["carl", {}]] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABAVzDATmZAGwEswAXACnN2AQBM5iA7ZAIwHt3CBfASnW4gANOHaZcEGChDY8YdMAA6TdOgRM6AT2WrWMMlAU7Vahs3RlcmGMe7GICXIWV2mIbkA)

Note how a block changes the shape of the above parsed result. This allows you to use destructuring for each list item:

```js
var result = parse(source, schema)
for (let [user, options] of result.users) {
  //
  // `options` will be {admin: true} for beth,
  //  and undefined for andy & carl
  //
}
```

### inline-list

NOTE: THIS FEATURE IS NOT IMPLEMENTED YET

An inline list a [list](#list) that can only be written inline. This is useful when you want to extend your list with a block:

```zaml
# if your schema is { env|multi: inline-list{require|multi} }

env development, test {
  require lib-1
  require lib-2
}
env production {
  require lib-3
}

# => { "env": [
#      [["development", "test"], { "require": ["lib-1","lib-2"] }],
#      [["production"], { "require": ["lib-3"] }]
#    ]}
```

### key|req

Appending the `|req` attribute to a key will make that key requried.

```zaml
# if your schema is { access_token|req:str }

access_token abc123
```

[Open that in your browser](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABAiEZjAfQBcB7AaxgDsAfAJxgEdkxCb0BfEAGnGIFcacKEFhx4iZSpgBGEAIwAmAMwAdCiDZA) and see what happens when you remove the `access_token` line.

If you specify a `|req` within a basic-type hash block, it will make that block required.

```zaml
# if your schema is { table: str {id:enum(INT,VARCHAR)} }

# This is invalid! It requires a block
# table users

# This works
table users {
  id INT
}
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABAFwQIwDYzLpiYBO6wAlgCbIwB2ArnABQCSAcgCoA0AagEEASgGEAEsICUAX3TSQPcAHtGpCDBQgAxOi5RKYdAaP0Abgjw0AhOjaZ0pGAEdGlR4YTp8SiAGsAOvQ62Pgw6IxgMKRggYE6esYA7kqkvjH0IQThkdEUgehG1LbcgdKBINJAA)

### key|multi

Appending the `|multi` attribute to a key allows your users to specify it more than once. This is only affects [hash blocks](#hash-blocks).

```zaml
# if your schema is {project|multi:{title,type}}

project {
  title A
}
project {
  title B
  type personal
}

#=> { "project": [{ "title": "A" }, { "title": "B", "type": "personal" }] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMADgJwPYCsYQAuAPnAK4A2hAlssDYRTADSECe6MAvlyM+NjKYIMFCCx4ChAATAAOgDtp0hk2kBBRV0UT8RWYuWqY0gEKGVHE50xhsChBS2KQXIA)

`|multi` will also ensure your key is always present, even if the user does not provide any.

```zaml
# if your schema is {project|multi:{title,type}}

# (intentionally left blank)

#=> { "project": [] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMADgJwPYCsYQAuAPnAK4A2hAlssDYRTADSECe6MAvlyM+NjKYIMFCBBcgA)

### tuple

A tuple captures two or more values for a given key, separated by commas. You can specify one in the schema using parenthesis:

```zaml
# if your schema is {redirect:(num,str,str)}

redirect 302, /old, /new

#=> { "redirect": [302, "old", "new"] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMATjAJgS0xAF2QAoA7AVzgBowD0a6BKAXxCvAHtz0IYURMufAQAEAZgAMAJhEB6DgBssc0jADuAHVIhmQA)

Please note that tuples may only contain basic types (`str`, `num`, and `bool`). However, you're free to mix tuples with other features:

```zaml
# if your schema is {redirect|multi:(num,str,str){enableAt}}

redirect 301, /x, /y

redirect 302, /old, /new {
  enableAt 2020-10-10
}

#=> { "redirect": [[301, "x", "y"], [302, "/old", "/new", { "enableAt": "2020-10-10" }]] }
```

[View this example in the online editor](https://gilbert.github.io/zaml/editor.html#s=N4IgzgxgFgpgtgQxALhMABAJxgEwJbYQAuAPnAK4A2ReyAFAHblwA0YRmbHAlMDAwgBGlGAEEiAX3QSQLcAHtymCDBQhs+QkXQBmAAwBGdAHoAHiYCeAHQY2NBGMV16ATCfmUcJhjADu6YBt0dH4hEXF0F1c9AFoDWPibCRsQCSA)

### array block

A `[]` block is an array of items from a specified schema. It translates to an array of key-value tuples.

```zaml
# if your schema is {sidebar:[header,link:(str,str)]}

sidebar {
  header Site
  link Home /
  link About Us, /about

  header Account
  link Settings, /account/settings
}

#=> { "sidebar": [
#       ["header", "Site"], ["link", ["Home", "/"]], ["link", ["About Us", "/about"]],
#       ["header", "Account"], ["link", ["Settings", "/account/settings"]]
#     ] }
```

Note how a block changes the shape of the above parsed result. This allows you to use destructuring for each item:

```js
var result = parse(source, schema)
for (let [type, value] of result.sidebar) {
  //
  // `type` will be "header" or "link",
  //  whereas `value` will be a string (for header) or an array (for link).
  //
}
```

## JavaScript API

- [parse(source, schema [, parseOptions])](#parse)

### parse

The primary way you interact with Zaml is through its `parse` function. This is how you convert Zaml source to a JavaScript data structure.

`parse` takes two, maybe three arguments:

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

### caseInsensitiveKeys

Setting this to `true` will allow users to write their config keys in a case-insensitive manner.

### caseInsensitiveEnums

Setting this to `true` will allow users to write [enum](#enum) values in any case.

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

- New regular expression type
- Allow inline `kv`?
- Allow blocks on `kv`
- New `json` type for arbitrarily-nested json-like data?
- Multiline strings? `text` type?
- Split `num` into `int` and `float`?
- Pluggable validation?
- Default values for tuple types?
- Command line interface?

Regarding the [online editor](https://gilbert.github.io/zaml/editor.html):

- `Get code` button
- Fancy explanations of schema on hover

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
