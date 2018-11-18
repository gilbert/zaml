var o = require("ospec")
var {parse} = require('../index.js')

o("basic types", function () {
  var result = parse(`
    x 10
    y hello
    z one two
    b true
  `, 'x:num,y,z,b:bool')

  o(result.x).equals(10)
  o(result.y).equals('hello')
  o(result.z).equals('one two')
  o(result.b).equals(true)
})

o("kv", function () {
  var result = parse(`
    one {
      two {
        k1 v1
        k2 v2
      }
    }
  `, 'one:{two:kv}')

  o(result).deepEquals({
    one: {
      two: { k1: 'v1', k2: 'v2' }
    }
  })
})

o("list", function () {
  var result = parse(`
    items {
      one
      two
      three
    }
    inline x y z
  `, {
    items: 'list',
    inline: 'list',
  })

  o(result).deepEquals({
    items: ['one', 'two', 'three'],
    inline: ['x', 'y', 'z'],
  })
})

o("list block", function () {
  var result = parse(`
    users {
      andy
      beth {
        admin true
      }
      carl
    }
  `, {
    users: ['list', { admin: 'bool' }],
  })

  o(result).deepEquals({
    users: [['andy'], ['beth', {admin: true}], ['carl']]
  })
})

o("multi", function () {
  var result = parse(`
    project {
      title My Project 1
    }
    project {
      title My Project 2
      tag hello there
      tag cool
    }
  `, 'project|multi:{title,tag|multi}')

  o(result).deepEquals({
    project: [
      { title: 'My Project 1', tag: [] },
      { title: 'My Project 2', tag: ['hello there', 'cool'] },
    ]
  })
})

o("tuple", function () {
  var result = parse(`
    redirect 301 /old /new
  `, {
    redirect: ['num', 'str', 'str']
  })

  o(result).deepEquals({
    redirect: [301, '/old', '/new']
  })
})

o("tuple block", function () {
  var result = parse(`
    redirect 301 /old /new {
      enabled false
    }
  `, {
    redirect: ['num', 'str', 'str', { enabled: 'bool' }]
  })

  o(result).deepEquals({
    redirect: [301, '/old', '/new', { enabled: false }]
  })
})

o.spec("ParseOptions", function () {
  o("vars", function () {
    var result = parse(`
      num $X
      str $A$A$B
      lst $C $C
      hsh {
        \\$D $E
      }
    `, 'num:num,str,lst:list,hsh:kv', {
      vars: { X: '20', A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' }
    })

    o(result).deepEquals({
      num: 20,
      str: 'aab',
      lst: ['c', 'c'],
      hsh: { d: 'e' },
    })
  })

  o("failOnUndefinedVars", function () {
    try {
      var result = parse(`
        x $A $B
      `, {
        x: 'str'
      }, {
        vars: { A: 'a' },
        failOnUndefinedVars: true,
      })

      o("Should not be successful").equals(false)
    }
    catch (err) {
      o(/'\$B'/i.test(err.message)).equals(true)
      o(/not defined/i.test(err.message)).equals(true)

      o(err.type).equals('user-error')
      o(err.pos.line).equals(2)
      o(err.pos.col).equals(9)
    }
  })
})

o.spec("Syntactic features", function () {

  o("single-line string", function () {
    var result = parse(`
      items alice "big bob" robot
    `, {
      items: 'list',
    })

    o(result).deepEquals({ items: ['alice', 'big bob', 'robot'] })
  })

  o("comments", function () {
    var result = parse(`
      items {
        a
        # b
        c
        #d
        e
      }
    `, 'items:list')

    o(result).deepEquals({ items: ['a','c','e'] })
  })
})
