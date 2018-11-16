import {
  Pos,
  Schema,
  ZamlError,
  isObj,
  validTypes,
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
    if (t === 'num' || t === 'str') {
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
      schema[key] = { name: 'namespace', schema: createSchema(t), multi }
    }
    else {
      throw new ZamlError('author-error', null, `Invalid schema type: ${t}`)
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
        throw new ZamlError('syntax-error', pos, `Unexpected }`)
      }
      console.log("DEF BLOCK COMPLETE")
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

    if (c === ',') {
      pos.newcol()
      return 'str'
    }

    if (c === '{') {
      return parseDefs(source, pos.newcol(), true)
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
          throw new ZamlError('user-error', pos, `Only list types, not '${typename}' types, may have a sub-namespace`)
        }
        let namespace = parseDefs(source, pos.newcol(), true)
        return [typename, namespace]
      }
      else if (c2 === ',' || c2 === '}' || pos.i === source.length) {
        pos.newcol()
        return typename
      }
      else {
        throw new ZamlError('syntax-error', pos, `Unexpected '${source[pos.i]}'`)
      }
    }
  }

  return 'str'
}
