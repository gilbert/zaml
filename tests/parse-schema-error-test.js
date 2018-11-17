var o = require("ospec")
var {checkError} = require('./helpers')
var {parseSchema: p} = require('../schema')

o.spec("Schema Parse Errors", function () {
  o("namespace brackets without a colon", function () {
    try {
      p(`project{name}`)
      o("Should not be successful").equals(false)
    }
    catch (err) {
      checkError(err, 'syntax-error', 1, 8, /unexpected/i, /forget/i, /colon/i)
    }
  })
})
