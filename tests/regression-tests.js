var o = require("ospec")
var {parse} = require('../dist/index.js')

o.spec("Regression tests", function () {

  o("bool and newline", function () {
    var result = parse('x true\n', 'x:bool')
    o(result.x).equals(true)
  })
})
