//
// Zaml schemas are deliberately non whitespace sensitive.
// The strategy to accomplish this is for each token to
// take care of their own trailing spaces.
//
import {
  Pos,
  unexp,
  Schema,
  ZamlError,
  validTypes,
  BLOCKABLE_TYPES,
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
    var keyStart = pos.copy()
    var key = readKey(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (key.name !== '') {
      if (result.schema[key.name]) {
        throw new ZamlError('user-error', keyStart,
          `Duplicate key: "${key.name}" has already been defined in this context.`)
      }

      var type = readType(source, pos)

      if (key.multi) type.multi = true
      if (key.req) type.req = true
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
  var result: {name:string, multi?:true, req?:true} = { name }

  if (attrs.indexOf('multi') >= 0) result.multi = true
  if (attrs.indexOf('req') >= 0) result.req = true
  return result
}

function readEnum (source: string, pos: Pos) {
  var start = pos.i
  while (
    pos.i < source.length &&
    source[pos.i] !== '(' &&
    source[pos.i] !== ')' &&
    source[pos.i] !== ',' &&
    source[pos.i] !== ':'
  ) {
    pos.newcol()
  }
  return source.substring(start, pos.i).trim()
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

    if (typename === 'enum') {
      if (source[pos.i] !== '(') {
        throw new ZamlError('syntax-error', pos, unexp(source[pos.i], ' (Did you forget a parenthesis?)'))
      }
      pos.newcol()
      while (pos.skipWhitespace(source)) {}

      var options: string[] = []

      while (pos.i < source.length) {
        var option = readEnum(source, pos)

        if (option !== '') {
          options.push(option)
        }
        while (pos.skipWhitespace(source)) {}

        if (source[pos.i] === ',') {
          pos.newcol()
          while (pos.skipWhitespace(source)) {}
        }
        else if (source[pos.i] === ')') {
          pos.newcol()
          while (pos.skipWhitespace(source)) {}
          break
        }
        else {
          throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
        }
      }

      if (options.length === 0) {
        throw new ZamlError('user-error', typenamePos, 'An enum type must have at least one option.')
      }

      if (source[pos.i] === '{' || source[pos.i] === '[') {
        let block = parseBlock(source, pos)
        return { type: typename, options, block } as Schema.t
      }
      else {
        return { type: typename, options } as Schema.t
      }
    }

    let c3 = source[pos.i]

    if (c3 === '{' || c3 === '[') {
      if (BLOCKABLE_TYPES.indexOf(typename) === -1) {
        throw new ZamlError('user-error', pos, `A '${typename}' type may not have a block.`)
      }
      let block = parseBlock(source, pos)
      return { type: typename, block } as Schema.t
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

    if (c === ':' || c === '(') {
      throw new ZamlError('syntax-error', pos, unexp(c))
    }

    let namePos = pos.copy()
    let {name} = readKey(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (name !== '') {
      let type = basicTypeFromName(name)

      if (! type) {
        throw new ZamlError('user-error', namePos, `Invalid tuple type '${name}'. Tuples may only contain str, num, and bool.`)
      }
      types.push(type)
    }

    let c2 = source[pos.i]

    if (c2 === ',') {
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
      continue
    }

    if (c2 === ')') {
      pos.newcol()
      return types
    }

    if (c2 === '{') {
      throw new ZamlError('syntax-error', pos, unexp(c2, ' (blocks are not allowed within a tuple type)'))
    }

    var hint = c2.match(/[a-z0-9]/i) ? ' (did you forget a comma?)' : ''
    throw new ZamlError('syntax-error', pos, unexp(c2, hint))
  }

  throw new ZamlError('syntax-error', openParenPos, `Missing end parenthesis ")"`)
}
