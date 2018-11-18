import {
  Pos,
  Schema,
  ZamlError,
  isObj,
  validTypes,
  basicTypes,
  whitespace,
  reservedOps,
} from '../lib/util'

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

  while (pos.i < source.length) {

    if (source[pos.i] === '}') {
      if (! inBlock) {
        throw ZamlError.syntax(pos, '}')
      }
      pos.newcol()
      return result
    }

    var name = readName(source, pos)
    var type = readType(source, pos)
    result[name] = type
  }
  return result
}

function readName (source: string, pos: Pos): string {
  while (pos.skipWhitespace(source)) {}
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
  while (pos.i < source.length) {
    while (pos.skipWhitespace(source)) {}

    let c = source[pos.i]
    let d = source[pos.i+1]

    if (c === '{' || c === '(') {
      throw ZamlError.syntax(pos, source[pos.i], '. Did you forget a colon?')
    }

    if (c === ',' || c === '}') {
      pos.newcol()
      return 'str'
    }

    if (c === ':' && d === '{') {
      return parseDefs(source, pos.newcol().newcol(), true)
    }

    if (c === ':' && d === '(') {
      var tuplePos = pos.newcol().copy()
      var types = readTupleTypes(source, pos)

      if (types.length < 2) {
        throw new ZamlError('user-error', tuplePos,
          `A tuple requires at least two types (${types.length ? 'onle one was' : 'none were'} provided).`)
      }

      if (source[pos.i] === '{') {
        let block = parseDefs(source, pos.newcol(), true)
        types.push(block)
      }
      return types
    }

    if (c === ':') {
      let typenamePos = pos.newcol().copy()
      let typename = readName(source, pos)

      if (validTypes.indexOf(typename) === -1) {
        throw new ZamlError('user-error', typenamePos, `No such type: '${typename}'`)
      }

      while (pos.skipWhitespace(source)) {}

      let c2 = source[pos.i]

      if (c2 === '{') {
        if (typename !== 'list') {
          throw new ZamlError('user-error', pos, `A '${typename}' type may not have a block.`)
        }
        let block = parseDefs(source, pos.newcol(), true)
        return [typename, block]
      }
      else if (c2 === ',' || c2 === '}' || pos.i === source.length) {
        pos.newcol()
        return typename
      }
    }

    throw ZamlError.syntax(pos, source[pos.i])
  }

  return 'str'
}

function readTupleTypes (source: string, pos: Pos): string[] {
  var start = pos.copy()
  var types: string[] = []

  pos.newcol() // Skip opening parens

  while (pos.i < source.length) {
    while (pos.skipWhitespace(source)) {}

    let c = source[pos.i]

    if (c === ',') {
      pos.newcol()
      continue
    }

    if (c === ')') {
      pos.newcol()
      return types
    }

    if (c === ':' || c === '(') {
      throw ZamlError.syntax(pos, c)
    }

    if (c === '{') {
      throw ZamlError.syntax(pos, c, ' (blocks are not allowed within a tuple type)')
    }

    let namePos = pos.copy()
    let name = readName(source, pos)

    if (basicTypes.indexOf(name) === -1) {
      throw new ZamlError('user-error', namePos, `Invalid tuple type '${name}'. Tuples may only contain str, num, and bool.`)
    }
    types.push(name)
  }

  throw new ZamlError('syntax-error', start, `Missing end parenthesis ')'`)
}
