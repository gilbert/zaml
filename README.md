# Zaml – The Final Form of Configuration Files

JSON is tedious to type for humans. YAML is error-prone and hard to parse. TOML is verbose for nested data structures.

Enter Zaml.

Zaml is the [final form](https://youtu.be/zGdFXUJ1o1U?t=4m17s) of configuration files. It's a zero-dependency, type-checking machine. It takes the pain out of your gain.

Never again deal with the boilerplate of validating config data structures. Make config easier for you *and* your users.

Zaml isn't even an ancronym. That's how good it is.

## Introduction

**NOTE: ZAML IS STILL IN ITS TRANSFORMATION SEQUENCE.** THESE DOCS ARE NOT FULLY FUNCTIONAL. Check the [tests](./tests) for current progress.

Zaml's syntax is inspired by [NGINX's conf format](https://nginx.org/en/docs/beginners_guide.html#conf_structure). Clean, effective, and not obsessed with your shift key:

```js
import {parse} = from 'zaml'

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

A comment is any line that **begins** with `#`

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

### num

A `num` accepts a single numerical value.

```
# schema = port:num
port 3000

#=> { "port": 3000 }
```

### str

A `str` is the default type of any unspecified schema key.

```
# schema = title OR title:str
title ~/home/my-proj

#=> { "title": "~/home/my-proj" }
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

Please note Zaml **is not** indentation sensitive.

### list

A `list` is *always* sequence of `str`. A user can write lists either inline or with a block (but not both).

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

You can also enhance your list by making a [namespace](#namespace) available to each `str`.

```
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

Note how a namespace changes the shape of the above parsed result. This allows you to use destructuring for each result:

```js
var result = parse(source, schema)
for (let [user, options] of result.users) {
  //
  // `options` will be {admin: true} for beth,
  //  and undefined for andy & carl
  //
}
```

### namespace

A namespace is a specified inner schema. It translates to a hash that only allows your specified keys.

```
# schema = project:{title,tags:list}
project {
  title My Sweet App
  tags js npm zaml
}

#=> { "project": { "title": "My Sweet App", "tags": ["js", "npm", "zaml"] } }
```

### key|multi

Appending the `|multi` attribute to a key allows your users to specify it more than once.

```
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

```
# schema = project|multi:{title,type}

# (intentionally left blank)

#=> { "project": [] }
```

## Roadmap

- Discuss solution for multiline strings

## Developing

```
npm install
npm start # In a separate terminal
npm test
```
