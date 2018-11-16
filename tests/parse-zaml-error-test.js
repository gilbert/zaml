var o = require("ospec")
var {parse} = require('../index.js')

o("boolean values", function () {
  try {
    var result = parse(`
      admin x
    `, {
      admin: 'bool'
    })
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 2, 13, /invalid/i, /x/, /true/, /false/)
  }
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
