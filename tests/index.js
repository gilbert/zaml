var o = require("ospec")
var {parse} = require('../index.js')

o("basic types", function () {
  var result = parse(`
    x 10
    y hello
    z one two
  `, {
    x: '$num',
    y: '$str',
    z: '$str',
  })

  o(result.x).equals(10)
  o(result.y).equals('hello')
  o(result.z).equals('one two')
})

o("kv", function () {
  var result = parse(`
    one {
      two {
        k1 v1
        k2 v2
      }
    }
  `, {
    one: {
      two: '$kv'
    },
  })

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
    items: '$list',
    inline: '$list',
  })

  o(result).deepEquals({
    items: ['one', 'two', 'three'],
    inline: ['x', 'y', 'z'],
  })
})


o("$multi", function () {
  var result = parse(`
    project {
      title My Project 1
    }
    project {
      title My Project 2
      tag hello there
      tag cool
    }
  `, {
    project$multi: {
      title: '$str',
      tag$multi: '$str',
    }
  })

  o(result).deepEquals({
    project: [
      { title: 'My Project 1', tag: [] },
      { title: 'My Project 2', tag: ['hello there', 'cool'] },
    ]
  })
})

o.spec("Syntactic features", function () {

  o("single-line string", function () {
    var result = parse(`
      items alice "big bob" robot
    `, {
      items: '$list',
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
    `, {
      items: '$list'
    })

    o(result).deepEquals({ items: ['a','c','e'] })
  })
})
