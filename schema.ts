import {reservedOps, isObj, ZamlError, Schema} from './lib/util'

export function createSchema (definitions: any) {
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
    else if (isObj(t)) {
      schema[key] = { name: 'namespace', schema: createSchema(t), multi }
    }
    else {
      throw new ZamlError('author-error', null, `Invalid schema type: ${t}`)
    }
  }
  return schema
}
