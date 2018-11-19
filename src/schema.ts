//
// Zaml schemas are deliberately non whitespace sensitive.
// The strategy to accomplish this is for each token to
// take care of their own trailing spaces.
//
import {
  Pos,
  Schema,
  ZamlError,
  isObj,
  validTypes,
  basicTypes,
  whitespace,
  reservedOps,
} from './util'

export function createSchema (definitions: any) {
  definitions = {...definitions}

  var schema: Schema = {}

  for (var key in definitions) {
    if (reservedOps.test(key[0])) {
      throw new ZamlError('author-error', null, `The key (${key}) is invalid: ${key[0]} is a reserved word.`)
    }

    // Extract key attributes
    let [configName, ...attrs] = key.split('|')
    let multi = attrs.indexOf('multi') >= 0

    // Strip attrs from key so source code matches up
    if (attrs.length) {
      definitions[configName] = definitions[key]
      delete definitions[key]
      key = configName
    }

    let t = definitions[configName]

    if (Array.isArray(t) && t[0] === 'list' && isObj(t[1])) {
      schema[key] = { name: t[0], blockSchema: createSchema(t[1]), multi }
    }
    else if (Array.isArray(t)) {
      let hasBlock = isObj(t[t.length-1])
      let end = hasBlock ? t.length-2 : t.length-1

      for (let i=0; i < end; i++) {
        let t2 = t[i]
        if (basicTypes.indexOf(t2) === -1) {
          throw new ZamlError('author-error', null, `Invalid tuple type: ${JSON.stringify(t)}`)
        }
      }
      schema[key] = hasBlock
        ? { name: 'tuple', types: t, blockSchema: createSchema(t[t.length-1]), multi }
        : { name: 'tuple', types: t, multi }
    }
    else if (t === 'num' || t === 'str') {
      schema[key] = { name: t, multi }
    }
    else if (t === 'kv') {
      schema[key] = { name: t, multi }
    }
    else if (t === 'list') {
      schema[key] = { name: t, multi }
    }
    else if (t === 'bool') {
      schema[key] = { name: t, multi }
    }
    else if (isObj(t)) {
      schema[key] = { name: 'block', blockSchema: createSchema(t), multi }
    }
    else {
      throw new ZamlError('author-error', null, `Invalid schema type: ${JSON.stringify(t)}`)
    }
  }
  return schema
}

export function parseSchema (source: string) {
  try {
    return parseDefs(source, new Pos())
  }
  catch (e) {
    if (e instanceof ZamlError) {
      e.addSource(source)
    }
    throw e
  }
}

function parseDefs (source: string, pos: Pos, inBlock=false) {
  var result: any = {}

  while (pos.skipWhitespace(source)) {}

  while (pos.i < source.length) {
    var name = readName(source, pos)

    while (pos.skipWhitespace(source)) {}

    var type = readType(source, pos)
    result[name] = type

    while (pos.skipWhitespace(source)) {}

    if (source[pos.i] === '}') {
      if (! inBlock) {
        throw new ZamlError('syntax-error', pos, unexp('}'))
      }
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
      return result
    }
    else if (source[pos.i] === ',') {
      pos.newcol()
      while (pos.skipWhitespace(source)) {}
    }
    else if (pos.i < source.length) {
      throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
    }
  }
  return result
}

function readName (source: string, pos: Pos): string {
  var start = pos.i
  while (
    pos.i < source.length &&
    source[pos.i] !== '{' &&
    source[pos.i] !== '}' &&
    source[pos.i] !== '(' &&
    source[pos.i] !== ')' &&
    source[pos.i] !== ',' &&
    source[pos.i] !== ':' &&
    ! whitespace.test(source[pos.i])
  ) {
    pos.newcol()
  }
  return source.substring(start, pos.i)
}

function readType (source: string, pos: Pos) {
  let c = source[pos.i]

  if (pos.i >= source.length || c === '}' || c === ',') {
    // At this point we've reached the end without
    // a specified type. Return the default.
    return 'str'
  }

  if (c === '{' || c === '(') {
    throw new ZamlError('syntax-error', pos, unexp(c, '. Did you forget a colon?'))
  }

  if (c === ':') {
    pos.newcol()
    while (pos.skipWhitespace(source)) {}

    let c2 = source[pos.i]

    if (c2 === '{') {
      return parseDefs(source, pos.newcol(), true)
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
        let block = parseDefs(source, pos.newcol(), true)
        types.push(block)
      }
      return types
    }

    let typenamePos = pos.copy()
    let typename = readName(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (validTypes.indexOf(typename) === -1) {
      throw new ZamlError('user-error', typenamePos, `No such type: '${typename}'`)
    }


    let c3 = source[pos.i]

    if (c3 === '{') {
      if (typename !== 'list') {
        throw new ZamlError('user-error', pos, `A '${typename}' type may not have a block.`)
      }
      let block = parseDefs(source, pos.newcol(), true)
      return [typename, block]
    }
    else if (c3 === ',' || c3 === '}' || pos.i === source.length) {
      return typename
    }

    throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
  }
  else {
    throw new ZamlError('syntax-error', pos, unexp(source[pos.i]))
  }

  return 'str'
}

function readTupleTypes (source: string, pos: Pos, openParenPos: Pos): string[] {
  var types: string[] = []

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
    let name = readName(source, pos)

    while (pos.skipWhitespace(source)) {}

    if (basicTypes.indexOf(name) === -1) {
      throw new ZamlError('user-error', namePos, `Invalid tuple type '${name}'. Tuples may only contain str, num, and bool.`)
    }
    types.push(name)
  }

  throw new ZamlError('syntax-error', openParenPos, `Missing end parenthesis ")"`)
}

function unexp (char: string, more='') {
  return `Unexpected ${JSON.stringify(char)}${more}`
}
