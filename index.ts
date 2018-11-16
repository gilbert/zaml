import {Pos, ZamlError} from './lib/util'
import {createSchema} from './schema'
import {lex, parseZaml} from './parser'

export function parse (source: string, definitions: any) {
  try {
    var schema = createSchema(definitions)
    var statements = lex(source, new Pos())
    return parseZaml(source, schema, statements)
  }
  catch (e) {
    if (e instanceof ZamlError) {
      e.addSource(source)
    }
    throw e
  }
}
