var o = require("ospec")
var {checkError} = require('./helpers')
var {parse} = require('../dist/index.js')

o("basic types", function () {
  var result = parse(`
    x 10
    y hello
    z one two
    b true
  `, '{x:num,y,z,b:bool}')

  o(result.x).equals(10)
  o(result.y).equals('hello')
  o(result.z).equals('one two')
  o(result.b).equals(true)
})

o("bool case insensitive", function () {
  var result = parse(`
    t TruE
    f False
  `, '{t:bool,f:bool}')

  o(result).deepEquals({ t: true, f: false })
})

o("str block", function () {
  var result = parse(`
    x XX {
      y YY
    }
  `, '{x:str{y}}')

  o(result).deepEquals({
    x: ['XX', {
      y: 'YY'
    }]
  })
})

o("str block no block", function () {
  var result = parse(`
    x XX
  `, '{x:str{y}}')

  o(result).deepEquals({
    x: ['XX', {}]
  })
})

o("str block empty block", function () {
  var result = parse(`
    x XX {}
  `, '{x:str{y}}')

  o(result).deepEquals({
    x: ['XX', {}]
  })
})

o("array block", function () {
  var result = parse(`
    one 10
    two 20
    one 11
  `, '[one:num,two:str]')

  o(result).deepEquals([
    ['one', 10],
    ['two', '20'],
    ['one', 11],
  ])
})

o("kv", function () {
  var result = parse(`
    one {
      two {
        k1 v1
        k2 v2
      }
    }
  `, '{one:{two:kv}}')

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
    inline x, y , z
  `, '{items:list(str),inline:list}')

  o(result).deepEquals({
    items: ['one', 'two', 'three'],
    inline: ['x', 'y', 'z'],
  })
})

o("list num", function () {
  var result = parse(`
    ids 10, 20
  `, '{ids:list(num)}')
  o(result).deepEquals({ ids: [10,20] })
})

o("list enum", function () {
  var result = parse(`
    math x, x, y
  `, '{math:list(enum(x,y))}')
  o(result).deepEquals({ math: ['x','x','y'] })

  try {
    var result = parse(`
      math x, y, z
    `, '{math:list(enum(x,y))}')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 2, 18, /invalid value/i, /'z'/, /must/)
  }
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
  `, '{users:list(str{admin:bool})}')

  o(result).deepEquals({
    users: [['andy', {}], ['beth', {admin: true}], ['carl', {}]]
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
  `, '{project|multi:{title,tag|multi}}')

  o(result).deepEquals({
    project: [
      { title: 'My Project 1', tag: [] },
      { title: 'My Project 2', tag: ['hello there', 'cool'] },
    ]
  })
})

o("multi list", function () {
  var result = parse(`
    tags a, b
    tags c
  `, '{tags|multi:list}')

  o(result).deepEquals({ tags: [['a','b'], ['c']] })
})

o("req", function () {
  try {
    parse(`
      xx hello
    `, '{xx,yy|req}')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 1, 1, /yy/, /is required/)
    o(err.message.match(/xx/)).equals(null)
    o(err.message.match(/in this block/)).equals(null)
    o(err.message.match(/\^/)).equals(null)
  }
})

o("req in block", function () {
  try {
    parse(`
      person {
      }
    `, '{person:{name|req}}')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 2, 14, /name/, /in this block/, /is required/)
  }
})

o("req array", function () {
  try {
    parse(`
      person {
      }
    `, '{person:[name|req]}')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 2, 14, /name/, /in this block/, /is required/)
  }
})

o("req multi", function () {
  try {
    parse(``, '{ user|multi|req: {name} }')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 1, 1, /user/, /is required/, /at least one/)
  }
})

o("req block", function () {
  try {
    parse(`
      user bob
    `, '{ user: str {name|req} }')
    o("Should not be successful").equals(false)
  }
  catch (err) {
    checkError(err, 'user-error', 2, 7, /user/, /requires a block/)
  }
})

o("req block descendent", function () {
  var result = parse(`
    user carly
  `, `{
    user: str {
      special: bool {
        nested|req
      }
    }
  }`)
  o(result).deepEquals({
    user: ['carly', {}]
  })
})

o("tuple", function () {
  var result = parse(`
    redirect 301, /old, /new
  `, '{redirect:(num,str,str)}')

  o(result).deepEquals({
    redirect: [301, '/old', '/new']
  })
})

o("tuple enum", function () {
  var result = parse(`
    feature_a on, Feature A
    feature_b Feature B, off
  `, '{feature_a:(enum(on,off),str), feature_b:(str, enum(on,off))}')

  o(result).deepEquals({
    feature_a: ['on', 'Feature A'],
    feature_b: ['Feature B', 'off'],
  })
})

o("tuple block", function () {
  var result = parse(`
    redirect 301, /old, /new {
      enabled false
    }
  `, '{redirect:(num,str,str){enabled:bool}}')

  o(result).deepEquals({
    redirect: [[301, '/old', '/new'], { enabled: false }]
  })
})

o("tuple block no block", function () {
  var result = parse(`
    pair 101, 202
  `, '{pair:(num,num){nothing:bool}}')

  o(result).deepEquals({
    pair: [[101, 202], {}]
  })
})

o("enum", function () {
  var result = parse(`
    fileType image
    owner Alice Alison
  `, '{fileType:enum(image,video), owner:enum(Alice Alison, Bob)}')

  o(result).deepEquals({
    fileType: 'image',
    owner: 'Alice Alison',
  })
})

o.spec("ParseOptions", function () {
  o("vars", function () {
    var result = parse(`
      num $X
      str $A$A$B
      lst $C, $C
      hsh {
        $D ddd
        eee $E
        $F $X
      }
    `, '{num:num,str,lst:list,hsh:kv}', {
      vars: { X: '20', A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f' }
    })

    o(result).deepEquals({
      num: 20,
      str: 'aab',
      lst: ['c', 'c'],
      hsh: { d: 'ddd', eee: 'e', f: '20' },
    })
  })

  o("failOnUndefinedVars", function () {
    try {
      parse(`
        x $A $B
      `, '{x}', {
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

  o("caseInsensitiveKeys", function () {
    var result = parse(`
      key 1
      kEy 2
      Key 3
      KEY 4
    `, '{keY|multi:num}', {
      caseInsensitiveKeys: true
    })

    o(result).deepEquals({ keY: [1,2,3,4] })
  })

  o("caseInsensitiveEnums", function () {
    var result = parse(`
      type HuMan
      type biRd
    `, '{type|multi:enum(Human,Bird)}', {
      caseInsensitiveEnums: true
    })

    o(result).deepEquals({ type: ['Human','Bird'] })
  })
})

o.spec("Syntactic features", function () {

  o("single-line string", function () {
    var result = parse(`
      items alice , "big bob"  , robot  , " go  "
    `, '{items:list}')

    o(result).deepEquals({ items: ['alice', 'big bob', 'robot', ' go  '] })
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
    `, '{items:list}')

    o(result).deepEquals({ items: ['a','c','e'] })
  })

  o("empty block", function () {
    var result = parse(`
      h {}
      a {}
      decoy 10
    `, '{h:{x,y},a:[x,y],decoy}')

    o(result).deepEquals({ h: {}, a: [], decoy: '10' })
  })
})
