//
// Zaml schemas are deliberately non whitespace sensitive.
// The strategy to accomplish this is for each token to
// take care of their own trailing spaces.
//
import {
  Pos,
  Schema,
  ZamlError,
  validTypes,
  basicTypeFromName,
  whitespace,
} from './util'

export function parseSchema (source: string): Schema.Block {
  try {
    var pos = new Pos()
    while (pos.skipWhitespace(source)) {}

    var startChar = source[pos.i]

    if (startChar !== '{' && startChar !== '[') {
      throw new ZamlError('syntax-error', pos,
        `Your schema must begin with a hash block "{" or an array block "["`)
    }

    return parseBlock(source, pos)
  }
  catch (e) {
    if (e instanceof ZamlError) {
      e.addSource(source)
    }
    throw e
  }
}

function parseBlock (source: string, pos: Pos): Schema.Block {
  const start = pos.copy()
  const blockChar = source[pos.i]

  if (blockChar !== '{' && blockChar !== '[') {
    throw new ZamlError('syntax-error', pos, unexp(blockChar, "This shouldn't happen."))
  }

  const endBlockChar = blockChar === '{' ? '}' : ']'

  const result: Schema.Block = blockChar === '{'
    ? { type: 'hash', schema: {} }
    : { type: 'array', schema: {} }

  pos.newcol()

  while (pos.skipWhitespace(source)) {}

  while (pos.i < source.length) {
    var key = readKey(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (key.name !== '') {
      var type = readType(source, pos)
      if (key.multi) type.multi = true
      result.schema[key.name] = type
    }

    while (pos.skipWhitespace(source)) {}

    var c = source[pos.i]

    if (c === '}' || c === ']') {
      if (c !== endBlockChar) {
        throw new ZamlError('syntax-error', pos, unexp(c))
      }
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
      return result
    }
    else if (c === ',') {
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
    }
    else if (pos.i < source.length) {
      throw new ZamlError('syntax-error', pos, unexp(c))
    }
  }

  if (pos.i === source.length) {
    throw new ZamlError('syntax-error', start, `Missing end bracket "${endBlockChar}"`)
  }

  return result
}

function readKey (source: string, pos: Pos) {
  var start = pos.i
  while (
    pos.i < source.length &&
    source[pos.i] !== '{' &&
    source[pos.i] !== '}' &&
    source[pos.i] !== '[' &&
    source[pos.i] !== ']' &&
    source[pos.i] !== '(' &&
    source[pos.i] !== ')' &&
    source[pos.i] !== ',' &&
    source[pos.i] !== ':' &&
    ! whitespace.test(source[pos.i])
  ) {
    pos.newcol()
  }
  var key = source.substring(start, pos.i)

  let [name, ...attrs] = key.split('|')
  var result: {name:string, multi?:true} = { name }

  if (attrs.indexOf('multi') >= 0) result.multi = true
  return result
}

function readType (source: string, pos: Pos): Schema.t {
  let c = source[pos.i]

  if (pos.i >= source.length || c === '}' || c === ']' || c === ',') {
    // At this point we've reached the end without
    // a specified type. Return the default.
    return { type: 'str' }
  }

  if (c === '{' || c === '[' || c === '(') {
    throw new ZamlError('syntax-error', pos, unexp(c, '. Did you forget a colon?'))
  }

  if (c === ':') {
    pos.newcol()
    while (pos.skipWhitespace(source)) {}

    let c2 = source[pos.i]

    if (c2 === '{' || c2 === '[') {
      return parseBlock(source, pos)
    }

    if (c2 === '(') {
      var tuplePos = pos.copy()
      pos.newcol() // Skip open parens

      while (pos.skipWhitespace(source)) {}

      var types = readTupleTypes(source, pos, tuplePos)

      if (types.length < 2) {
        throw new ZamlError('user-error', tuplePos,
          `A tuple requires at least two types (${types.length ? 'onle one was' : 'none were'} provided).`)
      }

      while (pos.skipWhitespace(source)) {}

      if (source[pos.i] === '{') {
        let block = parseBlock(source, pos)
        return { type: 'tuple', schema: types, block }
      }
      else {
        return { type: 'tuple', schema: types }
      }
    }

    let typenamePos = pos.copy()
    let {name: typename} = readKey(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (validTypes.indexOf(typename) === -1) {
      throw new ZamlError('user-error', typenamePos, `No such type: '${typename}'`)
    }


    let c3 = source[pos.i]

    if (c3 === '{') {
      if (typename !== 'list') {
        throw new ZamlError('user-error', pos, `A '${typename}' type may not have a block.`)
      }
      let block = parseBlock(source, pos)
      return { type: 'list', block }
    }
    else if (c3 === ',' || c3 === '}' || c3 === ']' || pos.i === source.length) {
      return { type: typename } as Schema.t
    }

    throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
  }
  else {
    throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
  }

  return { type: 'str' }
}

function readTupleTypes (source: string, pos: Pos, openParenPos: Pos): Schema.BasicType[] {
  var types: Schema.BasicType[] = []

  while (pos.i < source.length) {
    let c = source[pos.i]

    if (c === ',') {
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
      continue
    }

    if (c === ')') {
      pos.newcol()
      return types
    }

    if (c === ':' || c === '(') {
      throw new ZamlError('syntax-error', pos, unexp(c))
    }

    if (c === '{') {
      throw new ZamlError('syntax-error', pos, unexp(c, ' (blocks are not allowed within a tuple type)'))
    }

    let namePos = pos.copy()
    let {name} = readKey(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (name === '') {
      break
    }

    let type = basicTypeFromName(name)

    if (! type) {
      throw new ZamlError('user-error', namePos, `Invalid tuple type '${name}'. Tuples may only contain str, num, and bool.`)
    }
    types.push(type)
  }

  throw new ZamlError('syntax-error', openParenPos, `Missing end parenthesis ")"`)
}

function unexp (char: string, more='') {
  return `Unexpected ${JSON.stringify(char)}${more}`
}
