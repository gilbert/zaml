var o = require("ospec")
var {parse} = require('../index.js')

o.spec("Errors", function () {
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

  o("lists without namespaces", function () {
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
})

function checkError (err, type, line, col, ...fragments) {
  if (err.type !== type) {
    throw err
  }
  o(err.pos.line).equals(line)
  o(err.pos.col).equals(col)

  for (var r of fragments) {
    o(r.test(err.message)).equals(true)
  }
}
