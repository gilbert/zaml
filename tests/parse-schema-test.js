var o = require("ospec")
var {parseSchema: p} = require('../schema')

o("default string", function () {
  o(p('x,y,z')).deepEquals({
    x: 'str', y: 'str', z: 'str'
  })
})

o("basic", function () {
  o(p('a:str,b:bool, c: list , d :num, s')).deepEquals({
    a: 'str', b: 'bool', c: 'list', d: 'num', s: 'str'
  })
})

o("namespace", function () {
  o(p('user{name,score:num}')).deepEquals({
    user: { name: 'str', score: 'num' }
  })
})

o("list namespace", function () {
  o(p('users:list{admin:bool}')).deepEquals({
    users: ['list', { admin: 'bool' }]
  })
})

o("key attrs", function () {
  o(p('user|multi{name}')).deepEquals({
    'user|multi': { name: 'str' }
  })
})

o.spec("Type checking", function () {

  o("Throws on unrecognized types", function () {
    try {
      p('users:nope')
      o("Should not be successful").equals(false)
    }
    catch (err) {
      o(/No such type/i.test(err.message)).equals(true)
      o(/nope/i.test(err.message)).equals(true)

      o(err.type).equals('user-error')
      o(err.pos.line).equals(1)
      o(err.pos.col).equals(7)
    }
  })
})
