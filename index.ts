import {Pos, ZamlError} from './lib/util'
import {parseSchema, createSchema} from './schema'
import {lex, parseZaml, ParseOptions} from './parser'

export function parse (source: string, definitions: string | object, options: ParseOptions={}) {
  if (options.vars && Object.keys(options.vars).length === 0) {
    delete options.vars
  }
  try {
    var schema = createSchema(
      typeof definitions === 'string' ? parseSchema(definitions) : definitions
    )
    var statements = lex(source, new Pos())
    return parseZaml(source, schema, statements, options)
  }
  catch (e) {
    if (e instanceof ZamlError) {
      e.addSource(source)
    }
    throw e
  }
}
