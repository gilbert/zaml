var o = require("ospec")
var {parse} = require('../index.js')

o("basic types", async function () {
  var result = await parse(`
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

o("hash", async function () {
  var result = await parse(`
    one {
      two {
        k1 v1
        k2 v2
      }
    }
  `, {
    one: {
      two: '$hash'
    },
  })

  o(result).deepEquals({
    one: {
      two: { k1: 'v1', k2: 'v2' }
    }
  })
})

o("array", async function () {
  var result = await parse(`
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


o.spec("Syntactic features", function () {

  o("single-line string", async function () {
    var result = await parse(`
      items alice "big bob" robot
    `, {
      items: '$list',
    })

    o(result).deepEquals({ items: ['alice', 'big bob', 'robot'] })
  })
})
