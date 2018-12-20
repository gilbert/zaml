var o = require("ospec")
var {checkError} = require('./helpers')
var {parse} = require('../dist/index.js')

o.spec("Parse Errors", function () {
  o("duplicate keys", function () {
    try {
      parse(`
        title x
        title x
      `, '{title}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 3, 9, /duplicate key/i, /title/)
    }
  })

  o("boolean values", function () {
    try {
      parse(`
        admin x
      `, '{admin:bool}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 15, /invalid/i, /x/, /true/, /false/)
    }
  })

  o("NaN", function () {
    try {
      parse(`count nope`, '{count:num}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 1, 7, /invalid num/i, /nope/)
    }
  })

  o("list no block", function () {
    try {
      parse(`
        tags {
          x
          foo {
            bar true
          }
        }
      `, '{tags:list}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 4, 15, /block/i, /foo/)
    }
  })

  o("basic type no block", function () {
    try {
      parse(`
        foo {
          title I don't accept a block
        }`, '{foo}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 13, /block/i, /foo/)
    }
    try {
      parse(`
        foo {
          title I don't accept a block
        }`, '{foo:num}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 13, /block/i, /foo/)
    }
    try {
      parse(`
        foo {
          title I don't accept a block
        }`, '{foo:bool}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 13, /foo/i, /requires a value/)
    }
  })

  o("tuple no block", function () {
    try {
      parse(`
        foo x, y {
          not valid
        }
      `, '{foo:(str,str)}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 18, /block/i, /foo/)
    }
  })

  o("too few tuple args", function () {
    try {
      parse(`
        foo x, y
      `, '{foo:(str,str,str)}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 9, /incorrect number/i, /arguments/i, /foo/, /str, str, str/)
    }
  })

  o("too many tuple args", function () {
    try {
      parse(`
        foo x, y, z
      `, '{foo:(str,str)}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 19, /too many/i, /arguments/i, /foo/, /str str/)
    }
  })

  o("missing end bracket", function () {
    try {
      parse('oops {', '{oops:{inner}}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 7, /missing end bracket/i)
    }
  })

  o("character after quoted string", function () {
    try {
      parse('tags one, "two" three', '{tags:list}')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 17, /unexpected/i, /"t"/, /forget/i, /comma/i)
    }
  })

  o("failOnUndefinedVars when vars is not set", function () {})
  o("accurate tuple boolean error", function () {})
})
