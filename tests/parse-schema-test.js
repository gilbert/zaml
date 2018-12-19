var o = require("ospec")
var {parseSchema: p} = require('../dist/src/schema')

o.spec("Schema parsing", function () {

  o("default string", function () {
    o(p('{x,y,z}')).deepEquals({
      type: 'hash',
      schema: { x: {type:'str'}, y: {type:'str'}, z: {type:'str'} }
    })
  })

  o("basic", function () {
    o(p('{a:str,b:bool, c: list , d :num, s}')).deepEquals({
      type: 'hash',
      schema: {
        a: {type:'str'}, b: {type:'bool'}, c: {type:'list'}, d: {type:'num'}, s: {type:'str'}
      }
    })
  })

  o("block", function () {
    o(p('{user:{name,score:num}}')).deepEquals({
      type: 'hash',
      schema: {
        user: { type: 'hash', schema: { name:{type:'str'}, score:{type:'num'} } }
      }
    })
  })

  o("array block", function () {
    o(p('{user:[name,score:num]}')).deepEquals({
      type: 'hash',
      schema: {
        user: { type: 'array', schema: { name:{type:'str'}, score:{type:'num'} } }
      }
    })
  })

  o("top-level array block", function () {
    o(p('[link,div]')).deepEquals({ type: 'array', schema: {link:{type:'str'},div:{type:'str'}} })
  })

  o("empty block", function () {
    o(p('{user:{}}')).deepEquals({
      type: 'hash',
      schema: { user: { type: 'hash', schema: {} } }
    })
  })

  o("list block", function () {
    o(p('{users:list{admin:bool}}')).deepEquals({
      type: 'hash',
      schema: {
        users: {
          type: 'list',
          block: { type: 'hash', schema: { admin:{type:'bool'} } }
        }
      }
    })
  })

  o("multi block", function () {
    o(p('{user|multi:{name}}')).deepEquals({
      type: 'hash',
      schema: {
        user: { type: 'hash', multi: true, schema: { name: {type:'str'} } }
      }
    })
  })

  o("tuple", function () {
    o(p('{redirect:(num,str,str)}')).deepEquals({
      type: 'hash',
      schema: {
        redirect: {
          type: 'tuple',
          schema: [{type:'num'}, {type:'str'}, {type:'str'}]
        }
      }
    })
  })

  o("tuple block", function () {
    o(p('{redirect:(num,str,str){enabled}}')).deepEquals({
      type: 'hash',
      schema: {
        redirect: {
          type: 'tuple',
          schema: [{type:'num'}, {type:'str'}, {type:'str'}],
          block: { type:'hash', schema: { enabled: {type:'str'} } }
        }
      }
    })
  })

  o("tuple with other types", function () {
    o(p('{foo:(num,str),bar}')).deepEquals({
      type: 'hash',
      schema: {
        foo: { type: 'tuple', schema: [{type:'num'},{type:'str'}] },
        bar: { type: 'str' }
      }
    })
  })

  o("not whitespace sensitive", function () {
    var result = p(`{
      x : {
        y : (  str ,  str ) ,
        z  :  list  {
          e : bool
        }
      }
    }`)
    o(result).deepEquals({
      type: 'hash',
      schema: {
        x: {
          type: 'hash',
          schema: {
            y: { type: 'tuple', schema: [{type:'str'}, {type:'str'}] },
            z: {
              type: 'list',
              block: { type:'hash', schema: { e:{type:'bool'} } }
            }
          }
        }
      }
    })
  })
})
