var o = require("ospec")

exports.checkError = function checkError (err, type, line, col, ...fragments) {
  var allMatch = true
  for (var r of fragments) {
    allMatch = allMatch && r.test(err.message)
  }
  if (err.type !== type || ! allMatch) {
    throw err
  }
  o(err.pos.line).equals(line)
  o(err.pos.col).equals(col)

}
