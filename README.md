# Zaml – The Final Form of Configuration Files

JSON is tedious to type for humans. YAML is error-prone and hard to parse. TOML is verbose for nested data structures.

Enter Zaml.

Zaml is the [final form](https://youtu.be/zGdFXUJ1o1U?t=4m17s) of configuration files. It's a zero-dependency, type-checking machine. It takes the pain out of your gain.

Never again deal with the boilerplate of validating config data structures. Make config easier for you *and* your users.

Zaml isn't even an ancronym. That's how good it is.

## Introduction

**NOTE: ZAML IS STILL IN ITS TRANSFORMATION SEQUENCE.** THESE DOCS ARE NOT FULLY FUNCTIONAL. Check the [tests](./tests/index.js) for current progress.

Zaml's syntax is inspired by [NGINX's conf format](https://nginx.org/en/docs/beginners_guide.html#conf_structure). Clean, effective, and not obsessed with your shift key:

```js
import {parse} = from 'zaml'

var schema = 'fileRoots{dev:list,prod:list}'

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

var result = parse(zamlContent, { vars: process.env }, schema)
```

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

Your users also get nice, accurate error messages if they make a mistake writing their config.

## Features

Here are Zaml's features and examples, from simplest to most complex.

### Comments

A comment is any line that begins with `#`

```
# I am a comment
# title This is a comment
title This is # not a comment
```

### bool

A `bool` accepts `true` or `false`

```
# schema = autoCleanup:bool
autoCleanup true

#=> { "autoCleanup": bool }
```

### str

A `str` is the default type of any unspecified schema.

```
# schema = title OR title:str
title ~/home/my-proj

#=> { title: "~/home/my-proj" }
```

### list

A `list` is *always* list of strings. List items can either be inline or within a block.

```
# schema = tags:list
# Inline example
tags library npm js

# Block example
tags {
  library
  npm
  js
}

#=> { "tags": ["library", "npm", "js"] }
```

Although a list is always a list of strings, you can attach an optional sub-[namespace](#namespace) to the list item schema:

```
# schema = users:list{admin:bool}
users {
  andy
  beth {
    admin true
  }
  carl
}
```

### kv

A `kv` is a set of key-value pairs. It requires a block.

```
# schema = redirects:kv
redirects {
  /contact       /contact-us
  /profile/:user /u/:user
}

#=> { "redirects": { "/contact": "/contact-us", "/profile/:user": "/" } }
```

### namespace

A namespace is a specified inner schema. It translates to a restricted hash.

```
# schema = project{title,tags:list}
project {
  title My Sweet App
  tags js npm zaml
}

#=> { "project": { "title": "My Sweet App", "tags": ["js", "npm", "zaml"] } }
```

### key|multi

Appending the `|multi` attribute to a key allows your users to specify it more than once.

```
# schema = project|multi{title,type}
project {
  title A
}
project {
  title B
  type personal
}

#=> { "project": [{ "title": "A" }, { "title": "B", "type": "personal" }] }
```

It will also make your key always present, even if the user did not specify it.

```
# schema = project|multi{title,type}

# (intentionally left blank)

#=> { "project": [] }
```

## Developing

```
npm install
npm start # In a separate terminal
npm test
```
