var o = require("ospec")
var {parse,parseSchema} = require('../dist/index.js')
var {checkError} = require('./helpers')

o.spec("Regression tests", function () {

  o("bool and newline", function () {
    var result = parse('x true\n', 'x:bool')
    o(result).deepEquals({ x: true })
  })

  o("bool and newline", function () {
    var result = parseSchema('task|multi:{name,meta:kv},title')
    o(result).deepEquals({
      "task|multi": {
        name: 'str',
        meta: 'kv',
      },
      title: 'str'
    })
  })
})
