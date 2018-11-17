var o = require("ospec")
var {parseSchema: p} = require('../schema')

o.spec("Schema parsing", function () {

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
    o(p('user:{name,score:num}')).deepEquals({
      user: { name: 'str', score: 'num' }
    })
  })

  o("list namespace", function () {
    o(p('users:list{admin:bool}')).deepEquals({
      users: ['list', { admin: 'bool' }]
    })
  })

  o("key attrs", function () {
    o(p('user|multi:{name}')).deepEquals({
      'user|multi': { name: 'str' }
    })
  })

  o("tuple", function () {
    o(p('redirect:(num,str,str)')).deepEquals({
      'redirect': ['num','str','str']
    })
  })

  o("tuple namespace", function () {
    o(p('redirect:(num,str,str){enabled}')).deepEquals({
      'redirect': ['num','str','str', { enabled: 'str' }]
    })
  })
})
