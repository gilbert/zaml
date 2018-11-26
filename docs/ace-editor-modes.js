(function () {

  // Custom state for ace's syntax highlighting process
  var blockKeys = []
  var potentialBlockKey = null

  define('ace/mode/zaml_schema', function(require, exports, module) {

    var oop = require("ace/lib/oop")
    var TextMode = require("ace/mode/text").Mode
    var ZSchemaHighlightRules = require("ace/mode/zaml_schema_highlight_rules").ZSchemaHighlightRules

    var Mode = function() {
      this.HighlightRules = ZSchemaHighlightRules
    }
    oop.inherits(Mode, TextMode)

    exports.Mode = Mode
  })

  define('ace/mode/zaml_schema_highlight_rules', function(require, exports, module) {

    var oop = require("ace/lib/oop")
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules

    var ZSchemaHighlightRules = function() {
      this.$rules = {
        start: [{
          token: "type",
          regex: "(?:str|num|bool|kv|list|\\|multi)"
        }]
      }
      this.normalizeRules()
    }

    oop.inherits(ZSchemaHighlightRules, TextHighlightRules)

    exports.ZSchemaHighlightRules = ZSchemaHighlightRules
  })


  define('ace/mode/zaml', function(require, exports, module) {
    const oop = require('ace/lib/oop')
    const TextMode = require('ace/mode/text').Mode
    const ZamlHighlightRules = require('ace/mode/zaml_highlight_rules').ZamlHighlightRules

    var Mode = function() {
      this.HighlightRules = ZamlHighlightRules
    }
    oop.inherits(Mode, TextMode) // ACE's way of doing inheritance

    exports.Mode = Mode
  })

  define('ace/mode/zaml_highlight_rules', function(require, exports, module) {

    var oop = require("ace/lib/oop")
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules

    var ZamlHighlightRules = function() {
      var schema = {}

      this.setSchema = function(s) {
        schema = s
        blockKeys = []
        potentialBlockKey = null
      }
      this.configKeyRule = {
        token: "identifier",
        regex: "([^ \n\r]+)",
      }
      this.$rules = {
        "start": [
          {
            token: "string",
            start: '"',
            end: '"',
            next: [{
              token: "constant.language.escape.lsl",
              regex: /\\[tn"\\]/
            }]
          },
          {
            token: "text",
            regex: "^ *",
            next: "key",
          },
          {
            regex: "{ *$",
            onMatch() {
              if (potentialBlockKey) {
                blockKeys.push(potentialBlockKey)
              }
              return "text"
            }
          },
        ],
        "key": [
          {
            regex: "\\}",
            onMatch() {
              var key = blockKeys.pop()
              return "text"
            }
          },
          {
            token: "identifier",
            regex: "([^ \n\r]+)",
            onMatch: function (word, state) {
              var currentSchema = blockKeys.reduce((s,k) => {
                console.log("Checking", k, s)
                if (! s) return s
                var ss = s[k]
                if (Array.isArray(ss)) {
                  ss = ss[ss.length-1]
                  return isObj(ss) && ss
                }
                else {
                  return s[k]
                }
              }, schema)

              if (! currentSchema) {
                return 'text'
              }
              else if (currentSchema === 'kv') {
                return 'kv_key'
              }
              else if (currentSchema[word]) {
                potentialBlockKey = word
                return 'configkey'
              }
              else {
                potentialBlockKey = null
                return 'text'
              }
            },
            next: "start"
          },
        ]
      }
      this.normalizeRules()
    }

    oop.inherits(ZamlHighlightRules, TextHighlightRules)

    exports.ZamlHighlightRules = ZamlHighlightRules
  })

  function isObj (x) {
    return Object.prototype.toString.call(x) === '[object Object]';
  }
})()
