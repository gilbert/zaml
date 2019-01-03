import { Schema } from './util'

export type StringifyOptions = {
  indentDepth?: number
}

export function stringify (data: any, blockSchema: Schema.Block, opts: StringifyOptions): string {
  const parts: string[] = []

  const depth = opts.indentDepth || 0
  const i_1 = indentation(depth)
  const seenMulti: Record<string,boolean> = {}

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

    let [value, block] = ('block' in t && t.type !== 'list')
      ? _value
      : [_value, null]

    if (
      t.type === 'num' ||
      t.type === 'str' ||
      t.type === 'bool' ||
      t.type === 'enum'
    ) {
      parts.push(i_1 + `${key} ${value}`)
    }
    else if (t.type === 'list') {
      let i_2 = indentation(depth + 1)

      parts.push(i_1 + `${key} {`)

      if (Array.isArray(value)) {
        for (let item of value) {

          if (t.block) {
            let [itemValue, itemBlock] = item
            parts.push(i_2 + itemValue)
            if (itemBlock) {
              addBlockBracket(parts)
              parts.push(stringify(itemBlock, t.block, indent(depth+1, opts)))
              parts.push(i_2 + '}')
            }
          }
          else {
            parts.push(i_2 + item)
          }
        }
      }
      parts.push(i_1 + '}')
    }
    else if (t.type === 'kv') {
      let i_2 = indentation(depth + 1)
      parts.push(i_1 + `${key} {`)

      for (let key in value) {
        parts.push(i_2 + `${key} ${value[key]}`)
      }

      parts.push(i_1 + '}')
    }
    else if (t.type === 'tuple') {
      parts.push(i_1 + `${key} ${value.join(', ')}`)
    }
    else if (t.type === 'hash' || t.type === 'array') {
      parts.push(i_1 + `${key} {`)

      parts.push(stringify(value, t, indent(depth, opts)))

      parts.push(i_1 + '}')
    }

    if ('block' in t && t.block && block) {
      addBlockBracket(parts)

      parts.push(stringify(block, t.block, indent(depth, opts)))

      parts.push(i_1 + '}')
    }
  }

  return parts.join('\n')
}

function indentation (n: number) {
  let result = ''
  for (let i=0; i < n; i++) {
    result += '  '
  }
  return result
}

function indent (depth: number, opts: StringifyOptions) {
  return { ...opts, indentDepth: depth+1 }
}

function addBlockBracket (parts: string[]) {
  parts[parts.length-1] = parts[parts.length-1] + ' {'
}
