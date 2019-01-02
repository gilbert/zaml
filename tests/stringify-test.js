var o = require("ospec")
var {stringify} = require('../dist/index.js')

o.spec("Stringify", function () {

  o("basic", function () {
    var result = stringify({
      a: 10,
      b: true,
      c: 'cool',
      d: 'x',
      e: 'ignored'
    }, '{a:num,b:bool,c,d:enum(x,y)}')

    o(result).deepEquals(
`a 10
b true
c cool
d x
`
    )
  })

  o("list", function () {
    var result = stringify({
      a: 'A',
      b: [10,20,30],
      c: 'C'
    }, '{a,b:list,c}')

    o(result).deepEquals(
`a A
b {
  10
  20
  30
}
c C
`
    )
  })

  o("kv", function () {
    var result = stringify({
      k: { a: 10, b: 20 }
    }, '{k:kv}')

    o(result).deepEquals(
`k {
  a 10
  b 20
}
`
    )
  })

  o("tuple", function () {
    var result = stringify({
      t: [10, 20]
    }, '{t:(num,str)}')

    o(result).deepEquals(`t 10, 20\n`)
  })

  o("hash", function () {
    var result = stringify({
      top: {
        title: 'Nice'
      }
    }, '{top:{title}}')

    o(result).deepEquals(
`top {
  title Nice
}
`
    )
  })

  o("array", function () {
    var result = stringify({
      top: [
        ['title', 'Nice'],
        ['stuff', [10,20]],
      ]
    }, '{top:[title, stuff:list]}')

    o(result).deepEquals(
`top {
  title Nice
  stuff {
    10
    20
  }
}
`
    )
  })

  o("value with block", function () {
    var result = stringify({
      user: ['alice', {
        admin: true
      }]
    }, '{user:str{admin:bool}}')

    o(result).deepEquals(
`user alice {
  admin true
}
`
    )
  })

  o("list with block", function () {
    var result = stringify({
      letters: [
        ['x'],
        ['y', { special: true }],
        ['z'],
      ]
    }, '{letters:list{special:bool}}')

    o(result).deepEquals(
`letters {
  x
  y {
    special true
  }
  z
}
`
    )
  })

})
