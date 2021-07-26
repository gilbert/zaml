import { Schema } from './util'

export type StringifyOptions = {
  indentDepth: number
}

export function stringify (data: any, blockSchema: Schema.BlockT, opts: StringifyOptions): string {
  const parts: string[] = []

  const seenMulti: Record<string,boolean> = {}
  const ind = indentation(opts.indentDepth)

  let dataQueue = blockSchema.type === 'hash'
    ? Object.keys(blockSchema.schema).map(configKey => [configKey, data[configKey]])
    : data

  while (dataQueue.length) {
    let [key, _value] = dataQueue.shift()

    if ( _value === undefined ) continue;

    let t = blockSchema.schema[key]

    if (t.multi && ! seenMulti[key]) {
      seenMulti[key] = true
      dataQueue = _value.map((v:any) => [key, v]).concat(dataQueue)
      continue
    }

    let valueParts = stringifyValue(_value, t, opts)
    valueParts[0] = `${ind}${key} ${valueParts[0]}`

    parts.push(...valueParts)
  }

  return parts.join('\n')
}

function stringifyValue (_value: any, t: Schema.t, opts: StringifyOptions) {
  const parts: string[] = []
  const ind = indentation(opts.indentDepth)

  const [value, block] = ('block' in t)
    ? _value
    : [_value, null]

  if (
    t.type === 'num' ||
    t.type === 'str' ||
    t.type === 'bool' ||
    t.type === 'enum'
  ) {
    parts.push(value)
  }
  else if (t.type === 'list') {
    parts.push('{')

    if (Array.isArray(value)) {
      //
      // Clear out indentation since we will add it ourselves
      //
      let opts2 = {...opts, indentDepth: 0}
      let list_ind = indentation(opts.indentDepth+1)

      for (let item of value) {
        parts.push(
          ...stringifyValue(item, t.of, opts2).map(line => `${list_ind}${line}`)
        )
      }
    }
    parts.push(ind + '}')
  }
  else if (t.type === 'kv') {
    let ind_2 = indentation(opts.indentDepth + 1)
    parts.push(`{`)

    for (let key in value) {
      parts.push(ind_2 + `${key} ${value[key]}`)
    }

    parts.push(ind + '}')
  }
  else if (t.type === 'tuple') {
    parts.push(value.join(', '))
  }
  else if (t.type === 'hash' || t.type === 'array') {
    parts.push('{')

    parts.push(stringify(value, t, indent(1, opts)))

    parts.push(ind + '}')
  }

  if ('block' in t && t.block && block) {
    addBlockBracket(parts)

    parts.push(stringify(block, t.block, indent(1, opts)))

    parts.push(ind + '}')
  }

  return parts
}

function indentation (n: number) {
  let result = ''
  for (let i=0; i < n; i++) {
    result += '  '
  }
  return result
}

function indent (mod: number, opts: StringifyOptions) {
  return { ...opts, indentDepth: opts.indentDepth+mod }
}

function addBlockBracket (parts: string[]) {
  parts[parts.length-1] = parts[parts.length-1] + ' {'
}
