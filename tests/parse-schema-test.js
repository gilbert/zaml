var o = require("ospec")
var {parseSchema: p} = require('../dist/src/schema')

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

  o("block", function () {
    o(p('user:{name,score:num}')).deepEquals({
      user: { name: 'str', score: 'num' }
    })
  })

  o("array block", function () {
    o(p('user:[name,score:num]')).deepEquals({
      'user': { '@type': 'array', schema: { name: 'str', score: 'num' } }
    })
  })

  o("empty block", function () {
    o(p('user:{}')).deepEquals({
      user: {}
    })
  })

  o("list block", function () {
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

  o("tuple block", function () {
    o(p('redirect:(num,str,str){enabled}')).deepEquals({
      'redirect': ['num','str','str', { enabled: 'str' }]
    })
  })

  o("tuple with other types", function () {
    o(p('foo:(num,str),bar')).deepEquals({
      'foo': ['num','str'],
      'bar': 'str'
    })
  })

  o("not whitespace sensitive", function () {
    var result = p(`
      x : {
        y : (  str ,  str ) ,
        z  :  list  {
          e : bool
        }
      }
    `)
    o(result).deepEquals({
      x: { y: ['str','str'], z: ['list', { e: 'bool' }] }
    })
  })
})
