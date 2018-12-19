var o = require("ospec")
var {parse,parseSchema} = require('../dist/index.js')
var {checkError} = require('./helpers')

o.spec("Regression tests", function () {

  o("bool and newline", function () {
    var result = parse('x true\n', '{x:bool}')
    o(result).deepEquals({ x: true })
  })

  o("schema type name after bracket", function () {
    var result = parseSchema('{task|multi:{name,meta:kv},title}')
    o(result).deepEquals({
      type: 'hash',
      schema: {
        task: {
          type: 'hash',
          multi: true,
          schema: { name:{type:'str'}, meta:{type:'kv'} }
        },
        title: {type:'str'}
      }
    })
  })
})
