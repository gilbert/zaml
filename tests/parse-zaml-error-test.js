var o = require("ospec")
var {checkError} = require('./helpers')
var {parse} = require('../dist/index.js')

o.spec("Errors", function () {
  o("duplicate keys", function () {})

  o("boolean values", function () {
    try {
      parse(`
        admin x
      `, {
        admin: 'bool'
      })
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 2, 15, /invalid/i, /x/, /true/, /false/)
    }
  })

  o("NaN", function () {})

  o("excess boolean values", function () {})
  o("excess number values", function () {})

  o("str no block", function () {})

  o("lists no block", function () {
    try {
      parse(`
        tags {
          x
          foo {
            bar true
          }
        }
      `, {
        tags: 'list'
      })
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'user-error', 4, 15, /block/i, /foo/)
    }
  })

  o("tuple no block", function () {})

  o("missing end bracket", function () {})
  o("failOnUndefinedVars when vars is not set", function () {})
  o("incorrect number of tuple args", function () {})
  o("accurate tuple boolean error", function () {})
})
