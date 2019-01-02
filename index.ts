import {Pos, ZamlError, Schema} from './src/util'
import {parseSchema} from './src/schema'
import {lex, parseZaml, ParseOptions} from './src/parser'

export {parseSchema} from './src/schema'

export function parse (source: string, schema: string | Schema.Block, options: ParseOptions={}) {
  if (options.vars && Object.keys(options.vars).length === 0) {
    delete options.vars
  }
  try {
    var statements = lex(source, new Pos())
    return parseZaml(source, new Pos(), typeof schema === 'string' ? parseSchema(schema) : schema, statements, options)
  }
  catch (e) {
    if (e instanceof ZamlError) {

      if (e.pos && e.pos.i === 0 && e.message.match('[missing key]')) {
        // Don't add source to top-level required key errors.
      }
      else {
        e.addSource(source)
      }
    }
    throw e
  }
}
