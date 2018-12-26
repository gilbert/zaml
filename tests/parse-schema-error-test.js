var o = require("ospec")
var {checkError} = require('./helpers')
var {parseSchema: p} = require('../dist/src/schema')

o.spec("Schema Parse Errors", function () {

  o("starting character", function () {
    try {
      p('  i:num')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 3, /must begin with/i, /hash block/i, /array block/i, /"\{"/, /"\["/)
    }
  })

  o("unrecognized types", function () {
    try {
      p('{users:idontexist}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 8, /no such type/i, /idontexist/)
    }
  })

  o("whitespace", function () {
    try {
      p('{one two}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 6, /unexpected "t"/i)
    }
  })

  o("block bracket without a colon", function () {
    try {
      p(`{project{name}}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 9, /unexpected "{"/i, /forget/i, /colon/i)
    }
  })

  o("array bracket without a colon", function () {
    try {
      p(`{project[name]}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 9, /unexpected "\["/i, /forget/i, /colon/i)
    }
  })

  o("tuple parens without a colon", function () {
    try {
      p(`{project(str,str)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 9, /unexpected "\("/i, /forget/i, /colon/i)
    }
  })

  o("invalid tuple types", function () {
    try {
      p(`{project:(str,kv)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 15, /invalid tuple type/i, /'kv'/i)
    }
    try {
      p(`{project:(str,list)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 15, /invalid tuple type/i, /'list'/i)
    }
  })

  o("empty and single-member tuples", function () {
    try {
      p(`{project:()}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 10, /requires at least two/i)
    }
    try {
      p(`{project:(str)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 10, /requires at least two/i)
    }
  })

  o("tuple type block", function () {
    try {
      p(`{project:(str{})}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 14, /unexpected/i, /block/i, /not allowed/i)
    }
  })

  o("tuple types no separator", function () {
    try {
      p(`{project:(str str)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 15, /unexpected/i, /s/i, /forget/i, /comma/i)
    }
  })

  o("missing tuple paren", function () {
    try {
      p(`{project:(num,bool}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 19, /unexpected/i, /"\}"/i,)
    }
  })

  o("enum no paren", function () {
    try {
      p(`{thing:enum}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 12, /unexpected/i, /"\}"/i, /enum/i)
    }
  })

  o("enum with invalid char", function () {
    try {
      p(`{thing:enum(a,b(c)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 16, /unexpected/i, /"\("/i, /enum/i)
    }
  })

  o("enum with no options", function () {
    try {
      p(`{thing:enum()}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 8, /at least one/i, /enum/i)
    }
  })

  o("enum extra parens", function () {
    try {
      p(`{thing:enum(abc(d),e)}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 16, /unexpected/i, /"\("/)
    }
  })

  o("missing end bracket", function () {
    try {
      p(`{user:{\n  }`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 1, /missing/i, /"\}"/i,)
    }
  })

  o("duplicate key definitions", function () {
    try {
      p(`{x,y,x}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 6, /duplicate/i, /"x"/i,)
    }
  })
})
