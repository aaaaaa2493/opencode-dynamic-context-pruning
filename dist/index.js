// lib/config.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// node_modules/jsonc-parser/lib/esm/impl/scanner.js
function createScanner(text, ignoreTrivia = false) {
  const len = text.length;
  let pos = 0, value = "", tokenOffset = 0, token = 16, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = 0;
  function scanHexDigits(count, exact) {
    let digits = 0;
    let value2 = 0;
    while (digits < count || !exact) {
      let ch = text.charCodeAt(pos);
      if (ch >= 48 && ch <= 57) {
        value2 = value2 * 16 + ch - 48;
      } else if (ch >= 65 && ch <= 70) {
        value2 = value2 * 16 + ch - 65 + 10;
      } else if (ch >= 97 && ch <= 102) {
        value2 = value2 * 16 + ch - 97 + 10;
      } else {
        break;
      }
      pos++;
      digits++;
    }
    if (digits < count) {
      value2 = -1;
    }
    return value2;
  }
  function setPosition(newPosition) {
    pos = newPosition;
    value = "";
    tokenOffset = 0;
    token = 16;
    scanError = 0;
  }
  function scanNumber() {
    let start = pos;
    if (text.charCodeAt(pos) === 48) {
      pos++;
    } else {
      pos++;
      while (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
      }
    }
    if (pos < text.length && text.charCodeAt(pos) === 46) {
      pos++;
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
      } else {
        scanError = 3;
        return text.substring(start, pos);
      }
    }
    let end = pos;
    if (pos < text.length && (text.charCodeAt(pos) === 69 || text.charCodeAt(pos) === 101)) {
      pos++;
      if (pos < text.length && text.charCodeAt(pos) === 43 || text.charCodeAt(pos) === 45) {
        pos++;
      }
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
        end = pos;
      } else {
        scanError = 3;
      }
    }
    return text.substring(start, end);
  }
  function scanString() {
    let result = "", start = pos;
    while (true) {
      if (pos >= len) {
        result += text.substring(start, pos);
        scanError = 2;
        break;
      }
      const ch = text.charCodeAt(pos);
      if (ch === 34) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === 92) {
        result += text.substring(start, pos);
        pos++;
        if (pos >= len) {
          scanError = 2;
          break;
        }
        const ch2 = text.charCodeAt(pos++);
        switch (ch2) {
          case 34:
            result += '"';
            break;
          case 92:
            result += "\\";
            break;
          case 47:
            result += "/";
            break;
          case 98:
            result += "\b";
            break;
          case 102:
            result += "\f";
            break;
          case 110:
            result += "\n";
            break;
          case 114:
            result += "\r";
            break;
          case 116:
            result += "	";
            break;
          case 117:
            const ch3 = scanHexDigits(4, true);
            if (ch3 >= 0) {
              result += String.fromCharCode(ch3);
            } else {
              scanError = 4;
            }
            break;
          default:
            scanError = 5;
        }
        start = pos;
        continue;
      }
      if (ch >= 0 && ch <= 31) {
        if (isLineBreak(ch)) {
          result += text.substring(start, pos);
          scanError = 2;
          break;
        } else {
          scanError = 6;
        }
      }
      pos++;
    }
    return result;
  }
  function scanNext() {
    value = "";
    scanError = 0;
    tokenOffset = pos;
    lineStartOffset = lineNumber;
    prevTokenLineStartOffset = tokenLineStartOffset;
    if (pos >= len) {
      tokenOffset = len;
      return token = 17;
    }
    let code = text.charCodeAt(pos);
    if (isWhiteSpace(code)) {
      do {
        pos++;
        value += String.fromCharCode(code);
        code = text.charCodeAt(pos);
      } while (isWhiteSpace(code));
      return token = 15;
    }
    if (isLineBreak(code)) {
      pos++;
      value += String.fromCharCode(code);
      if (code === 13 && text.charCodeAt(pos) === 10) {
        pos++;
        value += "\n";
      }
      lineNumber++;
      tokenLineStartOffset = pos;
      return token = 14;
    }
    switch (code) {
      // tokens: []{}:,
      case 123:
        pos++;
        return token = 1;
      case 125:
        pos++;
        return token = 2;
      case 91:
        pos++;
        return token = 3;
      case 93:
        pos++;
        return token = 4;
      case 58:
        pos++;
        return token = 6;
      case 44:
        pos++;
        return token = 5;
      // strings
      case 34:
        pos++;
        value = scanString();
        return token = 10;
      // comments
      case 47:
        const start = pos - 1;
        if (text.charCodeAt(pos + 1) === 47) {
          pos += 2;
          while (pos < len) {
            if (isLineBreak(text.charCodeAt(pos))) {
              break;
            }
            pos++;
          }
          value = text.substring(start, pos);
          return token = 12;
        }
        if (text.charCodeAt(pos + 1) === 42) {
          pos += 2;
          const safeLength = len - 1;
          let commentClosed = false;
          while (pos < safeLength) {
            const ch = text.charCodeAt(pos);
            if (ch === 42 && text.charCodeAt(pos + 1) === 47) {
              pos += 2;
              commentClosed = true;
              break;
            }
            pos++;
            if (isLineBreak(ch)) {
              if (ch === 13 && text.charCodeAt(pos) === 10) {
                pos++;
              }
              lineNumber++;
              tokenLineStartOffset = pos;
            }
          }
          if (!commentClosed) {
            pos++;
            scanError = 1;
          }
          value = text.substring(start, pos);
          return token = 13;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
      // numbers
      case 45:
        value += String.fromCharCode(code);
        pos++;
        if (pos === len || !isDigit(text.charCodeAt(pos))) {
          return token = 16;
        }
      // found a minus, followed by a number so
      // we fall through to proceed with scanning
      // numbers
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        value += scanNumber();
        return token = 11;
      // literals and unknown symbols
      default:
        while (pos < len && isUnknownContentCharacter(code)) {
          pos++;
          code = text.charCodeAt(pos);
        }
        if (tokenOffset !== pos) {
          value = text.substring(tokenOffset, pos);
          switch (value) {
            case "true":
              return token = 8;
            case "false":
              return token = 9;
            case "null":
              return token = 7;
          }
          return token = 16;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
    }
  }
  function isUnknownContentCharacter(code) {
    if (isWhiteSpace(code) || isLineBreak(code)) {
      return false;
    }
    switch (code) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return false;
    }
    return true;
  }
  function scanNextNonTrivia() {
    let result;
    do {
      result = scanNext();
    } while (result >= 12 && result <= 15);
    return result;
  }
  return {
    setPosition,
    getPosition: () => pos,
    scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
    getToken: () => token,
    getTokenValue: () => value,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => pos - tokenOffset,
    getTokenStartLine: () => lineStartOffset,
    getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
    getTokenError: () => scanError
  };
}
function isWhiteSpace(ch) {
  return ch === 32 || ch === 9;
}
function isLineBreak(ch) {
  return ch === 10 || ch === 13;
}
function isDigit(ch) {
  return ch >= 48 && ch <= 57;
}
var CharacterCodes;
(function(CharacterCodes2) {
  CharacterCodes2[CharacterCodes2["lineFeed"] = 10] = "lineFeed";
  CharacterCodes2[CharacterCodes2["carriageReturn"] = 13] = "carriageReturn";
  CharacterCodes2[CharacterCodes2["space"] = 32] = "space";
  CharacterCodes2[CharacterCodes2["_0"] = 48] = "_0";
  CharacterCodes2[CharacterCodes2["_1"] = 49] = "_1";
  CharacterCodes2[CharacterCodes2["_2"] = 50] = "_2";
  CharacterCodes2[CharacterCodes2["_3"] = 51] = "_3";
  CharacterCodes2[CharacterCodes2["_4"] = 52] = "_4";
  CharacterCodes2[CharacterCodes2["_5"] = 53] = "_5";
  CharacterCodes2[CharacterCodes2["_6"] = 54] = "_6";
  CharacterCodes2[CharacterCodes2["_7"] = 55] = "_7";
  CharacterCodes2[CharacterCodes2["_8"] = 56] = "_8";
  CharacterCodes2[CharacterCodes2["_9"] = 57] = "_9";
  CharacterCodes2[CharacterCodes2["a"] = 97] = "a";
  CharacterCodes2[CharacterCodes2["b"] = 98] = "b";
  CharacterCodes2[CharacterCodes2["c"] = 99] = "c";
  CharacterCodes2[CharacterCodes2["d"] = 100] = "d";
  CharacterCodes2[CharacterCodes2["e"] = 101] = "e";
  CharacterCodes2[CharacterCodes2["f"] = 102] = "f";
  CharacterCodes2[CharacterCodes2["g"] = 103] = "g";
  CharacterCodes2[CharacterCodes2["h"] = 104] = "h";
  CharacterCodes2[CharacterCodes2["i"] = 105] = "i";
  CharacterCodes2[CharacterCodes2["j"] = 106] = "j";
  CharacterCodes2[CharacterCodes2["k"] = 107] = "k";
  CharacterCodes2[CharacterCodes2["l"] = 108] = "l";
  CharacterCodes2[CharacterCodes2["m"] = 109] = "m";
  CharacterCodes2[CharacterCodes2["n"] = 110] = "n";
  CharacterCodes2[CharacterCodes2["o"] = 111] = "o";
  CharacterCodes2[CharacterCodes2["p"] = 112] = "p";
  CharacterCodes2[CharacterCodes2["q"] = 113] = "q";
  CharacterCodes2[CharacterCodes2["r"] = 114] = "r";
  CharacterCodes2[CharacterCodes2["s"] = 115] = "s";
  CharacterCodes2[CharacterCodes2["t"] = 116] = "t";
  CharacterCodes2[CharacterCodes2["u"] = 117] = "u";
  CharacterCodes2[CharacterCodes2["v"] = 118] = "v";
  CharacterCodes2[CharacterCodes2["w"] = 119] = "w";
  CharacterCodes2[CharacterCodes2["x"] = 120] = "x";
  CharacterCodes2[CharacterCodes2["y"] = 121] = "y";
  CharacterCodes2[CharacterCodes2["z"] = 122] = "z";
  CharacterCodes2[CharacterCodes2["A"] = 65] = "A";
  CharacterCodes2[CharacterCodes2["B"] = 66] = "B";
  CharacterCodes2[CharacterCodes2["C"] = 67] = "C";
  CharacterCodes2[CharacterCodes2["D"] = 68] = "D";
  CharacterCodes2[CharacterCodes2["E"] = 69] = "E";
  CharacterCodes2[CharacterCodes2["F"] = 70] = "F";
  CharacterCodes2[CharacterCodes2["G"] = 71] = "G";
  CharacterCodes2[CharacterCodes2["H"] = 72] = "H";
  CharacterCodes2[CharacterCodes2["I"] = 73] = "I";
  CharacterCodes2[CharacterCodes2["J"] = 74] = "J";
  CharacterCodes2[CharacterCodes2["K"] = 75] = "K";
  CharacterCodes2[CharacterCodes2["L"] = 76] = "L";
  CharacterCodes2[CharacterCodes2["M"] = 77] = "M";
  CharacterCodes2[CharacterCodes2["N"] = 78] = "N";
  CharacterCodes2[CharacterCodes2["O"] = 79] = "O";
  CharacterCodes2[CharacterCodes2["P"] = 80] = "P";
  CharacterCodes2[CharacterCodes2["Q"] = 81] = "Q";
  CharacterCodes2[CharacterCodes2["R"] = 82] = "R";
  CharacterCodes2[CharacterCodes2["S"] = 83] = "S";
  CharacterCodes2[CharacterCodes2["T"] = 84] = "T";
  CharacterCodes2[CharacterCodes2["U"] = 85] = "U";
  CharacterCodes2[CharacterCodes2["V"] = 86] = "V";
  CharacterCodes2[CharacterCodes2["W"] = 87] = "W";
  CharacterCodes2[CharacterCodes2["X"] = 88] = "X";
  CharacterCodes2[CharacterCodes2["Y"] = 89] = "Y";
  CharacterCodes2[CharacterCodes2["Z"] = 90] = "Z";
  CharacterCodes2[CharacterCodes2["asterisk"] = 42] = "asterisk";
  CharacterCodes2[CharacterCodes2["backslash"] = 92] = "backslash";
  CharacterCodes2[CharacterCodes2["closeBrace"] = 125] = "closeBrace";
  CharacterCodes2[CharacterCodes2["closeBracket"] = 93] = "closeBracket";
  CharacterCodes2[CharacterCodes2["colon"] = 58] = "colon";
  CharacterCodes2[CharacterCodes2["comma"] = 44] = "comma";
  CharacterCodes2[CharacterCodes2["dot"] = 46] = "dot";
  CharacterCodes2[CharacterCodes2["doubleQuote"] = 34] = "doubleQuote";
  CharacterCodes2[CharacterCodes2["minus"] = 45] = "minus";
  CharacterCodes2[CharacterCodes2["openBrace"] = 123] = "openBrace";
  CharacterCodes2[CharacterCodes2["openBracket"] = 91] = "openBracket";
  CharacterCodes2[CharacterCodes2["plus"] = 43] = "plus";
  CharacterCodes2[CharacterCodes2["slash"] = 47] = "slash";
  CharacterCodes2[CharacterCodes2["formFeed"] = 12] = "formFeed";
  CharacterCodes2[CharacterCodes2["tab"] = 9] = "tab";
})(CharacterCodes || (CharacterCodes = {}));

// node_modules/jsonc-parser/lib/esm/impl/string-intern.js
var cachedSpaces = new Array(20).fill(0).map((_, index) => {
  return " ".repeat(index);
});
var maxCachedValues = 200;
var cachedBreakLinesWithSpaces = {
  " ": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\n" + " ".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + " ".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r\n" + " ".repeat(index);
    })
  },
  "	": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\n" + "	".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + "	".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r\n" + "	".repeat(index);
    })
  }
};

// node_modules/jsonc-parser/lib/esm/impl/parser.js
var ParseOptions;
(function(ParseOptions2) {
  ParseOptions2.DEFAULT = {
    allowTrailingComma: false
  };
})(ParseOptions || (ParseOptions = {}));
function parse(text, errors = [], options = ParseOptions.DEFAULT) {
  let currentProperty = null;
  let currentParent = [];
  const previousParents = [];
  function onValue(value) {
    if (Array.isArray(currentParent)) {
      currentParent.push(value);
    } else if (currentProperty !== null) {
      currentParent[currentProperty] = value;
    }
  }
  const visitor = {
    onObjectBegin: () => {
      const object = {};
      onValue(object);
      previousParents.push(currentParent);
      currentParent = object;
      currentProperty = null;
    },
    onObjectProperty: (name) => {
      currentProperty = name;
    },
    onObjectEnd: () => {
      currentParent = previousParents.pop();
    },
    onArrayBegin: () => {
      const array = [];
      onValue(array);
      previousParents.push(currentParent);
      currentParent = array;
      currentProperty = null;
    },
    onArrayEnd: () => {
      currentParent = previousParents.pop();
    },
    onLiteralValue: onValue,
    onError: (error, offset, length) => {
      errors.push({ error, offset, length });
    }
  };
  visit(text, visitor, options);
  return currentParent[0];
}
function visit(text, visitor, options = ParseOptions.DEFAULT) {
  const _scanner = createScanner(text, false);
  const _jsonPath = [];
  let suppressedCallbacks = 0;
  function toNoArgVisit(visitFunction) {
    return visitFunction ? () => suppressedCallbacks === 0 && visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisit(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisitWithPath(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice()) : () => true;
  }
  function toBeginVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks++;
      } else {
        let cbReturn = visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice());
        if (cbReturn === false) {
          suppressedCallbacks = 1;
        }
      }
    } : () => true;
  }
  function toEndVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks--;
      }
      if (suppressedCallbacks === 0) {
        visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
      }
    } : () => true;
  }
  const onObjectBegin = toBeginVisit(visitor.onObjectBegin), onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty), onObjectEnd = toEndVisit(visitor.onObjectEnd), onArrayBegin = toBeginVisit(visitor.onArrayBegin), onArrayEnd = toEndVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
  const disallowComments = options && options.disallowComments;
  const allowTrailingComma = options && options.allowTrailingComma;
  function scanNext() {
    while (true) {
      const token = _scanner.scan();
      switch (_scanner.getTokenError()) {
        case 4:
          handleError(
            14
            /* ParseErrorCode.InvalidUnicode */
          );
          break;
        case 5:
          handleError(
            15
            /* ParseErrorCode.InvalidEscapeCharacter */
          );
          break;
        case 3:
          handleError(
            13
            /* ParseErrorCode.UnexpectedEndOfNumber */
          );
          break;
        case 1:
          if (!disallowComments) {
            handleError(
              11
              /* ParseErrorCode.UnexpectedEndOfComment */
            );
          }
          break;
        case 2:
          handleError(
            12
            /* ParseErrorCode.UnexpectedEndOfString */
          );
          break;
        case 6:
          handleError(
            16
            /* ParseErrorCode.InvalidCharacter */
          );
          break;
      }
      switch (token) {
        case 12:
        case 13:
          if (disallowComments) {
            handleError(
              10
              /* ParseErrorCode.InvalidCommentToken */
            );
          } else {
            onComment();
          }
          break;
        case 16:
          handleError(
            1
            /* ParseErrorCode.InvalidSymbol */
          );
          break;
        case 15:
        case 14:
          break;
        default:
          return token;
      }
    }
  }
  function handleError(error, skipUntilAfter = [], skipUntil = []) {
    onError(error);
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token = _scanner.getToken();
      while (token !== 17) {
        if (skipUntilAfter.indexOf(token) !== -1) {
          scanNext();
          break;
        } else if (skipUntil.indexOf(token) !== -1) {
          break;
        }
        token = scanNext();
      }
    }
  }
  function parseString(isValue) {
    const value = _scanner.getTokenValue();
    if (isValue) {
      onLiteralValue(value);
    } else {
      onObjectProperty(value);
      _jsonPath.push(value);
    }
    scanNext();
    return true;
  }
  function parseLiteral() {
    switch (_scanner.getToken()) {
      case 11:
        const tokenValue = _scanner.getTokenValue();
        let value = Number(tokenValue);
        if (isNaN(value)) {
          handleError(
            2
            /* ParseErrorCode.InvalidNumberFormat */
          );
          value = 0;
        }
        onLiteralValue(value);
        break;
      case 7:
        onLiteralValue(null);
        break;
      case 8:
        onLiteralValue(true);
        break;
      case 9:
        onLiteralValue(false);
        break;
      default:
        return false;
    }
    scanNext();
    return true;
  }
  function parseProperty() {
    if (_scanner.getToken() !== 10) {
      handleError(3, [], [
        2,
        5
        /* SyntaxKind.CommaToken */
      ]);
      return false;
    }
    parseString(false);
    if (_scanner.getToken() === 6) {
      onSeparator(":");
      scanNext();
      if (!parseValue()) {
        handleError(4, [], [
          2,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
    } else {
      handleError(5, [], [
        2,
        5
        /* SyntaxKind.CommaToken */
      ]);
    }
    _jsonPath.pop();
    return true;
  }
  function parseObject() {
    onObjectBegin();
    scanNext();
    let needsComma = false;
    while (_scanner.getToken() !== 2 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 2 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (!parseProperty()) {
        handleError(4, [], [
          2,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
      needsComma = true;
    }
    onObjectEnd();
    if (_scanner.getToken() !== 2) {
      handleError(7, [
        2
        /* SyntaxKind.CloseBraceToken */
      ], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseArray() {
    onArrayBegin();
    scanNext();
    let isFirstElement = true;
    let needsComma = false;
    while (_scanner.getToken() !== 4 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 4 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (isFirstElement) {
        _jsonPath.push(0);
        isFirstElement = false;
      } else {
        _jsonPath[_jsonPath.length - 1]++;
      }
      if (!parseValue()) {
        handleError(4, [], [
          4,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
      needsComma = true;
    }
    onArrayEnd();
    if (!isFirstElement) {
      _jsonPath.pop();
    }
    if (_scanner.getToken() !== 4) {
      handleError(8, [
        4
        /* SyntaxKind.CloseBracketToken */
      ], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseValue() {
    switch (_scanner.getToken()) {
      case 3:
        return parseArray();
      case 1:
        return parseObject();
      case 10:
        return parseString(true);
      default:
        return parseLiteral();
    }
  }
  scanNext();
  if (_scanner.getToken() === 17) {
    if (options.allowEmptyContent) {
      return true;
    }
    handleError(4, [], []);
    return false;
  }
  if (!parseValue()) {
    handleError(4, [], []);
    return false;
  }
  if (_scanner.getToken() !== 17) {
    handleError(9, [], []);
  }
  return true;
}

// node_modules/jsonc-parser/lib/esm/main.js
var ScanError;
(function(ScanError2) {
  ScanError2[ScanError2["None"] = 0] = "None";
  ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
  ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
  ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
  ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
  ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
  ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
var SyntaxKind;
(function(SyntaxKind2) {
  SyntaxKind2[SyntaxKind2["OpenBraceToken"] = 1] = "OpenBraceToken";
  SyntaxKind2[SyntaxKind2["CloseBraceToken"] = 2] = "CloseBraceToken";
  SyntaxKind2[SyntaxKind2["OpenBracketToken"] = 3] = "OpenBracketToken";
  SyntaxKind2[SyntaxKind2["CloseBracketToken"] = 4] = "CloseBracketToken";
  SyntaxKind2[SyntaxKind2["CommaToken"] = 5] = "CommaToken";
  SyntaxKind2[SyntaxKind2["ColonToken"] = 6] = "ColonToken";
  SyntaxKind2[SyntaxKind2["NullKeyword"] = 7] = "NullKeyword";
  SyntaxKind2[SyntaxKind2["TrueKeyword"] = 8] = "TrueKeyword";
  SyntaxKind2[SyntaxKind2["FalseKeyword"] = 9] = "FalseKeyword";
  SyntaxKind2[SyntaxKind2["StringLiteral"] = 10] = "StringLiteral";
  SyntaxKind2[SyntaxKind2["NumericLiteral"] = 11] = "NumericLiteral";
  SyntaxKind2[SyntaxKind2["LineCommentTrivia"] = 12] = "LineCommentTrivia";
  SyntaxKind2[SyntaxKind2["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
  SyntaxKind2[SyntaxKind2["LineBreakTrivia"] = 14] = "LineBreakTrivia";
  SyntaxKind2[SyntaxKind2["Trivia"] = 15] = "Trivia";
  SyntaxKind2[SyntaxKind2["Unknown"] = 16] = "Unknown";
  SyntaxKind2[SyntaxKind2["EOF"] = 17] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
var parse2 = parse;
var ParseErrorCode;
(function(ParseErrorCode2) {
  ParseErrorCode2[ParseErrorCode2["InvalidSymbol"] = 1] = "InvalidSymbol";
  ParseErrorCode2[ParseErrorCode2["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
  ParseErrorCode2[ParseErrorCode2["PropertyNameExpected"] = 3] = "PropertyNameExpected";
  ParseErrorCode2[ParseErrorCode2["ValueExpected"] = 4] = "ValueExpected";
  ParseErrorCode2[ParseErrorCode2["ColonExpected"] = 5] = "ColonExpected";
  ParseErrorCode2[ParseErrorCode2["CommaExpected"] = 6] = "CommaExpected";
  ParseErrorCode2[ParseErrorCode2["CloseBraceExpected"] = 7] = "CloseBraceExpected";
  ParseErrorCode2[ParseErrorCode2["CloseBracketExpected"] = 8] = "CloseBracketExpected";
  ParseErrorCode2[ParseErrorCode2["EndOfFileExpected"] = 9] = "EndOfFileExpected";
  ParseErrorCode2[ParseErrorCode2["InvalidCommentToken"] = 10] = "InvalidCommentToken";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
  ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
  ParseErrorCode2[ParseErrorCode2["InvalidUnicode"] = 14] = "InvalidUnicode";
  ParseErrorCode2[ParseErrorCode2["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
  ParseErrorCode2[ParseErrorCode2["InvalidCharacter"] = 16] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));

// lib/config.ts
var DEFAULT_PROTECTED_TOOLS = [
  "task",
  "skill",
  "todowrite",
  "todoread",
  "compress",
  "batch",
  "plan_enter",
  "plan_exit",
  "write",
  "edit"
];
var COMPRESS_DEFAULT_PROTECTED_TOOLS = ["skill", "todowrite", "todoread"];
var VALID_CONFIG_KEYS = /* @__PURE__ */ new Set([
  "$schema",
  "enabled",
  "autoUpdate",
  "debug",
  "showUpdateToasts",
  "pruneNotification",
  "pruneNotificationType",
  "turnProtection",
  "turnProtection.enabled",
  "turnProtection.turns",
  "experimental",
  "experimental.allowSubAgents",
  "experimental.customPrompts",
  "protectedFilePatterns",
  "commands",
  "commands.enabled",
  "commands.protectedTools",
  "manualMode",
  "manualMode.enabled",
  "manualMode.automaticStrategies",
  "compress",
  "compress.mode",
  "compress.permission",
  "compress.showCompression",
  "compress.summaryBuffer",
  "compress.maxContextLimit",
  "compress.minContextLimit",
  "compress.modelMaxLimits",
  "compress.modelMinLimits",
  "compress.nudgeFrequency",
  "compress.iterationNudgeThreshold",
  "compress.nudgeForce",
  "compress.protectedTools",
  "compress.protectTags",
  "compress.protectUserMessages",
  "strategies",
  "strategies.deduplication",
  "strategies.deduplication.enabled",
  "strategies.deduplication.protectedTools",
  "strategies.purgeErrors",
  "strategies.purgeErrors.enabled",
  "strategies.purgeErrors.turns",
  "strategies.purgeErrors.protectedTools"
]);
function getConfigKeyPaths(obj, prefix = "") {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (fullKey === "compress.modelMaxLimits" || fullKey === "compress.modelMinLimits") {
      continue;
    }
    if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      keys.push(...getConfigKeyPaths(obj[key], fullKey));
    }
  }
  return keys;
}
function getInvalidConfigKeys(userConfig) {
  const userKeys = getConfigKeyPaths(userConfig);
  return userKeys.filter((key) => !VALID_CONFIG_KEYS.has(key));
}
function validateConfigTypes(config) {
  const errors = [];
  if (config.enabled !== void 0 && typeof config.enabled !== "boolean") {
    errors.push({ key: "enabled", expected: "boolean", actual: typeof config.enabled });
  }
  if (config.autoUpdate !== void 0 && typeof config.autoUpdate !== "boolean") {
    errors.push({ key: "autoUpdate", expected: "boolean", actual: typeof config.autoUpdate });
  }
  if (config.debug !== void 0 && typeof config.debug !== "boolean") {
    errors.push({ key: "debug", expected: "boolean", actual: typeof config.debug });
  }
  if (config.pruneNotification !== void 0) {
    const validValues = ["off", "minimal", "detailed"];
    if (!validValues.includes(config.pruneNotification)) {
      errors.push({
        key: "pruneNotification",
        expected: '"off" | "minimal" | "detailed"',
        actual: JSON.stringify(config.pruneNotification)
      });
    }
  }
  if (config.pruneNotificationType !== void 0) {
    const validValues = ["chat", "toast"];
    if (!validValues.includes(config.pruneNotificationType)) {
      errors.push({
        key: "pruneNotificationType",
        expected: '"chat" | "toast"',
        actual: JSON.stringify(config.pruneNotificationType)
      });
    }
  }
  if (config.protectedFilePatterns !== void 0) {
    if (!Array.isArray(config.protectedFilePatterns)) {
      errors.push({
        key: "protectedFilePatterns",
        expected: "string[]",
        actual: typeof config.protectedFilePatterns
      });
    } else if (!config.protectedFilePatterns.every((v) => typeof v === "string")) {
      errors.push({
        key: "protectedFilePatterns",
        expected: "string[]",
        actual: "non-string entries"
      });
    }
  }
  if (config.turnProtection) {
    if (config.turnProtection.enabled !== void 0 && typeof config.turnProtection.enabled !== "boolean") {
      errors.push({
        key: "turnProtection.enabled",
        expected: "boolean",
        actual: typeof config.turnProtection.enabled
      });
    }
    if (config.turnProtection.turns !== void 0 && typeof config.turnProtection.turns !== "number") {
      errors.push({
        key: "turnProtection.turns",
        expected: "number",
        actual: typeof config.turnProtection.turns
      });
    }
    if (typeof config.turnProtection.turns === "number" && config.turnProtection.turns < 1) {
      errors.push({
        key: "turnProtection.turns",
        expected: "positive number (>= 1)",
        actual: `${config.turnProtection.turns}`
      });
    }
  }
  const experimental = config.experimental;
  if (experimental !== void 0) {
    if (typeof experimental !== "object" || experimental === null || Array.isArray(experimental)) {
      errors.push({
        key: "experimental",
        expected: "object",
        actual: typeof experimental
      });
    } else {
      if (experimental.allowSubAgents !== void 0 && typeof experimental.allowSubAgents !== "boolean") {
        errors.push({
          key: "experimental.allowSubAgents",
          expected: "boolean",
          actual: typeof experimental.allowSubAgents
        });
      }
      if (experimental.customPrompts !== void 0 && typeof experimental.customPrompts !== "boolean") {
        errors.push({
          key: "experimental.customPrompts",
          expected: "boolean",
          actual: typeof experimental.customPrompts
        });
      }
    }
  }
  const commands = config.commands;
  if (commands !== void 0) {
    if (typeof commands !== "object" || commands === null || Array.isArray(commands)) {
      errors.push({
        key: "commands",
        expected: "object",
        actual: typeof commands
      });
    } else {
      if (commands.enabled !== void 0 && typeof commands.enabled !== "boolean") {
        errors.push({
          key: "commands.enabled",
          expected: "boolean",
          actual: typeof commands.enabled
        });
      }
      if (commands.protectedTools !== void 0 && !Array.isArray(commands.protectedTools)) {
        errors.push({
          key: "commands.protectedTools",
          expected: "string[]",
          actual: typeof commands.protectedTools
        });
      }
    }
  }
  const manualMode = config.manualMode;
  if (manualMode !== void 0) {
    if (typeof manualMode !== "object" || manualMode === null || Array.isArray(manualMode)) {
      errors.push({
        key: "manualMode",
        expected: "object",
        actual: typeof manualMode
      });
    } else {
      if (manualMode.enabled !== void 0 && typeof manualMode.enabled !== "boolean") {
        errors.push({
          key: "manualMode.enabled",
          expected: "boolean",
          actual: typeof manualMode.enabled
        });
      }
      if (manualMode.automaticStrategies !== void 0 && typeof manualMode.automaticStrategies !== "boolean") {
        errors.push({
          key: "manualMode.automaticStrategies",
          expected: "boolean",
          actual: typeof manualMode.automaticStrategies
        });
      }
    }
  }
  const compress = config.compress;
  if (compress !== void 0) {
    if (typeof compress !== "object" || compress === null || Array.isArray(compress)) {
      errors.push({
        key: "compress",
        expected: "object",
        actual: typeof compress
      });
    } else {
      if (compress.mode !== void 0 && compress.mode !== "range" && compress.mode !== "message") {
        errors.push({
          key: "compress.mode",
          expected: '"range" | "message"',
          actual: JSON.stringify(compress.mode)
        });
      }
      if (compress.summaryBuffer !== void 0 && typeof compress.summaryBuffer !== "boolean") {
        errors.push({
          key: "compress.summaryBuffer",
          expected: "boolean",
          actual: typeof compress.summaryBuffer
        });
      }
      if (compress.nudgeFrequency !== void 0 && typeof compress.nudgeFrequency !== "number") {
        errors.push({
          key: "compress.nudgeFrequency",
          expected: "number",
          actual: typeof compress.nudgeFrequency
        });
      }
      if (typeof compress.nudgeFrequency === "number" && compress.nudgeFrequency < 1) {
        errors.push({
          key: "compress.nudgeFrequency",
          expected: "positive number (>= 1)",
          actual: `${compress.nudgeFrequency} (will be clamped to 1)`
        });
      }
      if (compress.iterationNudgeThreshold !== void 0 && typeof compress.iterationNudgeThreshold !== "number") {
        errors.push({
          key: "compress.iterationNudgeThreshold",
          expected: "number",
          actual: typeof compress.iterationNudgeThreshold
        });
      }
      if (compress.nudgeForce !== void 0 && compress.nudgeForce !== "strong" && compress.nudgeForce !== "soft") {
        errors.push({
          key: "compress.nudgeForce",
          expected: '"strong" | "soft"',
          actual: JSON.stringify(compress.nudgeForce)
        });
      }
      if (compress.protectedTools !== void 0 && !Array.isArray(compress.protectedTools)) {
        errors.push({
          key: "compress.protectedTools",
          expected: "string[]",
          actual: typeof compress.protectedTools
        });
      }
      if (compress.protectTags !== void 0 && typeof compress.protectTags !== "boolean") {
        errors.push({
          key: "compress.protectTags",
          expected: "boolean",
          actual: typeof compress.protectTags
        });
      }
      if (compress.protectUserMessages !== void 0 && typeof compress.protectUserMessages !== "boolean") {
        errors.push({
          key: "compress.protectUserMessages",
          expected: "boolean",
          actual: typeof compress.protectUserMessages
        });
      }
      if (typeof compress.iterationNudgeThreshold === "number" && compress.iterationNudgeThreshold < 1) {
        errors.push({
          key: "compress.iterationNudgeThreshold",
          expected: "positive number (>= 1)",
          actual: `${compress.iterationNudgeThreshold} (will be clamped to 1)`
        });
      }
      const validateLimitValue = (key, value, actualValue = value) => {
        const isValidNumber = typeof value === "number";
        const isPercentString = typeof value === "string" && value.endsWith("%");
        if (!isValidNumber && !isPercentString) {
          errors.push({
            key,
            expected: 'number | "${number}%"',
            actual: JSON.stringify(actualValue)
          });
        }
      };
      const validateModelLimits = (key, limits) => {
        if (limits === void 0) {
          return;
        }
        if (typeof limits !== "object" || limits === null || Array.isArray(limits)) {
          errors.push({
            key,
            expected: "Record<string, number | ${number}%>",
            actual: typeof limits
          });
          return;
        }
        for (const [providerModelKey, limit] of Object.entries(limits)) {
          const isValidNumber = typeof limit === "number";
          const isPercentString = typeof limit === "string" && /^\d+(?:\.\d+)?%$/.test(limit);
          if (!isValidNumber && !isPercentString) {
            errors.push({
              key: `${key}.${providerModelKey}`,
              expected: 'number | "${number}%"',
              actual: JSON.stringify(limit)
            });
          }
        }
      };
      if (compress.maxContextLimit !== void 0) {
        validateLimitValue("compress.maxContextLimit", compress.maxContextLimit);
      }
      if (compress.minContextLimit !== void 0) {
        validateLimitValue("compress.minContextLimit", compress.minContextLimit);
      }
      validateModelLimits("compress.modelMaxLimits", compress.modelMaxLimits);
      validateModelLimits("compress.modelMinLimits", compress.modelMinLimits);
      const validValues = ["ask", "allow", "deny"];
      if (compress.permission !== void 0 && !validValues.includes(compress.permission)) {
        errors.push({
          key: "compress.permission",
          expected: '"ask" | "allow" | "deny"',
          actual: JSON.stringify(compress.permission)
        });
      }
      if (compress.showCompression !== void 0 && typeof compress.showCompression !== "boolean") {
        errors.push({
          key: "compress.showCompression",
          expected: "boolean",
          actual: typeof compress.showCompression
        });
      }
    }
  }
  const strategies = config.strategies;
  if (strategies) {
    if (strategies.deduplication?.enabled !== void 0 && typeof strategies.deduplication.enabled !== "boolean") {
      errors.push({
        key: "strategies.deduplication.enabled",
        expected: "boolean",
        actual: typeof strategies.deduplication.enabled
      });
    }
    if (strategies.deduplication?.protectedTools !== void 0 && !Array.isArray(strategies.deduplication.protectedTools)) {
      errors.push({
        key: "strategies.deduplication.protectedTools",
        expected: "string[]",
        actual: typeof strategies.deduplication.protectedTools
      });
    }
    if (strategies.purgeErrors) {
      if (strategies.purgeErrors.enabled !== void 0 && typeof strategies.purgeErrors.enabled !== "boolean") {
        errors.push({
          key: "strategies.purgeErrors.enabled",
          expected: "boolean",
          actual: typeof strategies.purgeErrors.enabled
        });
      }
      if (strategies.purgeErrors.turns !== void 0 && typeof strategies.purgeErrors.turns !== "number") {
        errors.push({
          key: "strategies.purgeErrors.turns",
          expected: "number",
          actual: typeof strategies.purgeErrors.turns
        });
      }
      if (typeof strategies.purgeErrors.turns === "number" && strategies.purgeErrors.turns < 1) {
        errors.push({
          key: "strategies.purgeErrors.turns",
          expected: "positive number (>= 1)",
          actual: `${strategies.purgeErrors.turns} (will be clamped to 1)`
        });
      }
      if (strategies.purgeErrors.protectedTools !== void 0 && !Array.isArray(strategies.purgeErrors.protectedTools)) {
        errors.push({
          key: "strategies.purgeErrors.protectedTools",
          expected: "string[]",
          actual: typeof strategies.purgeErrors.protectedTools
        });
      }
    }
  }
  return errors;
}
function showConfigWarnings(ctx, configPath, configData, isProject) {
  const invalidKeys = getInvalidConfigKeys(configData);
  const typeErrors = validateConfigTypes(configData);
  if (invalidKeys.length === 0 && typeErrors.length === 0) {
    return;
  }
  const configType = isProject ? "project config" : "config";
  const messages = [];
  if (invalidKeys.length > 0) {
    const keyList = invalidKeys.slice(0, 3).join(", ");
    const suffix = invalidKeys.length > 3 ? ` (+${invalidKeys.length - 3} more)` : "";
    messages.push(`Unknown keys: ${keyList}${suffix}`);
  }
  if (typeErrors.length > 0) {
    for (const err of typeErrors.slice(0, 2)) {
      messages.push(`${err.key}: expected ${err.expected}, got ${err.actual}`);
    }
    if (typeErrors.length > 2) {
      messages.push(`(+${typeErrors.length - 2} more type errors)`);
    }
  }
  setTimeout(() => {
    try {
      ctx.client.tui.showToast({
        body: {
          title: `DCP: ${configType} warning`,
          message: `${configPath}
${messages.join("\n")}`,
          variant: "warning",
          duration: 7e3
        }
      });
    } catch {
    }
  }, 7e3);
}
var defaultConfig = {
  enabled: true,
  autoUpdate: true,
  debug: false,
  pruneNotification: "detailed",
  pruneNotificationType: "chat",
  commands: {
    enabled: true,
    protectedTools: [...DEFAULT_PROTECTED_TOOLS]
  },
  manualMode: {
    enabled: false,
    automaticStrategies: true
  },
  turnProtection: {
    enabled: false,
    turns: 4
  },
  experimental: {
    allowSubAgents: false,
    customPrompts: false
  },
  protectedFilePatterns: [],
  compress: {
    mode: "range",
    permission: "allow",
    showCompression: false,
    summaryBuffer: true,
    maxContextLimit: 1e5,
    minContextLimit: 5e4,
    nudgeFrequency: 5,
    iterationNudgeThreshold: 15,
    nudgeForce: "soft",
    protectedTools: [...COMPRESS_DEFAULT_PROTECTED_TOOLS],
    protectTags: false,
    protectUserMessages: false
  },
  strategies: {
    deduplication: {
      enabled: true,
      protectedTools: []
    },
    purgeErrors: {
      enabled: true,
      turns: 4,
      protectedTools: []
    }
  }
};
var GLOBAL_CONFIG_DIR = process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, "opencode") : join(homedir(), ".config", "opencode");
var GLOBAL_CONFIG_PATH_JSONC = join(GLOBAL_CONFIG_DIR, "dcp.jsonc");
var GLOBAL_CONFIG_PATH_JSON = join(GLOBAL_CONFIG_DIR, "dcp.json");
function findOpencodeDir(startDir) {
  let current = startDir;
  while (current !== "/") {
    const candidate = join(current, ".opencode");
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}
function getConfigPaths(ctx) {
  const global = existsSync(GLOBAL_CONFIG_PATH_JSONC) ? GLOBAL_CONFIG_PATH_JSONC : existsSync(GLOBAL_CONFIG_PATH_JSON) ? GLOBAL_CONFIG_PATH_JSON : null;
  let configDir = null;
  const opencodeConfigDir = process.env.OPENCODE_CONFIG_DIR;
  if (opencodeConfigDir) {
    const configJsonc = join(opencodeConfigDir, "dcp.jsonc");
    const configJson = join(opencodeConfigDir, "dcp.json");
    configDir = existsSync(configJsonc) ? configJsonc : existsSync(configJson) ? configJson : null;
  }
  let project2 = null;
  if (ctx?.directory) {
    const opencodeDir = findOpencodeDir(ctx.directory);
    if (opencodeDir) {
      const projectJsonc = join(opencodeDir, "dcp.jsonc");
      const projectJson = join(opencodeDir, "dcp.json");
      project2 = existsSync(projectJsonc) ? projectJsonc : existsSync(projectJson) ? projectJson : null;
    }
  }
  return { global, configDir, project: project2 };
}
function createDefaultConfig() {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
  const configContent = `{
  "$schema": "https://raw.githubusercontent.com/Opencode-DCP/opencode-dynamic-context-pruning/master/dcp.schema.json"
}
`;
  writeFileSync(GLOBAL_CONFIG_PATH_JSONC, configContent, "utf-8");
}
function loadConfigFile(configPath) {
  let fileContent = "";
  try {
    fileContent = readFileSync(configPath, "utf-8");
  } catch {
    return { data: null };
  }
  try {
    const parsed = parse2(fileContent, void 0, { allowTrailingComma: true });
    if (parsed === void 0 || parsed === null) {
      return { data: null, parseError: "Config file is empty or invalid" };
    }
    return { data: parsed };
  } catch (error) {
    return { data: null, parseError: error.message || "Failed to parse config" };
  }
}
function mergeStrategies(base, override) {
  if (!override) {
    return base;
  }
  return {
    deduplication: {
      enabled: override.deduplication?.enabled ?? base.deduplication.enabled,
      protectedTools: [
        .../* @__PURE__ */ new Set([
          ...base.deduplication.protectedTools,
          ...override.deduplication?.protectedTools ?? []
        ])
      ]
    },
    purgeErrors: {
      enabled: override.purgeErrors?.enabled ?? base.purgeErrors.enabled,
      turns: override.purgeErrors?.turns ?? base.purgeErrors.turns,
      protectedTools: [
        .../* @__PURE__ */ new Set([
          ...base.purgeErrors.protectedTools,
          ...override.purgeErrors?.protectedTools ?? []
        ])
      ]
    }
  };
}
function mergeCompress(base, override) {
  if (!override) {
    return base;
  }
  return {
    mode: override.mode ?? base.mode,
    permission: override.permission ?? base.permission,
    showCompression: override.showCompression ?? base.showCompression,
    summaryBuffer: override.summaryBuffer ?? base.summaryBuffer,
    maxContextLimit: override.maxContextLimit ?? base.maxContextLimit,
    minContextLimit: override.minContextLimit ?? base.minContextLimit,
    modelMaxLimits: override.modelMaxLimits ?? base.modelMaxLimits,
    modelMinLimits: override.modelMinLimits ?? base.modelMinLimits,
    nudgeFrequency: override.nudgeFrequency ?? base.nudgeFrequency,
    iterationNudgeThreshold: override.iterationNudgeThreshold ?? base.iterationNudgeThreshold,
    nudgeForce: override.nudgeForce ?? base.nudgeForce,
    protectedTools: [.../* @__PURE__ */ new Set([...base.protectedTools, ...override.protectedTools ?? []])],
    protectTags: override.protectTags ?? base.protectTags,
    protectUserMessages: override.protectUserMessages ?? base.protectUserMessages
  };
}
function mergeCommands(base, override) {
  if (!override) {
    return base;
  }
  return {
    enabled: override.enabled ?? base.enabled,
    protectedTools: [.../* @__PURE__ */ new Set([...base.protectedTools, ...override.protectedTools ?? []])]
  };
}
function mergeManualMode(base, override) {
  if (override === void 0) return base;
  return {
    enabled: override.enabled ?? base.enabled,
    automaticStrategies: override.automaticStrategies ?? base.automaticStrategies
  };
}
function mergeExperimental(base, override) {
  if (override === void 0) return base;
  return {
    allowSubAgents: override.allowSubAgents ?? base.allowSubAgents,
    customPrompts: override.customPrompts ?? base.customPrompts
  };
}
function deepCloneConfig(config) {
  return {
    ...config,
    commands: {
      enabled: config.commands.enabled,
      protectedTools: [...config.commands.protectedTools]
    },
    manualMode: {
      enabled: config.manualMode.enabled,
      automaticStrategies: config.manualMode.automaticStrategies
    },
    turnProtection: { ...config.turnProtection },
    experimental: { ...config.experimental },
    protectedFilePatterns: [...config.protectedFilePatterns],
    compress: {
      ...config.compress,
      modelMaxLimits: { ...config.compress.modelMaxLimits },
      modelMinLimits: { ...config.compress.modelMinLimits },
      protectedTools: [...config.compress.protectedTools]
    },
    strategies: {
      deduplication: {
        ...config.strategies.deduplication,
        protectedTools: [...config.strategies.deduplication.protectedTools]
      },
      purgeErrors: {
        ...config.strategies.purgeErrors,
        protectedTools: [...config.strategies.purgeErrors.protectedTools]
      }
    }
  };
}
function mergeLayer(config, data) {
  return {
    enabled: data.enabled ?? config.enabled,
    autoUpdate: data.autoUpdate ?? config.autoUpdate,
    debug: data.debug ?? config.debug,
    pruneNotification: data.pruneNotification ?? config.pruneNotification,
    pruneNotificationType: data.pruneNotificationType ?? config.pruneNotificationType,
    commands: mergeCommands(config.commands, data.commands),
    manualMode: mergeManualMode(config.manualMode, data.manualMode),
    turnProtection: {
      enabled: data.turnProtection?.enabled ?? config.turnProtection.enabled,
      turns: data.turnProtection?.turns ?? config.turnProtection.turns
    },
    experimental: mergeExperimental(config.experimental, data.experimental),
    protectedFilePatterns: [
      .../* @__PURE__ */ new Set([...config.protectedFilePatterns, ...data.protectedFilePatterns ?? []])
    ],
    compress: mergeCompress(config.compress, data.compress),
    strategies: mergeStrategies(config.strategies, data.strategies)
  };
}
function scheduleParseWarning(ctx, title, message) {
  setTimeout(() => {
    try {
      ctx.client.tui.showToast({
        body: {
          title,
          message,
          variant: "warning",
          duration: 7e3
        }
      });
    } catch {
    }
  }, 7e3);
}
function getConfig(ctx) {
  let config = deepCloneConfig(defaultConfig);
  const configPaths = getConfigPaths(ctx);
  if (!configPaths.global) {
    createDefaultConfig();
  }
  const layers = [
    { path: configPaths.global, name: "config", isProject: false },
    { path: configPaths.configDir, name: "configDir config", isProject: true },
    { path: configPaths.project, name: "project config", isProject: true }
  ];
  for (const layer of layers) {
    if (!layer.path) {
      continue;
    }
    const result = loadConfigFile(layer.path);
    if (result.parseError) {
      scheduleParseWarning(
        ctx,
        `DCP: Invalid ${layer.name}`,
        `${layer.path}
${result.parseError}
Using previous/default values`
      );
      continue;
    }
    if (!result.data) {
      continue;
    }
    showConfigWarnings(ctx, layer.path, result.data, layer.isProject);
    config = mergeLayer(config, result.data);
  }
  return config;
}

// lib/compress/message.ts
import { tool } from "@opencode-ai/plugin";

// lib/compress/notification-output.ts
var NOTIFICATION_MARKER = "\n\n\u25A3 DCP | ";
function appendCompressionNotification(result, notification) {
  return notification ? `${result}

${notification}` : result;
}
function stripCompressionNotification(output2) {
  const index = output2.indexOf(NOTIFICATION_MARKER);
  return index === -1 ? output2 : output2.slice(0, index);
}

// lib/token-utils.ts
import * as _anthropicTokenizer from "@anthropic-ai/tokenizer";

// lib/messages/shape.ts
function isMessageWithInfo(message) {
  if (!message || typeof message !== "object") {
    return false;
  }
  const info2 = message.info;
  const parts = message.parts;
  if (!info2 || typeof info2 !== "object") {
    return false;
  }
  return typeof info2.id === "string" && info2.id.length > 0 && typeof info2.sessionID === "string" && info2.sessionID.length > 0 && (info2.role === "user" || info2.role === "assistant") && info2.time && typeof info2.time === "object" && typeof info2.time.created === "number" && Array.isArray(parts);
}
function filterMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.filter(isMessageWithInfo);
}
function filterMessagesInPlace(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  let writeIndex = 0;
  for (const message of messages) {
    if (isMessageWithInfo(message)) {
      messages[writeIndex++] = message;
    }
  }
  messages.length = writeIndex;
  return messages;
}

// lib/messages/query.ts
var getLastUserMessage = (messages, startIndex) => {
  const start = startIndex ?? messages.length - 1;
  for (let i = start; i >= 0; i--) {
    const msg = messages[i];
    if (!isMessageWithInfo(msg)) {
      continue;
    }
    if (msg.info.role === "user" && !isIgnoredUserMessage(msg)) {
      return msg;
    }
  }
  return null;
};
var messageHasCompress = (message) => {
  if (!isMessageWithInfo(message)) {
    return false;
  }
  if (message.info.role !== "assistant") {
    return false;
  }
  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts.some(
    (part) => part.type === "tool" && part.tool === "compress" && part.state?.status === "completed"
  );
};
var isIgnoredUserMessage = (message) => {
  if (!isMessageWithInfo(message)) {
    return false;
  }
  if (message.info.role !== "user") {
    return false;
  }
  const parts = Array.isArray(message.parts) ? message.parts : [];
  if (parts.length === 0) {
    return true;
  }
  for (const part of parts) {
    if (!part.ignored) {
      return false;
    }
  }
  return true;
};
function isProtectedUserMessage(config, message) {
  if (!isMessageWithInfo(message)) {
    return false;
  }
  return config.compress.mode === "message" && config.compress.protectUserMessages && message.info.role === "user" && !isIgnoredUserMessage(message);
}

// lib/token-utils.ts
var anthropicCountTokens = _anthropicTokenizer.countTokens ?? _anthropicTokenizer.default?.countTokens;
function getCurrentTokenUsage(state, messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.info.role !== "assistant") {
      continue;
    }
    const assistantInfo = msg.info;
    if ((assistantInfo.tokens?.output || 0) <= 0) {
      continue;
    }
    if (state.lastCompaction > 0 && (msg.info.time.created < state.lastCompaction || msg.info.summary === true && msg.info.time.created === state.lastCompaction)) {
      return 0;
    }
    const input = assistantInfo.tokens?.input || 0;
    const output2 = assistantInfo.tokens?.output || 0;
    const reasoning = assistantInfo.tokens?.reasoning || 0;
    const cacheRead = assistantInfo.tokens?.cache?.read || 0;
    const cacheWrite = assistantInfo.tokens?.cache?.write || 0;
    return input + output2 + reasoning + cacheRead + cacheWrite;
  }
  return 0;
}
function getCurrentParams(state, messages, logger) {
  const userMsg = getLastUserMessage(messages);
  if (!userMsg) {
    logger.debug("No user message found when determining current params");
    return {
      providerId: void 0,
      modelId: void 0,
      agent: void 0,
      variant: void 0
    };
  }
  const userInfo = userMsg.info;
  const agent = userInfo.agent;
  const providerId = userInfo.model.providerID;
  const modelId = userInfo.model.modelID;
  const variant = userInfo.model.variant;
  return { providerId, modelId, agent, variant };
}
function countTokens2(text) {
  if (!text) return 0;
  try {
    return anthropicCountTokens(text);
  } catch {
    return Math.round(text.length / 4);
  }
}
function estimateTokensBatch(texts) {
  if (texts.length === 0) return 0;
  return countTokens2(texts.join(" "));
}
var COMPACTED_TOOL_OUTPUT_PLACEHOLDER = "[Old tool result content cleared]";
function stringifyToolContent(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}
function extractCompletedToolOutput(part) {
  if (part?.type !== "tool" || part.state?.status !== "completed" || part.state?.output === void 0) {
    return void 0;
  }
  if (part.state?.time?.compacted) {
    return COMPACTED_TOOL_OUTPUT_PLACEHOLDER;
  }
  return stringifyToolContent(part.state.output);
}
function extractToolContent(part) {
  const contents = [];
  if (part?.type !== "tool") {
    return contents;
  }
  if (part.state?.input !== void 0) {
    contents.push(stringifyToolContent(part.state.input));
  }
  const completedOutput = extractCompletedToolOutput(part);
  if (completedOutput !== void 0) {
    contents.push(completedOutput);
  } else if (part.state?.status === "error" && part.state?.error) {
    contents.push(stringifyToolContent(part.state.error));
  }
  return contents;
}
function countToolTokens(part) {
  const contents = extractToolContent(part);
  return estimateTokensBatch(contents);
}
function getTotalToolTokens(state, toolIds) {
  let total = 0;
  for (const id of toolIds) {
    const entry = state.toolParameters.get(id);
    total += entry?.tokenCount ?? 0;
  }
  return total;
}
function countAllMessageTokens(msg) {
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  const texts = [];
  for (const part of parts) {
    if (part.type === "text") {
      texts.push(part.text);
    } else {
      texts.push(...extractToolContent(part));
    }
  }
  if (texts.length === 0) return 0;
  return estimateTokensBatch(texts);
}

// lib/prompts/extensions/tool.ts
function rangeFormat(format2 = "xml") {
  const ids = format2 === "compact" ? "@4@ or @b1@ (include both @ characters)" : "mNNNN or bN";
  return `
THE FORMAT OF COMPRESS

\`\`\`
{
  topic: string,           // Short label (3-5 words) - e.g., "Auth System Exploration"
   content: [               // Independent replacements, each producing one new block
    {
      sources?: string[], // Exact visible sources: ${ids}; may be nonadjacent
      startId?: string,   // Inclusive range start; omit when using sources
      endId?: string,     // Inclusive range end; omit when using sources
      summary: string     // New standalone summary; rewrite old blocks without placeholders
    }
  ]
}
\`\`\``;
}
function messageFormat(format2 = "xml") {
  const ids = format2 === "compact" ? "@4@ (include both @ characters; omit priority labels)" : "mNNNN (ignore metadata attributes like priority)";
  return `
THE FORMAT OF COMPRESS

\`\`\`
{
  topic: string,           // Short label (3-5 words) for the overall batch
  content: [               // One or more messages to compress independently
    {
      messageId: string,   // Raw message ID only: ${ids}
      topic: string,       // Short label (3-5 words) for this one message summary
      summary: string      // Complete technical summary replacing that one message
    }
  ]
}
\`\`\``;
}
var RANGE_FORMAT_EXTENSION = rangeFormat();
var MESSAGE_FORMAT_EXTENSION = messageFormat();

// lib/message-ids.ts
var MESSAGE_REF_REGEX = /^m(\d{4})$/;
var BLOCK_REF_REGEX = /^b([1-9]\d*)$/;
var COMPACT_MESSAGE_REGEX = /^@([1-9]\d*)@$/;
var COMPACT_BLOCK_REGEX = /^@b([1-9]\d*)@$/;
var MESSAGE_ID_TAG_NAME = "dcp-message-id";
var MESSAGE_REF_WIDTH = 4;
var MESSAGE_REF_MIN_INDEX = 1;
var MESSAGE_REF_MAX_INDEX = 9999;
function formatMessageRef(index, format2 = "xml") {
  const max = format2 === "compact" ? Number.MAX_SAFE_INTEGER : MESSAGE_REF_MAX_INDEX;
  if (!Number.isSafeInteger(index) || index < MESSAGE_REF_MIN_INDEX || index > max) {
    throw new Error(`Message ID index out of bounds: ${index}. Supported range is 1-${max}.`);
  }
  return format2 === "compact" ? `@${index}@` : `m${index.toString().padStart(MESSAGE_REF_WIDTH, "0")}`;
}
function formatBlockRef(blockId, format2 = "xml") {
  if (!Number.isInteger(blockId) || blockId < 1) {
    throw new Error(`Invalid block ID: ${blockId}`);
  }
  return format2 === "compact" ? `@b${blockId}@` : `b${blockId}`;
}
function parseMessageRef(ref, format2 = "xml") {
  const normalized = ref.trim().toLowerCase();
  const match = normalized.match(format2 === "compact" ? COMPACT_MESSAGE_REGEX : MESSAGE_REF_REGEX);
  if (!match) {
    return null;
  }
  const index = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(index)) {
    return null;
  }
  const max = format2 === "compact" ? Number.MAX_SAFE_INTEGER : MESSAGE_REF_MAX_INDEX;
  if (index < MESSAGE_REF_MIN_INDEX || index > max) {
    return null;
  }
  return index;
}
function parseBlockRef(ref, format2 = "xml") {
  const normalized = ref.trim().toLowerCase();
  const match = normalized.match(format2 === "compact" ? COMPACT_BLOCK_REGEX : BLOCK_REF_REGEX);
  if (!match) {
    return null;
  }
  const id = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(id) ? id : null;
}
function parseBoundaryId(id, format2 = "xml") {
  const normalized = id.trim().toLowerCase();
  const messageIndex = parseMessageRef(normalized, format2);
  if (messageIndex !== null) {
    return {
      kind: "message",
      ref: formatMessageRef(messageIndex, format2),
      index: messageIndex
    };
  }
  const blockId = parseBlockRef(normalized, format2);
  if (blockId !== null) {
    return {
      kind: "compressed-block",
      ref: formatBlockRef(blockId, format2),
      blockId
    };
  }
  return null;
}
function escapeXmlAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatMessageIdTag(ref, attributes, format2 = "xml") {
  if (format2 === "compact") {
    if (ref === "BLOCKED") return "\n@blocked@";
    const priority = attributes?.priority;
    return `
${ref}${priority ? ` [${priority}]` : ""}`;
  }
  const serializedAttributes = Object.entries(attributes || {}).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => {
    if (name.trim().length === 0 || typeof value !== "string" || value.length === 0) {
      return "";
    }
    return ` ${name}="${escapeXmlAttribute(value)}"`;
  }).join("");
  return `
<${MESSAGE_ID_TAG_NAME}${serializedAttributes}>${ref}</${MESSAGE_ID_TAG_NAME}>`;
}
function assignMessageRefs(state, messages) {
  let assigned = 0;
  let skippedSubAgentPrompt = false;
  for (const message of messages) {
    if (isIgnoredUserMessage(message)) {
      continue;
    }
    if (state.isSubAgent && !skippedSubAgentPrompt && message.info.role === "user") {
      skippedSubAgentPrompt = true;
      continue;
    }
    const rawMessageId = message.info.id;
    if (typeof rawMessageId !== "string" || rawMessageId.length === 0) {
      continue;
    }
    const existingRef = state.messageIds.byRawId.get(rawMessageId);
    if (existingRef) {
      if (state.messageIds.byRef.get(existingRef) !== rawMessageId) {
        state.messageIds.byRef.set(existingRef, rawMessageId);
      }
      continue;
    }
    const ref = allocateNextMessageRef(state);
    state.messageIds.byRawId.set(rawMessageId, ref);
    state.messageIds.byRef.set(ref, rawMessageId);
    assigned++;
  }
  return assigned;
}
function allocateNextMessageRef(state) {
  let candidate = Number.isInteger(state.messageIds.nextRef) ? Math.max(MESSAGE_REF_MIN_INDEX, state.messageIds.nextRef) : MESSAGE_REF_MIN_INDEX;
  const max = state.idFormat === "compact" ? Number.MAX_SAFE_INTEGER : MESSAGE_REF_MAX_INDEX;
  while (candidate <= max) {
    const ref = formatMessageRef(candidate, state.idFormat);
    if (!state.messageIds.byRef.has(ref)) {
      state.messageIds.nextRef = candidate + 1;
      return ref;
    }
    candidate++;
  }
  throw new Error(
    `Message ID alias capacity exceeded. Cannot allocate more than ${formatMessageRef(max, state.idFormat)} aliases in this session.`
  );
}

// lib/compress/search.ts
async function fetchSessionMessages(client, sessionId) {
  const response = await client.session.messages({
    path: { id: sessionId }
  });
  return filterMessages(response?.data || response);
}
function buildSearchContext(state, rawMessages) {
  const rawMessagesById = /* @__PURE__ */ new Map();
  const rawIndexById = /* @__PURE__ */ new Map();
  for (const msg of rawMessages) {
    rawMessagesById.set(msg.info.id, msg);
  }
  for (let index = 0; index < rawMessages.length; index++) {
    const message = rawMessages[index];
    if (!message) {
      continue;
    }
    rawIndexById.set(message.info.id, index);
  }
  const summaryByBlockId = /* @__PURE__ */ new Map();
  for (const [blockId, block] of state.prune.messages.blocksById) {
    if (!block.active) {
      continue;
    }
    summaryByBlockId.set(blockId, block);
  }
  return {
    rawMessages,
    rawMessagesById,
    rawIndexById,
    summaryByBlockId
  };
}
function resolveBoundaryIds(context2, state, startId, endId) {
  const lookup = buildBoundaryLookup(context2, state);
  const issues = [];
  const parsedStartId = parseBoundaryId(startId, state.idFormat);
  const parsedEndId = parseBoundaryId(endId, state.idFormat);
  const messageExample = state.idFormat === "compact" ? "@4@" : "mNNNN";
  const blockExample = state.idFormat === "compact" ? "@b1@" : "bN";
  if (parsedStartId === null) {
    issues.push(
      `startId is invalid. Use an injected message ID (${messageExample}) or block ID (${blockExample}).`
    );
  }
  if (parsedEndId === null) {
    issues.push(
      `endId is invalid. Use an injected message ID (${messageExample}) or block ID (${blockExample}).`
    );
  }
  if (issues.length > 0) {
    throw new Error(
      issues.length === 1 ? issues[0] : issues.map((issue) => `- ${issue}`).join("\n")
    );
  }
  if (!parsedStartId || !parsedEndId) {
    throw new Error("Invalid boundary ID(s)");
  }
  const startReference = lookup.get(parsedStartId.ref);
  const endReference = lookup.get(parsedEndId.ref);
  if (!startReference) {
    issues.push(
      `startId ${parsedStartId.ref} is not available in the current conversation context. Choose an injected ID visible in context.`
    );
  }
  if (!endReference) {
    issues.push(
      `endId ${parsedEndId.ref} is not available in the current conversation context. Choose an injected ID visible in context.`
    );
  }
  if (issues.length > 0) {
    throw new Error(
      issues.length === 1 ? issues[0] : issues.map((issue) => `- ${issue}`).join("\n")
    );
  }
  if (!startReference || !endReference) {
    throw new Error("Failed to resolve boundary IDs");
  }
  if (startReference.rawIndex > endReference.rawIndex) {
    throw new Error(
      `startId ${parsedStartId.ref} appears after endId ${parsedEndId.ref} in the conversation. Start must come before end.`
    );
  }
  return { startReference, endReference };
}
function resolveSelection(context2, startReference, endReference) {
  const startRawIndex = startReference.rawIndex;
  const endRawIndex = endReference.rawIndex;
  const messageIds = [];
  const messageSeen = /* @__PURE__ */ new Set();
  const toolIds = [];
  const toolSeen = /* @__PURE__ */ new Set();
  const requiredBlockIds = [];
  const requiredBlockSeen = /* @__PURE__ */ new Set();
  const messageTokenById = /* @__PURE__ */ new Map();
  for (let index = startRawIndex; index <= endRawIndex; index++) {
    const rawMessage = context2.rawMessages[index];
    if (!rawMessage) {
      continue;
    }
    if (isIgnoredUserMessage(rawMessage)) {
      continue;
    }
    const messageId = rawMessage.info.id;
    if (!messageSeen.has(messageId)) {
      messageSeen.add(messageId);
      messageIds.push(messageId);
    }
    if (!messageTokenById.has(messageId)) {
      messageTokenById.set(messageId, countAllMessageTokens(rawMessage));
    }
    const parts = Array.isArray(rawMessage.parts) ? rawMessage.parts : [];
    for (const part of parts) {
      if (part.type !== "tool" || !part.callID) {
        continue;
      }
      if (toolSeen.has(part.callID)) {
        continue;
      }
      toolSeen.add(part.callID);
      toolIds.push(part.callID);
    }
  }
  const selectedMessageIds = new Set(messageIds);
  const summariesInSelection = [];
  for (const summary of context2.summaryByBlockId.values()) {
    if (!selectedMessageIds.has(summary.anchorMessageId)) {
      continue;
    }
    const anchorIndex = context2.rawIndexById.get(summary.anchorMessageId);
    if (anchorIndex === void 0) {
      continue;
    }
    summariesInSelection.push({
      blockId: summary.blockId,
      rawIndex: anchorIndex
    });
  }
  summariesInSelection.sort((a, b) => a.rawIndex - b.rawIndex || a.blockId - b.blockId);
  for (const summary of summariesInSelection) {
    if (requiredBlockSeen.has(summary.blockId)) {
      continue;
    }
    requiredBlockSeen.add(summary.blockId);
    requiredBlockIds.push(summary.blockId);
  }
  if (messageIds.length === 0) {
    throw new Error(
      "Failed to map boundary matches back to raw messages. Choose boundaries that include original conversation messages."
    );
  }
  return {
    startReference,
    endReference,
    messageIds,
    messageTokenById,
    toolIds,
    requiredBlockIds
  };
}
function resolveAnchorMessageId(startReference) {
  if (startReference.kind === "compressed-block") {
    if (!startReference.anchorMessageId) {
      throw new Error("Failed to map boundary matches back to raw messages");
    }
    return startReference.anchorMessageId;
  }
  if (!startReference.messageId) {
    throw new Error("Failed to map boundary matches back to raw messages");
  }
  return startReference.messageId;
}
function buildBoundaryLookup(context2, state) {
  const lookup = /* @__PURE__ */ new Map();
  for (const [messageRef, messageId] of state.messageIds.byRef) {
    const rawMessage = context2.rawMessagesById.get(messageId);
    if (!rawMessage) {
      continue;
    }
    if (isIgnoredUserMessage(rawMessage)) {
      continue;
    }
    const rawIndex = context2.rawIndexById.get(messageId);
    if (rawIndex === void 0) {
      continue;
    }
    lookup.set(messageRef, {
      kind: "message",
      rawIndex,
      messageId
    });
  }
  const summaries = Array.from(context2.summaryByBlockId.values()).sort(
    (a, b) => a.blockId - b.blockId
  );
  for (const summary of summaries) {
    const anchorMessage = context2.rawMessagesById.get(summary.anchorMessageId);
    if (!anchorMessage) {
      continue;
    }
    if (isIgnoredUserMessage(anchorMessage)) {
      continue;
    }
    const rawIndex = context2.rawIndexById.get(summary.anchorMessageId);
    if (rawIndex === void 0) {
      continue;
    }
    const blockRef = formatBlockRef(summary.blockId, state.idFormat);
    if (!lookup.has(blockRef)) {
      lookup.set(blockRef, {
        kind: "compressed-block",
        rawIndex,
        blockId: summary.blockId,
        anchorMessageId: summary.anchorMessageId
      });
    }
  }
  return lookup;
}

// lib/compress/state.ts
var COMPRESSED_BLOCK_HEADER = "[Compressed conversation section]";
function allocateBlockId(state) {
  const next = state.prune.messages.nextBlockId;
  if (!Number.isInteger(next) || next < 1) {
    state.prune.messages.nextBlockId = 2;
    return 1;
  }
  state.prune.messages.nextBlockId = next + 1;
  return next;
}
function allocateRunId(state) {
  const next = state.prune.messages.nextRunId;
  if (!Number.isInteger(next) || next < 1) {
    state.prune.messages.nextRunId = 2;
    return 1;
  }
  state.prune.messages.nextRunId = next + 1;
  return next;
}
function attachCompressionDuration(messagesState, messageId, callId, durationMs) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return 0;
  }
  let updates = 0;
  for (const block of messagesState.blocksById.values()) {
    if (block.compressMessageId !== messageId || block.compressCallId !== callId) {
      continue;
    }
    block.durationMs = durationMs;
    updates++;
  }
  return updates;
}
function wrapCompressedSummary(blockId, summary, format2 = "xml") {
  const header = COMPRESSED_BLOCK_HEADER;
  const footer = formatMessageIdTag(formatBlockRef(blockId, format2), void 0, format2);
  const body = summary.trim();
  if (body.length === 0) {
    return `${header}
${footer}`;
  }
  return `${header}
${body}

${footer}`;
}
function applyCompressionState(state, input, selection, anchorMessageId, blockId, summary, consumedBlockIds) {
  const messagesState = state.prune.messages;
  const consumed = [...new Set(consumedBlockIds.filter((id) => Number.isInteger(id) && id > 0))];
  const included = [...consumed];
  const effectiveMessageIds = new Set(selection.messageIds);
  const effectiveToolIds = new Set(selection.toolIds);
  for (const consumedBlockId of consumed) {
    const consumedBlock = messagesState.blocksById.get(consumedBlockId);
    if (!consumedBlock) {
      continue;
    }
    for (const messageId of consumedBlock.effectiveMessageIds) {
      effectiveMessageIds.add(messageId);
    }
    for (const toolId of consumedBlock.effectiveToolIds) {
      effectiveToolIds.add(toolId);
    }
  }
  const initiallyActiveMessages = /* @__PURE__ */ new Set();
  for (const messageId of effectiveMessageIds) {
    const entry = messagesState.byMessageId.get(messageId);
    if (entry && entry.activeBlockIds.length > 0) {
      initiallyActiveMessages.add(messageId);
    }
  }
  const initiallyActiveToolIds = /* @__PURE__ */ new Set();
  for (const activeBlockId of messagesState.activeBlockIds) {
    const activeBlock = messagesState.blocksById.get(activeBlockId);
    if (!activeBlock || !activeBlock.active) {
      continue;
    }
    for (const toolId of activeBlock.effectiveToolIds) {
      initiallyActiveToolIds.add(toolId);
    }
  }
  const createdAt = Date.now();
  const block = {
    blockId,
    runId: input.runId,
    active: true,
    deactivatedByUser: false,
    compressedTokens: 0,
    summaryTokens: input.summaryTokens,
    durationMs: 0,
    mode: input.mode,
    topic: input.topic,
    batchTopic: input.batchTopic,
    startId: input.startId,
    endId: input.endId,
    anchorMessageId,
    compressMessageId: input.compressMessageId,
    compressCallId: input.compressCallId,
    includedBlockIds: included,
    consumedBlockIds: consumed,
    parentBlockIds: [],
    directMessageIds: [],
    directToolIds: [],
    effectiveMessageIds: [...effectiveMessageIds],
    effectiveToolIds: [...effectiveToolIds],
    createdAt,
    summary
  };
  messagesState.blocksById.set(blockId, block);
  messagesState.activeBlockIds.add(blockId);
  messagesState.activeByAnchorMessageId.set(anchorMessageId, blockId);
  const deactivatedAt = Date.now();
  for (const consumedBlockId of consumed) {
    const consumedBlock = messagesState.blocksById.get(consumedBlockId);
    if (!consumedBlock || !consumedBlock.active) {
      continue;
    }
    consumedBlock.active = false;
    consumedBlock.deactivatedAt = deactivatedAt;
    consumedBlock.deactivatedByBlockId = blockId;
    if (!consumedBlock.parentBlockIds.includes(blockId)) {
      consumedBlock.parentBlockIds.push(blockId);
    }
    messagesState.activeBlockIds.delete(consumedBlockId);
    const mappedBlockId = messagesState.activeByAnchorMessageId.get(
      consumedBlock.anchorMessageId
    );
    if (mappedBlockId === consumedBlockId) {
      messagesState.activeByAnchorMessageId.delete(consumedBlock.anchorMessageId);
    }
  }
  const removeActiveBlockId = (entry, blockIdToRemove) => {
    if (entry.activeBlockIds.length === 0) {
      return;
    }
    entry.activeBlockIds = entry.activeBlockIds.filter((id) => id !== blockIdToRemove);
  };
  for (const consumedBlockId of consumed) {
    const consumedBlock = messagesState.blocksById.get(consumedBlockId);
    if (!consumedBlock) {
      continue;
    }
    for (const messageId of consumedBlock.effectiveMessageIds) {
      const entry = messagesState.byMessageId.get(messageId);
      if (!entry) {
        continue;
      }
      removeActiveBlockId(entry, consumedBlockId);
    }
  }
  for (const messageId of selection.messageIds) {
    const tokenCount = selection.messageTokenById.get(messageId) || 0;
    const existing = messagesState.byMessageId.get(messageId);
    if (!existing) {
      messagesState.byMessageId.set(messageId, {
        tokenCount,
        allBlockIds: [blockId],
        activeBlockIds: [blockId]
      });
      continue;
    }
    existing.tokenCount = Math.max(existing.tokenCount, tokenCount);
    if (!existing.allBlockIds.includes(blockId)) {
      existing.allBlockIds.push(blockId);
    }
    if (!existing.activeBlockIds.includes(blockId)) {
      existing.activeBlockIds.push(blockId);
    }
  }
  for (const messageId of block.effectiveMessageIds) {
    if (selection.messageTokenById.has(messageId)) {
      continue;
    }
    const existing = messagesState.byMessageId.get(messageId);
    if (!existing) {
      continue;
    }
    if (!existing.allBlockIds.includes(blockId)) {
      existing.allBlockIds.push(blockId);
    }
    if (!existing.activeBlockIds.includes(blockId)) {
      existing.activeBlockIds.push(blockId);
    }
  }
  let compressedTokens = 0;
  const newlyCompressedMessageIds = [];
  for (const messageId of effectiveMessageIds) {
    const entry = messagesState.byMessageId.get(messageId);
    if (!entry) {
      continue;
    }
    const isNowActive = entry.activeBlockIds.length > 0;
    const wasActive = initiallyActiveMessages.has(messageId);
    if (isNowActive && !wasActive) {
      compressedTokens += entry.tokenCount;
      newlyCompressedMessageIds.push(messageId);
    }
  }
  const newlyCompressedToolIds = [];
  for (const toolId of effectiveToolIds) {
    if (!initiallyActiveToolIds.has(toolId)) {
      newlyCompressedToolIds.push(toolId);
    }
  }
  block.directMessageIds = [...newlyCompressedMessageIds];
  block.directToolIds = [...newlyCompressedToolIds];
  block.compressedTokens = compressedTokens;
  state.stats.pruneTokenCounter += compressedTokens;
  state.stats.totalPruneTokens += state.stats.pruneTokenCounter;
  state.stats.pruneTokenCounter = 0;
  return {
    compressedTokens,
    messageIds: selection.messageIds,
    newlyCompressedMessageIds,
    newlyCompressedToolIds
  };
}

// lib/compress/message-utils.ts
var SoftIssue = class extends Error {
  constructor(kind, messageId, message) {
    super(message);
    this.kind = kind;
    this.messageId = messageId;
  }
  kind;
  messageId;
};
function validateArgs(args) {
  if (typeof args.topic !== "string" || args.topic.trim().length === 0) {
    throw new Error("topic is required and must be a non-empty string");
  }
  if (!Array.isArray(args.content) || args.content.length === 0) {
    throw new Error("content is required and must be a non-empty array");
  }
  for (let index = 0; index < args.content.length; index++) {
    const entry = args.content[index];
    const prefix = `content[${index}]`;
    if (typeof entry?.messageId !== "string" || entry.messageId.trim().length === 0) {
      throw new Error(`${prefix}.messageId is required and must be a non-empty string`);
    }
    if (typeof entry?.topic !== "string" || entry.topic.trim().length === 0) {
      throw new Error(`${prefix}.topic is required and must be a non-empty string`);
    }
    if (typeof entry?.summary !== "string" || entry.summary.trim().length === 0) {
      throw new Error(`${prefix}.summary is required and must be a non-empty string`);
    }
  }
}
function formatResult(processedCount, skippedIssues, skippedCount) {
  const messageNoun = processedCount === 1 ? "message" : "messages";
  const processedText = processedCount > 0 ? `Compressed ${processedCount} ${messageNoun} into ${COMPRESSED_BLOCK_HEADER}.` : "Compressed 0 messages.";
  if (skippedCount === 0) {
    return processedText;
  }
  const issueNoun = skippedCount === 1 ? "issue" : "issues";
  const issueLines = skippedIssues.map((issue) => `- ${issue}`).join("\n");
  return `${processedText}
Skipped ${skippedCount} ${issueNoun}:
${issueLines}`;
}
function formatIssues(skippedIssues, skippedCount) {
  const issueNoun = skippedCount === 1 ? "issue" : "issues";
  const issueLines = skippedIssues.map((issue) => `- ${issue}`).join("\n");
  return `Unable to compress any messages. Found ${skippedCount} ${issueNoun}:
${issueLines}`;
}
function issueTemplates(format2) {
  const message = format2 === "compact" ? "@4@" : "mNNNN";
  const block = format2 === "compact" ? "@b1@" : "bN";
  return {
    blocked: [
      "refers to a protected message and cannot be compressed.",
      "refer to protected messages and cannot be compressed."
    ],
    "invalid-format": [
      `is invalid. Use an injected raw message ID of the form ${message}.`,
      `are invalid. Use injected raw message IDs of the form ${message}.`
    ],
    "block-id": [
      `is invalid here. Block IDs like ${block} are not allowed; use an injected ${message} message ID instead.`,
      `are invalid here. Block IDs like ${block} are not allowed; use ${message} message IDs instead.`
    ],
    "not-in-context": [
      `is not available in the current conversation context. Choose an injected ${message} ID visible in context.`,
      `are not available in the current conversation context. Choose injected ${message} IDs visible in context.`
    ],
    protected: [
      "refers to a protected message and cannot be compressed.",
      "refer to protected messages and cannot be compressed."
    ],
    "already-compressed": [
      "is already part of an active compression.",
      "are already part of active compressions."
    ],
    duplicate: [
      "was selected more than once in this batch.",
      "were each selected more than once in this batch."
    ]
  };
}
function formatSkippedGroup(kind, messageIds, format2) {
  const templates = issueTemplates(format2)[kind];
  const ids = messageIds.join(", ");
  const single = messageIds.length === 1;
  const prefix = single ? "messageId" : "messageIds";
  if (!templates) {
    return `${prefix} ${ids}: unknown issue.`;
  }
  return `${prefix} ${ids} ${single ? templates[0] : templates[1]}`;
}
function groupSkippedIssues(issues, format2) {
  const groups = /* @__PURE__ */ new Map();
  const order = [];
  for (const issue of issues) {
    let ids = groups.get(issue.kind);
    if (!ids) {
      ids = [];
      groups.set(issue.kind, ids);
      order.push(issue.kind);
    }
    ids.push(issue.messageId);
  }
  return order.map((kind) => {
    const ids = groups.get(kind);
    return formatSkippedGroup(kind, ids, format2);
  });
}
function resolveMessages(args, searchContext, state, config) {
  const issues = [];
  const plans = [];
  const seenMessageIds = /* @__PURE__ */ new Set();
  for (const entry of args.content) {
    const normalizedMessageId = entry.messageId.trim();
    if (seenMessageIds.has(normalizedMessageId)) {
      issues.push({ kind: "duplicate", messageId: normalizedMessageId });
      continue;
    }
    try {
      const plan = resolveMessage(
        {
          ...entry,
          messageId: normalizedMessageId
        },
        searchContext,
        state,
        config
      );
      seenMessageIds.add(plan.entry.messageId);
      plans.push(plan);
    } catch (error) {
      if (error instanceof SoftIssue) {
        issues.push({ kind: error.kind, messageId: error.messageId });
        continue;
      }
      throw error;
    }
  }
  return {
    plans,
    skippedIssues: groupSkippedIssues(issues, state.idFormat),
    skippedCount: issues.length
  };
}
function resolveMessage(entry, searchContext, state, config) {
  const blocked = state.idFormat === "compact" ? "@blocked@" : "BLOCKED";
  if (entry.messageId.toLowerCase() === blocked.toLowerCase()) {
    throw new SoftIssue("blocked", blocked, "protected message");
  }
  const parsed = parseBoundaryId(entry.messageId, state.idFormat);
  if (!parsed) {
    throw new SoftIssue("invalid-format", entry.messageId, "invalid format");
  }
  if (parsed.kind === "compressed-block") {
    throw new SoftIssue("block-id", entry.messageId, "block ID used");
  }
  const messageId = state.messageIds.byRef.get(parsed.ref);
  const rawMessage = messageId ? searchContext.rawMessagesById.get(messageId) : void 0;
  if (!messageId || !rawMessage || !searchContext.rawIndexById.has(messageId) || isIgnoredUserMessage(rawMessage)) {
    throw new SoftIssue("not-in-context", parsed.ref, "not in context");
  }
  const { startReference, endReference } = resolveBoundaryIds(
    searchContext,
    state,
    parsed.ref,
    parsed.ref
  );
  const selection = resolveSelection(searchContext, startReference, endReference);
  if (isProtectedUserMessage(config, rawMessage)) {
    throw new SoftIssue("protected", parsed.ref, "protected message");
  }
  const pruneEntry = state.prune.messages.byMessageId.get(messageId);
  if (pruneEntry && pruneEntry.activeBlockIds.length > 0) {
    throw new SoftIssue("already-compressed", parsed.ref, "already compressed");
  }
  return {
    entry: {
      messageId: parsed.ref,
      topic: entry.topic,
      summary: entry.summary
    },
    selection,
    anchorMessageId: resolveAnchorMessageId(startReference)
  };
}

// lib/state/persistence.ts
import * as fs from "fs/promises";
import { existsSync as existsSync2 } from "fs";
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";
import { randomUUID } from "crypto";

// lib/state/utils.ts
var isMessageCompacted = (state, msg) => {
  if (!isMessageWithInfo(msg)) {
    return false;
  }
  if (msg.info.time.created < state.lastCompaction) {
    return true;
  }
  const pruneEntry = state.prune.messages.byMessageId.get(msg.info.id);
  if (pruneEntry && pruneEntry.activeBlockIds.length > 0) {
    return true;
  }
  return false;
};
function restoreProtectedEntries(value) {
  if (!Array.isArray(value)) return void 0;
  const entries = [];
  for (const entry of value) {
    if (!entry || typeof entry.text !== "string" || typeof entry.messageId !== "string" || typeof entry.createdAt !== "number" || !Number.isFinite(entry.createdAt) || !Number.isInteger(entry.partIndex) || entry.tool !== void 0 && typeof entry.tool !== "string") return void 0;
    entries.push({
      text: entry.text,
      tool: entry.tool,
      messageId: entry.messageId,
      createdAt: entry.createdAt,
      partIndex: entry.partIndex
    });
  }
  return entries;
}
function serializePruneMessagesState(messagesState) {
  return {
    byMessageId: Object.fromEntries(messagesState.byMessageId),
    blocksById: Object.fromEntries(
      Array.from(messagesState.blocksById.entries()).map(([blockId, block]) => [
        String(blockId),
        block
      ])
    ),
    activeBlockIds: Array.from(messagesState.activeBlockIds),
    activeByAnchorMessageId: Object.fromEntries(messagesState.activeByAnchorMessageId),
    nextBlockId: messagesState.nextBlockId,
    nextRunId: messagesState.nextRunId
  };
}
async function isSubAgentSession(client, sessionID) {
  try {
    const result = await client.session.get({ path: { id: sessionID } });
    return !!result.data?.parentID;
  } catch (error) {
    return false;
  }
}
function findLastCompactionTimestamp(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!isMessageWithInfo(msg)) {
      continue;
    }
    if (msg.info.role === "assistant" && msg.info.summary === true) {
      return msg.info.time.created;
    }
  }
  return 0;
}
function countTurns(state, messages) {
  let turnCount = 0;
  for (const msg of messages) {
    if (!isMessageWithInfo(msg)) {
      continue;
    }
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type === "step-start") {
        turnCount++;
      }
    }
  }
  return turnCount;
}
function loadPruneMap(obj) {
  if (!obj || typeof obj !== "object") {
    return /* @__PURE__ */ new Map();
  }
  const entries = Object.entries(obj).filter(
    (entry) => typeof entry[0] === "string" && typeof entry[1] === "number"
  );
  return new Map(entries);
}
function createPruneMessagesState() {
  return {
    byMessageId: /* @__PURE__ */ new Map(),
    blocksById: /* @__PURE__ */ new Map(),
    activeBlockIds: /* @__PURE__ */ new Set(),
    activeByAnchorMessageId: /* @__PURE__ */ new Map(),
    nextBlockId: 1,
    nextRunId: 1
  };
}
function loadPruneMessagesState(persisted) {
  const state = createPruneMessagesState();
  if (!persisted || typeof persisted !== "object") {
    return state;
  }
  if (typeof persisted.nextBlockId === "number" && Number.isInteger(persisted.nextBlockId)) {
    state.nextBlockId = Math.max(1, persisted.nextBlockId);
  }
  if (typeof persisted.nextRunId === "number" && Number.isInteger(persisted.nextRunId)) {
    state.nextRunId = Math.max(1, persisted.nextRunId);
  }
  if (persisted.byMessageId && typeof persisted.byMessageId === "object") {
    for (const [messageId, entry] of Object.entries(persisted.byMessageId)) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const tokenCount = typeof entry.tokenCount === "number" ? entry.tokenCount : 0;
      const allBlockIds = Array.isArray(entry.allBlockIds) ? [
        ...new Set(
          entry.allBlockIds.filter(
            (id) => Number.isInteger(id) && id > 0
          )
        )
      ] : [];
      const activeBlockIds = Array.isArray(entry.activeBlockIds) ? [
        ...new Set(
          entry.activeBlockIds.filter(
            (id) => Number.isInteger(id) && id > 0
          )
        )
      ] : [];
      state.byMessageId.set(messageId, {
        tokenCount,
        allBlockIds,
        activeBlockIds
      });
    }
  }
  if (persisted.blocksById && typeof persisted.blocksById === "object") {
    for (const [blockIdStr, block] of Object.entries(persisted.blocksById)) {
      const blockId = Number.parseInt(blockIdStr, 10);
      if (!Number.isInteger(blockId) || blockId < 1 || !block || typeof block !== "object") {
        continue;
      }
      const toNumberArray = (value) => Array.isArray(value) ? [
        ...new Set(
          value.filter(
            (item) => Number.isInteger(item) && item > 0
          )
        )
      ] : [];
      const toStringArray = (value) => Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string"))] : [];
      state.blocksById.set(blockId, {
        blockId,
        runId: typeof block.runId === "number" && Number.isInteger(block.runId) && block.runId > 0 ? block.runId : blockId,
        active: block.active === true,
        deactivatedByUser: block.deactivatedByUser === true,
        compressedTokens: typeof block.compressedTokens === "number" && Number.isFinite(block.compressedTokens) ? Math.max(0, block.compressedTokens) : 0,
        summaryTokens: typeof block.summaryTokens === "number" && Number.isFinite(block.summaryTokens) ? Math.max(0, block.summaryTokens) : typeof block.summary === "string" ? countTokens2(block.summary) : 0,
        durationMs: typeof block.durationMs === "number" && Number.isFinite(block.durationMs) ? Math.max(0, block.durationMs) : 0,
        mode: block.mode === "range" || block.mode === "message" ? block.mode : void 0,
        topic: typeof block.topic === "string" ? block.topic : "",
        batchTopic: typeof block.batchTopic === "string" ? block.batchTopic : typeof block.topic === "string" ? block.topic : "",
        startId: typeof block.startId === "string" ? block.startId : "",
        endId: typeof block.endId === "string" ? block.endId : "",
        anchorMessageId: typeof block.anchorMessageId === "string" ? block.anchorMessageId : "",
        compressMessageId: typeof block.compressMessageId === "string" ? block.compressMessageId : "",
        compressCallId: typeof block.compressCallId === "string" ? block.compressCallId : void 0,
        includedBlockIds: toNumberArray(block.includedBlockIds),
        consumedBlockIds: toNumberArray(block.consumedBlockIds),
        parentBlockIds: toNumberArray(block.parentBlockIds),
        directMessageIds: toStringArray(block.directMessageIds),
        directToolIds: toStringArray(block.directToolIds),
        effectiveMessageIds: toStringArray(block.effectiveMessageIds),
        effectiveToolIds: toStringArray(block.effectiveToolIds),
        createdAt: typeof block.createdAt === "number" ? block.createdAt : 0,
        deactivatedAt: typeof block.deactivatedAt === "number" ? block.deactivatedAt : void 0,
        deactivatedByBlockId: typeof block.deactivatedByBlockId === "number" && Number.isInteger(block.deactivatedByBlockId) ? block.deactivatedByBlockId : void 0,
        summary: typeof block.summary === "string" ? block.summary : "",
        sourceRefs: Array.isArray(block.sourceRefs) ? toStringArray(block.sourceRefs) : void 0,
        protectedContent: Array.isArray(block.protectedContent) ? toStringArray(block.protectedContent) : void 0,
        protectedEntries: restoreProtectedEntries(block.protectedEntries),
        archived: block.archived === true
      });
    }
  }
  if (Array.isArray(persisted.activeBlockIds)) {
    for (const blockId of persisted.activeBlockIds) {
      if (!Number.isInteger(blockId) || blockId < 1) {
        continue;
      }
      state.activeBlockIds.add(blockId);
    }
  }
  if (persisted.activeByAnchorMessageId && typeof persisted.activeByAnchorMessageId === "object") {
    for (const [anchorMessageId, blockId] of Object.entries(
      persisted.activeByAnchorMessageId
    )) {
      if (typeof blockId !== "number" || !Number.isInteger(blockId) || blockId < 1) {
        continue;
      }
      state.activeByAnchorMessageId.set(anchorMessageId, blockId);
    }
  }
  for (const [blockId, block] of state.blocksById) {
    if (block.active) {
      state.activeBlockIds.add(blockId);
      if (block.anchorMessageId) {
        state.activeByAnchorMessageId.set(block.anchorMessageId, blockId);
      }
    }
    if (blockId >= state.nextBlockId) {
      state.nextBlockId = blockId + 1;
    }
    if (block.runId >= state.nextRunId) {
      state.nextRunId = block.runId + 1;
    }
  }
  return state;
}
function collectTurnNudgeAnchors(messages) {
  const anchors = /* @__PURE__ */ new Set();
  let pendingUserMessageId = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (messageHasCompress(message)) {
      break;
    }
    if (message.info.role === "user") {
      if (!isIgnoredUserMessage(message)) {
        pendingUserMessageId = message.info.id;
      }
      continue;
    }
    if (message.info.role === "assistant" && pendingUserMessageId) {
      anchors.add(message.info.id);
      anchors.add(pendingUserMessageId);
      pendingUserMessageId = null;
    }
  }
  return anchors;
}
function getActiveSummaryTokenUsage(state) {
  let total = 0;
  for (const blockId of state.prune.messages.activeBlockIds) {
    const block = state.prune.messages.blocksById.get(blockId);
    if (!block || !block.active) {
      continue;
    }
    total += block.summaryTokens;
  }
  return total;
}
function resetOnCompaction(state) {
  state.toolParameters.clear();
  state.prune.tools = /* @__PURE__ */ new Map();
  const previous = state.prune.messages;
  for (const block of previous.blocksById.values()) {
    block.active = false;
    block.archived = true;
  }
  state.prune.messages = createPruneMessagesState();
  state.prune.messages.blocksById = previous.blocksById;
  state.prune.messages.nextBlockId = previous.nextBlockId;
  state.prune.messages.nextRunId = previous.nextRunId;
  state.messageIds = {
    byRawId: /* @__PURE__ */ new Map(),
    byRef: /* @__PURE__ */ new Map(),
    nextRef: 1
  };
  state.nudges = {
    contextLimitAnchors: /* @__PURE__ */ new Set(),
    turnNudgeAnchors: /* @__PURE__ */ new Set(),
    iterationNudgeAnchors: /* @__PURE__ */ new Set()
  };
}

// lib/state/persistence.ts
var STORAGE_DIR = join2(
  process.env.XDG_DATA_HOME || join2(homedir2(), ".local", "share"),
  "opencode",
  "storage",
  "plugin",
  "dcp"
);
async function ensureStorageDir() {
  if (!existsSync2(STORAGE_DIR)) {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}
function getSessionFilePath(sessionId) {
  return join2(STORAGE_DIR, `${sessionId}.json`);
}
var pendingWrites = /* @__PURE__ */ new Map();
async function writePersistedSessionState(sessionId, state, logger) {
  const filePath = getSessionFilePath(sessionId);
  const content = JSON.stringify(state, null, 2);
  const previous = pendingWrites.get(sessionId) ?? Promise.resolve();
  const pending = previous.catch(() => {
  }).then(async () => {
    await ensureStorageDir();
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, content, { encoding: "utf-8", mode: 384 });
      await fs.rename(temporaryPath, filePath);
    } finally {
      await fs.rm(temporaryPath, { force: true }).catch(() => {
      });
    }
  });
  pendingWrites.set(sessionId, pending);
  try {
    await pending;
  } finally {
    if (pendingWrites.get(sessionId) === pending) pendingWrites.delete(sessionId);
  }
  logger.info("Saved session state to disk", {
    sessionId,
    totalTokensSaved: state.stats.totalPruneTokens
  });
}
async function saveSessionState(sessionState, logger, sessionName, strict = false) {
  try {
    if (!sessionState.sessionId) {
      return;
    }
    const state = {
      sessionName,
      manualMode: !!sessionState.manualMode,
      prune: {
        tools: Object.fromEntries(sessionState.prune.tools),
        messages: serializePruneMessagesState(sessionState.prune.messages)
      },
      nudges: {
        contextLimitAnchors: Array.from(sessionState.nudges.contextLimitAnchors),
        turnNudgeAnchors: Array.from(sessionState.nudges.turnNudgeAnchors),
        iterationNudgeAnchors: Array.from(sessionState.nudges.iterationNudgeAnchors)
      },
      stats: sessionState.stats,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await writePersistedSessionState(sessionState.sessionId, state, logger);
  } catch (error) {
    logger.error("Failed to save session state", {
      sessionId: sessionState.sessionId,
      error: error?.message
    });
    if (strict) throw error;
  }
}
async function loadSessionState(sessionId, logger) {
  try {
    await pendingWrites.get(sessionId)?.catch(() => {
    });
    const filePath = getSessionFilePath(sessionId);
    if (!existsSync2(filePath)) {
      return null;
    }
    const content = await fs.readFile(filePath, "utf-8");
    const state = JSON.parse(content);
    const hasPruneTools = state?.prune?.tools && typeof state.prune.tools === "object";
    const hasPruneMessages = state?.prune?.messages && typeof state.prune.messages === "object";
    const hasNudgeFormat = state?.nudges && typeof state.nudges === "object";
    if (!state || !state.prune || !hasPruneTools || !hasPruneMessages || !state.stats || !hasNudgeFormat) {
      logger.warn("Invalid session state file, ignoring", {
        sessionId
      });
      return null;
    }
    const rawContextLimitAnchors = Array.isArray(state.nudges.contextLimitAnchors) ? state.nudges.contextLimitAnchors : [];
    const validAnchors = rawContextLimitAnchors.filter(
      (entry) => typeof entry === "string"
    );
    const dedupedAnchors = [...new Set(validAnchors)];
    if (validAnchors.length !== rawContextLimitAnchors.length) {
      logger.warn("Filtered out malformed contextLimitAnchors entries", {
        sessionId,
        original: rawContextLimitAnchors.length,
        valid: validAnchors.length
      });
    }
    state.nudges.contextLimitAnchors = dedupedAnchors;
    const rawTurnNudgeAnchors = Array.isArray(state.nudges.turnNudgeAnchors) ? state.nudges.turnNudgeAnchors : [];
    const validSoftAnchors = rawTurnNudgeAnchors.filter(
      (entry) => typeof entry === "string"
    );
    const dedupedSoftAnchors = [...new Set(validSoftAnchors)];
    if (validSoftAnchors.length !== rawTurnNudgeAnchors.length) {
      logger.warn("Filtered out malformed turnNudgeAnchors entries", {
        sessionId,
        original: rawTurnNudgeAnchors.length,
        valid: validSoftAnchors.length
      });
    }
    state.nudges.turnNudgeAnchors = dedupedSoftAnchors;
    const rawIterationNudgeAnchors = Array.isArray(state.nudges.iterationNudgeAnchors) ? state.nudges.iterationNudgeAnchors : [];
    const validIterationAnchors = rawIterationNudgeAnchors.filter(
      (entry) => typeof entry === "string"
    );
    const dedupedIterationAnchors = [...new Set(validIterationAnchors)];
    if (validIterationAnchors.length !== rawIterationNudgeAnchors.length) {
      logger.warn("Filtered out malformed iterationNudgeAnchors entries", {
        sessionId,
        original: rawIterationNudgeAnchors.length,
        valid: validIterationAnchors.length
      });
    }
    state.nudges.iterationNudgeAnchors = dedupedIterationAnchors;
    logger.info("Loaded session state from disk", {
      sessionId
    });
    return state;
  } catch (error) {
    logger.warn("Failed to load session state", {
      sessionId,
      error: error?.message
    });
    return null;
  }
}
function emptyPersistedState(manualMode) {
  return {
    manualMode,
    prune: {
      tools: {},
      messages: {
        byMessageId: {},
        blocksById: {},
        activeBlockIds: [],
        activeByAnchorMessageId: {},
        nextBlockId: 1,
        nextRunId: 1
      }
    },
    nudges: {
      contextLimitAnchors: [],
      turnNudgeAnchors: [],
      iterationNudgeAnchors: []
    },
    stats: {
      pruneTokenCounter: 0,
      totalPruneTokens: 0
    },
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function loadManualModeSetting(sessionId, logger) {
  const state = await loadSessionState(sessionId, logger);
  return typeof state?.manualMode === "boolean" ? state.manualMode : void 0;
}
async function saveManualModeSetting(sessionId, manualMode, logger) {
  const existing = await loadSessionState(sessionId, logger);
  const state = existing ?? emptyPersistedState(manualMode);
  state.manualMode = manualMode;
  state.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  await writePersistedSessionState(sessionId, state, logger);
}
async function loadAllSessionStats(logger) {
  const result = {
    totalTokens: 0,
    totalTools: 0,
    totalMessages: 0,
    sessionCount: 0
  };
  try {
    if (!existsSync2(STORAGE_DIR)) {
      return result;
    }
    const files = await fs.readdir(STORAGE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      try {
        const filePath = join2(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, "utf-8");
        const state = JSON.parse(content);
        if (state?.stats?.totalPruneTokens && state?.prune) {
          result.totalTokens += state.stats.totalPruneTokens;
          result.totalTools += state.prune.tools ? Object.keys(state.prune.tools).length : 0;
          result.totalMessages += state.prune.messages?.byMessageId ? Object.keys(state.prune.messages.byMessageId).length : 0;
          result.sessionCount++;
        }
      } catch {
      }
    }
    logger.debug("Loaded all-time stats", result);
  } catch (error) {
    logger.warn("Failed to load all-time stats", { error: error?.message });
  }
  return result;
}

// lib/compress/timing.ts
function buildCompressionTimingKey(messageId, callId) {
  return `${messageId}:${callId}`;
}
function consumeCompressionStart(state, messageId, callId) {
  const key = buildCompressionTimingKey(messageId, callId);
  const start = state.compressionTiming.startsByCallId.get(key);
  state.compressionTiming.startsByCallId.delete(key);
  return start;
}
function resolveCompressionDuration(startedAt, eventTime, partTime) {
  const runningAt = typeof partTime?.start === "number" && Number.isFinite(partTime.start) ? partTime.start : eventTime;
  const pendingToRunningMs = typeof startedAt === "number" && typeof runningAt === "number" ? Math.max(0, runningAt - startedAt) : void 0;
  const toolStart = partTime?.start;
  const toolEnd = partTime?.end;
  const runtimeMs = typeof toolStart === "number" && Number.isFinite(toolStart) && typeof toolEnd === "number" && Number.isFinite(toolEnd) ? Math.max(0, toolEnd - toolStart) : void 0;
  return typeof pendingToRunningMs === "number" ? pendingToRunningMs : runtimeMs;
}
function applyPendingCompressionDurations(state) {
  if (state.compressionTiming.pendingByCallId.size === 0) {
    return 0;
  }
  let updates = 0;
  for (const [key, entry] of state.compressionTiming.pendingByCallId) {
    const applied = attachCompressionDuration(
      state.prune.messages,
      entry.messageId,
      entry.callId,
      entry.durationMs
    );
    if (applied > 0) {
      updates += applied;
      state.compressionTiming.pendingByCallId.delete(key);
    }
  }
  return updates;
}

// lib/state/state.ts
var checkSession = async (client, state, logger, messages, manualModeDefault) => {
  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    return;
  }
  const lastSessionId = lastUserMessage.info.sessionID;
  if (state.sessionId === null || state.sessionId !== lastSessionId) {
    logger.info(`Session changed: ${state.sessionId} -> ${lastSessionId}`);
    try {
      await ensureSessionInitialized(
        client,
        state,
        lastSessionId,
        logger,
        messages,
        manualModeDefault
      );
    } catch (err) {
      logger.error("Failed to initialize session state", { error: err.message });
    }
  }
  const lastCompactionTimestamp = findLastCompactionTimestamp(messages);
  if (lastCompactionTimestamp > state.lastCompaction) {
    state.lastCompaction = lastCompactionTimestamp;
    resetOnCompaction(state);
    logger.info("Detected compaction - reset stale state", {
      timestamp: lastCompactionTimestamp
    });
    saveSessionState(state, logger).catch((error) => {
      logger.warn("Failed to persist state reset after compaction", {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }
  state.currentTurn = countTurns(state, messages);
  await refreshManualMode(state, lastSessionId, logger, manualModeDefault);
};
function createSessionState(idFormat = "xml") {
  return {
    idFormat,
    sessionId: null,
    isSubAgent: false,
    manualMode: false,
    compressPermission: void 0,
    pendingManualTrigger: null,
    prune: {
      tools: /* @__PURE__ */ new Map(),
      messages: createPruneMessagesState()
    },
    nudges: {
      contextLimitAnchors: /* @__PURE__ */ new Set(),
      turnNudgeAnchors: /* @__PURE__ */ new Set(),
      iterationNudgeAnchors: /* @__PURE__ */ new Set()
    },
    stats: {
      pruneTokenCounter: 0,
      totalPruneTokens: 0
    },
    compressionTiming: {
      startsByCallId: /* @__PURE__ */ new Map(),
      pendingByCallId: /* @__PURE__ */ new Map()
    },
    toolParameters: /* @__PURE__ */ new Map(),
    subAgentResultCache: /* @__PURE__ */ new Map(),
    toolIdList: [],
    messageIds: {
      byRawId: /* @__PURE__ */ new Map(),
      byRef: /* @__PURE__ */ new Map(),
      nextRef: 1
    },
    lastCompaction: 0,
    currentTurn: 0,
    modelContextLimit: void 0,
    systemPromptTokens: void 0
  };
}
function resetSessionState(state) {
  state.sessionId = null;
  state.isSubAgent = false;
  state.manualMode = false;
  state.compressPermission = void 0;
  state.pendingManualTrigger = null;
  state.prune = {
    tools: /* @__PURE__ */ new Map(),
    messages: createPruneMessagesState()
  };
  state.nudges = {
    contextLimitAnchors: /* @__PURE__ */ new Set(),
    turnNudgeAnchors: /* @__PURE__ */ new Set(),
    iterationNudgeAnchors: /* @__PURE__ */ new Set()
  };
  state.stats = {
    pruneTokenCounter: 0,
    totalPruneTokens: 0
  };
  state.toolParameters.clear();
  state.subAgentResultCache.clear();
  state.toolIdList = [];
  state.messageIds = {
    byRawId: /* @__PURE__ */ new Map(),
    byRef: /* @__PURE__ */ new Map(),
    nextRef: 1
  };
  state.lastCompaction = 0;
  state.currentTurn = 0;
  state.modelContextLimit = void 0;
  state.systemPromptTokens = void 0;
}
async function ensureSessionInitialized(client, state, sessionId, logger, messages, manualModeEnabled) {
  if (state.sessionId === sessionId) {
    return;
  }
  resetSessionState(state);
  state.manualMode = manualModeEnabled ? "active" : false;
  state.sessionId = sessionId;
  const isSubAgent = await isSubAgentSession(client, sessionId);
  state.isSubAgent = isSubAgent;
  state.lastCompaction = findLastCompactionTimestamp(messages);
  state.currentTurn = countTurns(state, messages);
  state.nudges.turnNudgeAnchors = collectTurnNudgeAnchors(messages);
  const persisted = await loadSessionState(sessionId, logger);
  if (persisted === null) {
    return;
  }
  if (typeof persisted.manualMode === "boolean") {
    state.manualMode = persisted.manualMode ? "active" : false;
  }
  state.prune.tools = loadPruneMap(persisted.prune.tools);
  state.prune.messages = loadPruneMessagesState(persisted.prune.messages);
  state.nudges.contextLimitAnchors = new Set(persisted.nudges.contextLimitAnchors || []);
  state.nudges.turnNudgeAnchors = /* @__PURE__ */ new Set([
    ...state.nudges.turnNudgeAnchors,
    ...persisted.nudges.turnNudgeAnchors || []
  ]);
  state.nudges.iterationNudgeAnchors = new Set(
    persisted.nudges.iterationNudgeAnchors || []
  );
  state.stats = {
    pruneTokenCounter: persisted.stats?.pruneTokenCounter || 0,
    totalPruneTokens: persisted.stats?.totalPruneTokens || 0
  };
  const applied = applyPendingCompressionDurations(state);
  if (applied > 0) {
    await saveSessionState(state, logger);
  }
}
async function refreshManualMode(state, sessionId, logger, manualModeDefault) {
  if (state.manualMode === "compress-pending") {
    return;
  }
  const persisted = await loadManualModeSetting(sessionId, logger);
  const enabled = persisted ?? manualModeDefault;
  state.manualMode = enabled ? "active" : false;
}

// lib/state/tool-cache.ts
var MAX_TOOL_CACHE_SIZE = 1e3;
function syncToolCache(state, config, logger, messages) {
  try {
    logger.info("Syncing tool parameters from OpenCode messages");
    let turnCounter = 0;
    for (const msg of messages) {
      if (isMessageCompacted(state, msg)) {
        continue;
      }
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      for (const part of parts) {
        if (part.type === "step-start") {
          turnCounter++;
          continue;
        }
        if (part.type !== "tool" || !part.callID) {
          continue;
        }
        const turnProtectionEnabled = config.turnProtection.enabled;
        const turnProtectionTurns = config.turnProtection.turns;
        const isProtectedByTurn = turnProtectionEnabled && turnProtectionTurns > 0 && state.currentTurn - turnCounter < turnProtectionTurns;
        if (state.toolParameters.has(part.callID)) {
          continue;
        }
        if (isProtectedByTurn) {
          continue;
        }
        const tokenCount = countToolTokens(part);
        state.toolParameters.set(part.callID, {
          tool: part.tool,
          parameters: part.state?.input ?? {},
          metadata: "metadata" in part.state ? part.state.metadata : void 0,
          status: part.state.status,
          error: part.state.status === "error" ? part.state.error : void 0,
          turn: turnCounter,
          tokenCount
        });
        logger.info(
          `Cached tool id: ${part.callID} (turn ${turnCounter}${tokenCount !== void 0 ? `, ${tokenCount} tokens` : ""})`
        );
      }
    }
    logger.info(
      `Synced cache - size: ${state.toolParameters.size}, currentTurn: ${state.currentTurn}`
    );
    trimToolParametersCache(state);
  } catch (error) {
    logger.warn("Failed to sync tool parameters from OpenCode", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
function trimToolParametersCache(state) {
  if (state.toolParameters.size <= MAX_TOOL_CACHE_SIZE) {
    return;
  }
  const keysToRemove = Array.from(state.toolParameters.keys()).slice(
    0,
    state.toolParameters.size - MAX_TOOL_CACHE_SIZE
  );
  for (const key of keysToRemove) {
    state.toolParameters.delete(key);
  }
}

// lib/protected-patterns.ts
function normalizePath(input) {
  return input.replaceAll("\\", "/");
}
function escapeRegExpChar(ch) {
  return /[\\.^$+{}()|\[\]]/.test(ch) ? `\\${ch}` : ch;
}
function matchesGlob(inputPath, pattern) {
  if (!pattern) return false;
  const input = normalizePath(inputPath);
  const pat = normalizePath(pattern);
  let regex = "^";
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === "*") {
      const next = pat[i + 1];
      if (next === "*") {
        const after = pat[i + 2];
        if (after === "/") {
          regex += "(?:.*/)?";
          i += 2;
          continue;
        }
        regex += ".*";
        i++;
        continue;
      }
      regex += "[^/]*";
      continue;
    }
    if (ch === "?") {
      regex += "[^/]";
      continue;
    }
    if (ch === "/") {
      regex += "/";
      continue;
    }
    regex += escapeRegExpChar(ch);
  }
  regex += "$";
  return new RegExp(regex).test(input);
}
function getFilePathsFromParameters(tool5, parameters) {
  if (typeof parameters !== "object" || parameters === null) {
    return [];
  }
  const paths = [];
  const params = parameters;
  if ((tool5 === "apply_patch" || tool5 === "patch") && typeof params.patchText === "string") {
    const pathRegex = /\*\*\* (?:Add|Delete|Update) File: ([^\n\r]+)/g;
    let match;
    while ((match = pathRegex.exec(params.patchText)) !== null) {
      paths.push(match[1].trim());
    }
  }
  if (tool5 === "multiedit") {
    if (typeof params.filePath === "string") {
      paths.push(params.filePath);
    }
    if (Array.isArray(params.edits)) {
      for (const edit of params.edits) {
        if (edit && typeof edit.filePath === "string") {
          paths.push(edit.filePath);
        }
      }
    }
  }
  if (typeof params.filePath === "string") {
    paths.push(params.filePath);
  }
  if (["read", "write", "edit"].includes(tool5) && typeof params.path === "string") {
    paths.push(params.path);
  }
  return [...new Set(paths)].filter((p) => p.length > 0);
}
function isFilePathProtected(filePaths, patterns) {
  if (!filePaths || filePaths.length === 0) return false;
  if (!patterns || patterns.length === 0) return false;
  return filePaths.some((path) => patterns.some((pattern) => matchesGlob(path, pattern)));
}
var GLOB_CHARS = /[*?]/;
function isToolNameProtected(toolName, patterns) {
  if (!toolName || !patterns || patterns.length === 0) return false;
  const exactPatterns = /* @__PURE__ */ new Set();
  const globPatterns = [];
  for (const pattern of patterns) {
    if (GLOB_CHARS.test(pattern)) {
      globPatterns.push(pattern);
    } else {
      exactPatterns.add(pattern);
    }
  }
  if (exactPatterns.has(toolName)) {
    return true;
  }
  return globPatterns.some((pattern) => matchesGlob(toolName, pattern));
}
function isToolProtected(tool5, input, tools, files, metadata) {
  const calls = [{ tool: tool5, input }];
  if (tool5 === "execute" && Array.isArray(metadata?.toolCalls)) {
    for (const call of metadata.toolCalls) {
      if (call && typeof call.tool === "string") calls.push(call);
    }
  }
  return calls.some(
    (call) => isToolNameProtected(call.tool, tools) || isFilePathProtected(getFilePathsFromParameters(call.tool, call.input), files)
  );
}

// lib/strategies/deduplication.ts
var deduplicate = (state, logger, config, messages) => {
  if (state.manualMode && !config.manualMode.automaticStrategies) {
    return;
  }
  if (!config.strategies.deduplication.enabled) {
    return;
  }
  const allToolIds = state.toolIdList;
  if (allToolIds.length === 0) {
    return;
  }
  const unprunedIds = allToolIds.filter((id) => !state.prune.tools.has(id));
  if (unprunedIds.length === 0) {
    return;
  }
  const protectedTools = config.strategies.deduplication.protectedTools;
  const signatureMap = /* @__PURE__ */ new Map();
  for (const id of unprunedIds) {
    const metadata = state.toolParameters.get(id);
    if (!metadata) {
      continue;
    }
    if (isToolProtected(
      metadata.tool,
      metadata.parameters,
      protectedTools,
      config.protectedFilePatterns,
      metadata.metadata
    )) {
      continue;
    }
    const signature = createToolSignature(metadata.tool, metadata.parameters);
    if (!signatureMap.has(signature)) {
      signatureMap.set(signature, []);
    }
    const ids = signatureMap.get(signature);
    if (ids) {
      ids.push(id);
    }
  }
  const newPruneIds = [];
  for (const [, ids] of signatureMap.entries()) {
    if (ids.length > 1) {
      const idsToRemove = ids.slice(0, -1);
      newPruneIds.push(...idsToRemove);
    }
  }
  state.stats.totalPruneTokens += getTotalToolTokens(state, newPruneIds);
  if (newPruneIds.length > 0) {
    for (const id of newPruneIds) {
      const entry = state.toolParameters.get(id);
      state.prune.tools.set(id, entry?.tokenCount ?? 0);
    }
    logger.debug(`Marked ${newPruneIds.length} duplicate tool calls for pruning`);
  }
};
function createToolSignature(tool5, parameters) {
  if (!parameters) {
    return tool5;
  }
  const normalized = normalizeParameters(parameters);
  const sorted = sortObjectKeys(normalized);
  return `${tool5}::${JSON.stringify(sorted)}`;
}
function normalizeParameters(params) {
  if (typeof params !== "object" || params === null) return params;
  if (Array.isArray(params)) return params;
  const normalized = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== null) {
      normalized[key] = value;
    }
  }
  return normalized;
}
function sortObjectKeys(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

// lib/strategies/purge-errors.ts
var purgeErrors = (state, logger, config, messages) => {
  if (state.manualMode && !config.manualMode.automaticStrategies) {
    return;
  }
  if (!config.strategies.purgeErrors.enabled) {
    return;
  }
  const allToolIds = state.toolIdList;
  if (allToolIds.length === 0) {
    return;
  }
  const unprunedIds = allToolIds.filter((id) => !state.prune.tools.has(id));
  if (unprunedIds.length === 0) {
    return;
  }
  const protectedTools = config.strategies.purgeErrors.protectedTools;
  const turnThreshold = Math.max(1, config.strategies.purgeErrors.turns);
  const newPruneIds = [];
  for (const id of unprunedIds) {
    const metadata = state.toolParameters.get(id);
    if (!metadata) {
      continue;
    }
    if (isToolProtected(
      metadata.tool,
      metadata.parameters,
      protectedTools,
      config.protectedFilePatterns,
      metadata.metadata
    )) {
      continue;
    }
    if (metadata.status !== "error") {
      continue;
    }
    const turnAge = state.currentTurn - metadata.turn;
    if (turnAge >= turnThreshold) {
      newPruneIds.push(id);
    }
  }
  if (newPruneIds.length > 0) {
    state.stats.totalPruneTokens += getTotalToolTokens(state, newPruneIds);
    for (const id of newPruneIds) {
      const entry = state.toolParameters.get(id);
      state.prune.tools.set(id, entry?.tokenCount ?? 0);
    }
    logger.debug(
      `Marked ${newPruneIds.length} error tool calls for pruning (older than ${turnThreshold} turns)`
    );
  }
};

// lib/ui/utils.ts
function extractParameterKey(tool5, parameters) {
  if (!parameters) return "";
  if (tool5 === "read" && parameters.filePath) {
    const offset = parameters.offset;
    const limit = parameters.limit;
    if (offset !== void 0 && limit !== void 0) {
      return `${parameters.filePath} (lines ${offset}-${offset + limit})`;
    }
    if (offset !== void 0) {
      return `${parameters.filePath} (lines ${offset}+)`;
    }
    if (limit !== void 0) {
      return `${parameters.filePath} (lines 0-${limit})`;
    }
    return parameters.filePath;
  }
  if ((tool5 === "write" || tool5 === "edit" || tool5 === "multiedit") && parameters.filePath) {
    return parameters.filePath;
  }
  if (tool5 === "apply_patch" && typeof parameters.patchText === "string") {
    const pathRegex = /\*\*\* (?:Add|Delete|Update) File: ([^\n\r]+)/g;
    const paths = [];
    let match;
    while ((match = pathRegex.exec(parameters.patchText)) !== null) {
      paths.push(match[1].trim());
    }
    if (paths.length > 0) {
      const uniquePaths = [...new Set(paths)];
      const count = uniquePaths.length;
      const plural = count > 1 ? "s" : "";
      if (count === 1) return uniquePaths[0];
      if (count === 2) return uniquePaths.join(", ");
      return `${count} file${plural}: ${uniquePaths[0]}, ${uniquePaths[1]}...`;
    }
    return "patch";
  }
  if (tool5 === "list") {
    return parameters.path || "(current directory)";
  }
  if (tool5 === "glob") {
    if (parameters.pattern) {
      const pathInfo = parameters.path ? ` in ${parameters.path}` : "";
      return `"${parameters.pattern}"${pathInfo}`;
    }
    return "(unknown pattern)";
  }
  if (tool5 === "grep") {
    if (parameters.pattern) {
      const pathInfo = parameters.path ? ` in ${parameters.path}` : "";
      return `"${parameters.pattern}"${pathInfo}`;
    }
    return "(unknown pattern)";
  }
  if (tool5 === "bash") {
    if (parameters.description) return parameters.description;
    if (parameters.command) {
      return parameters.command.length > 50 ? parameters.command.substring(0, 50) + "..." : parameters.command;
    }
  }
  if (tool5 === "webfetch" && parameters.url) {
    return parameters.url;
  }
  if (tool5 === "websearch" && parameters.query) {
    return `"${parameters.query}"`;
  }
  if (tool5 === "codesearch" && parameters.query) {
    return `"${parameters.query}"`;
  }
  if (tool5 === "todowrite") {
    return `${parameters.todos?.length || 0} todos`;
  }
  if (tool5 === "todoread") {
    return "read todo list";
  }
  if (tool5 === "task" && parameters.description) {
    return parameters.description;
  }
  if (tool5 === "skill" && parameters.name) {
    return parameters.name;
  }
  if (tool5 === "lsp") {
    const op = parameters.operation || "lsp";
    const path = parameters.filePath || "";
    const line = parameters.line;
    const char = parameters.character;
    if (path && line !== void 0 && char !== void 0) {
      return `${op} ${path}:${line}:${char}`;
    }
    if (path) {
      return `${op} ${path}`;
    }
    return op;
  }
  if (tool5 === "question") {
    const questions = parameters.questions;
    if (Array.isArray(questions) && questions.length > 0) {
      const headers = questions.map((q) => q.header || "").filter(Boolean).slice(0, 3);
      const count = questions.length;
      const plural = count > 1 ? "s" : "";
      if (headers.length > 0) {
        const suffix = count > 3 ? ` (+${count - 3} more)` : "";
        return `${count} question${plural}: ${headers.join(", ")}${suffix}`;
      }
      return `${count} question${plural}`;
    }
    return "question";
  }
  const paramStr = JSON.stringify(parameters);
  if (paramStr === "{}" || paramStr === "[]" || paramStr === "null") {
    return "";
  }
  return paramStr.substring(0, 50);
}
function formatTokenCount(tokens, compact) {
  const suffix = compact ? "" : " tokens";
  if (tokens >= 1e3) {
    return `${(tokens / 1e3).toFixed(1)}K`.replace(".0K", "K") + suffix;
  }
  return tokens.toString() + suffix;
}
function truncate(str, maxLen = 60) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
function formatProgressBar(messageIds, prunedMessages, recentMessageIds, width = 50) {
  const ACTIVE = "\u2588";
  const PRUNED = "\u2591";
  const RECENT = "\u28FF";
  const recentSet = new Set(recentMessageIds);
  const total = messageIds.length;
  if (total === 0) return `\u2502${PRUNED.repeat(width)}\u2502`;
  const bar = new Array(width).fill(ACTIVE);
  for (let m = 0; m < total; m++) {
    const msgId = messageIds[m];
    const start = Math.floor(m / total * width);
    const end = Math.floor((m + 1) / total * width);
    if (recentSet.has(msgId)) {
      for (let i = start; i < end; i++) {
        bar[i] = RECENT;
      }
    } else if (prunedMessages.has(msgId)) {
      for (let i = start; i < end; i++) {
        bar[i] = PRUNED;
      }
    }
  }
  return `\u2502${bar.join("")}\u2502`;
}
function cacheSystemPromptTokens(state, messages) {
  let firstInputTokens = 0;
  for (const msg of messages) {
    if (msg.info.role !== "assistant") {
      continue;
    }
    const info2 = msg.info;
    const input = info2?.tokens?.input || 0;
    const cacheRead = info2?.tokens?.cache?.read || 0;
    const cacheWrite = info2?.tokens?.cache?.write || 0;
    if (input > 0 || cacheRead > 0 || cacheWrite > 0) {
      firstInputTokens = input + cacheRead + cacheWrite;
      break;
    }
  }
  if (firstInputTokens <= 0) {
    state.systemPromptTokens = void 0;
    return;
  }
  let firstUserText = "";
  for (const msg of messages) {
    if (msg.info.role !== "user" || isIgnoredUserMessage(msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type === "text" && !part.ignored) {
        firstUserText += part.text;
      }
    }
    break;
  }
  const estimatedSystemTokens = Math.max(0, firstInputTokens - countTokens2(firstUserText));
  state.systemPromptTokens = estimatedSystemTokens > 0 ? estimatedSystemTokens : void 0;
}
function shortenPath(input, workingDirectory) {
  const inPathMatch = input.match(/^(.+) in (.+)$/);
  if (inPathMatch) {
    const prefix = inPathMatch[1];
    const pathPart = inPathMatch[2];
    const shortenedPath = shortenSinglePath(pathPart, workingDirectory);
    return `${prefix} in ${shortenedPath}`;
  }
  return shortenSinglePath(input, workingDirectory);
}
function shortenSinglePath(path, workingDirectory) {
  if (workingDirectory) {
    if (path.startsWith(workingDirectory + "/")) {
      return path.slice(workingDirectory.length + 1);
    }
    if (path === workingDirectory) {
      return ".";
    }
  }
  return path;
}
function formatPrunedItemsList(pruneToolIds, toolMetadata, workingDirectory) {
  const lines = [];
  for (const id of pruneToolIds) {
    const metadata = toolMetadata.get(id);
    if (metadata) {
      const paramKey = extractParameterKey(metadata.tool, metadata.parameters);
      if (paramKey) {
        const displayKey = truncate(shortenPath(paramKey, workingDirectory), 60);
        lines.push(`\u2192 ${metadata.tool}: ${displayKey}`);
      } else {
        lines.push(`\u2192 ${metadata.tool}`);
      }
    }
  }
  const knownCount = pruneToolIds.filter((id) => toolMetadata.has(id)).length;
  const unknownCount = pruneToolIds.length - knownCount;
  if (unknownCount > 0) {
    lines.push(`\u2192 (${unknownCount} tool${unknownCount > 1 ? "s" : ""} with unknown metadata)`);
  }
  return lines;
}

// lib/ui/notification.ts
var TOAST_BODY_MAX_LINES = 12;
var TOAST_SUMMARY_MAX_CHARS = 600;
function truncateToastBody(body, maxLines = TOAST_BODY_MAX_LINES) {
  const lines = body.split("\n");
  if (lines.length <= maxLines) {
    return body;
  }
  const kept = lines.slice(0, maxLines - 1);
  const remaining = lines.length - maxLines + 1;
  return kept.join("\n") + `
... and ${remaining} more`;
}
function truncateToastSummary(summary, maxChars = TOAST_SUMMARY_MAX_CHARS) {
  if (summary.length <= maxChars) {
    return summary;
  }
  return summary.slice(0, maxChars - 3) + "...";
}
function buildCompressionSummary(entries, state) {
  if (entries.length === 1) {
    return entries[0]?.summary ?? "";
  }
  return entries.map((entry) => {
    const topic = state.prune.messages.blocksById.get(entry.blockId)?.topic ?? "(unknown topic)";
    return `### ${topic}
${entry.summary}`;
  }).join("\n\n");
}
function getCompressionLabel(entries) {
  const runId = entries[0]?.runId;
  if (runId === void 0) {
    return "Compression";
  }
  return `Compression #${runId}`;
}
function formatCompressionMetrics(removedTokens, summaryTokens) {
  const metrics = [`-${formatTokenCount(removedTokens, true)} removed`];
  if (summaryTokens > 0) {
    metrics.push(`+${formatTokenCount(summaryTokens, true)} summary`);
  }
  return metrics.join(", ");
}
function getConsumedSummaryTokens(state, blockId) {
  const block = state.prune.messages.blocksById.get(blockId);
  return [...new Set(block?.consumedBlockIds ?? [])].reduce((total, consumedBlockId) => {
    return total + (state.prune.messages.blocksById.get(consumedBlockId)?.summaryTokens ?? 0);
  }, 0);
}
async function createCompressNotification(client, logger, config, state, entries, batchTopic, sessionMessageIds) {
  if (config.pruneNotification === "off") {
    return;
  }
  if (entries.length === 0) {
    return;
  }
  let message;
  const compressionLabel = getCompressionLabel(entries);
  const summary = buildCompressionSummary(entries, state);
  const summaryTokens = entries.reduce((total, entry) => total + entry.summaryTokens, 0);
  const summaryTokensStr = formatTokenCount(summaryTokens);
  const compressedTokens = entries.reduce((total, entry) => {
    const compressionBlock = state.prune.messages.blocksById.get(entry.blockId);
    if (!compressionBlock) {
      logger.error("Compression block missing for notification", {
        compressionId: entry.blockId,
        sessionId: state.sessionId
      });
      return total;
    }
    return total + compressionBlock.compressedTokens + getConsumedSummaryTokens(state, entry.blockId);
  }, 0);
  const newlyCompressedMessageIds = [];
  const newlyCompressedToolIds = [];
  const seenMessageIds = /* @__PURE__ */ new Set();
  const seenToolIds = /* @__PURE__ */ new Set();
  const compressedSummaryIds = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const compressionBlock = state.prune.messages.blocksById.get(entry.blockId);
    if (!compressionBlock) {
      continue;
    }
    for (const blockId of compressionBlock.consumedBlockIds) {
      compressedSummaryIds.add(blockId);
    }
    for (const messageId of compressionBlock.directMessageIds) {
      if (seenMessageIds.has(messageId)) {
        continue;
      }
      seenMessageIds.add(messageId);
      newlyCompressedMessageIds.push(messageId);
    }
    for (const toolId of compressionBlock.directToolIds) {
      if (seenToolIds.has(toolId)) {
        continue;
      }
      seenToolIds.add(toolId);
      newlyCompressedToolIds.push(toolId);
    }
  }
  const topic = batchTopic ?? (entries.length === 1 ? state.prune.messages.blocksById.get(entries[0]?.blockId ?? -1)?.topic ?? "(unknown topic)" : "(unknown topic)");
  let totalSummaryTokens = 0;
  let totalRemovedSummaryTokens = 0;
  for (const block of state.prune.messages.blocksById.values()) {
    totalSummaryTokens += block.summaryTokens;
    totalRemovedSummaryTokens += getConsumedSummaryTokens(state, block.blockId);
  }
  const totalGross = state.stats.totalPruneTokens + state.stats.pruneTokenCounter + totalRemovedSummaryTokens;
  const notificationHeader = `\u25A3 DCP | ${formatCompressionMetrics(totalGross, totalSummaryTokens)}`;
  if (config.pruneNotification === "minimal") {
    message = `${notificationHeader} \u2014 ${compressionLabel}`;
  } else {
    message = notificationHeader;
    const activePrunedMessages = /* @__PURE__ */ new Map();
    for (const [messageId, entry] of state.prune.messages.byMessageId) {
      if (entry.activeBlockIds.length > 0) {
        activePrunedMessages.set(messageId, entry.tokenCount);
      }
    }
    const progressBar = formatProgressBar(
      sessionMessageIds,
      activePrunedMessages,
      newlyCompressedMessageIds,
      50
    );
    message += `

${progressBar}`;
    message += `
\u25A3 ${compressionLabel} ${formatCompressionMetrics(compressedTokens, summaryTokens)}`;
    message += `
\u2192 Topic: ${topic}`;
    message += `
\u2192 Items: ${newlyCompressedMessageIds.length} messages compressed, ${compressedSummaryIds.size} summaries compressed`;
    if (newlyCompressedToolIds.length > 0) {
      message += `, ${newlyCompressedToolIds.length} tools compressed`;
    }
    if (config.compress.showCompression) {
      message += `
\u2192 Compression (~${summaryTokensStr}): ${summary}`;
    }
  }
  if (config.pruneNotificationType === "toast") {
    let toastMessage = message;
    if (config.compress.showCompression) {
      const truncatedSummary = truncateToastSummary(summary);
      if (truncatedSummary !== summary) {
        toastMessage = toastMessage.replace(
          `
\u2192 Compression (~${summaryTokensStr}): ${summary}`,
          `
\u2192 Compression (~${summaryTokensStr}): ${truncatedSummary}`
        );
      }
    }
    toastMessage = config.pruneNotification === "minimal" ? toastMessage : truncateToastBody(toastMessage);
    await client.tui.showToast({
      body: {
        title: "DCP: Compress Notification",
        message: toastMessage,
        variant: "info",
        duration: 5e3
      }
    });
    return;
  }
  return message;
}
async function sendIgnoredMessage(client, sessionID, text, params, logger) {
  const agent = params.agent || void 0;
  const variant = params.variant || void 0;
  const model = params.providerId && params.modelId ? {
    providerID: params.providerId,
    modelID: params.modelId
  } : void 0;
  try {
    await client.session.prompt({
      path: {
        id: sessionID
      },
      body: {
        noReply: true,
        agent,
        model,
        variant,
        parts: [
          {
            type: "text",
            text,
            ignored: true
          }
        ]
      }
    });
  } catch (error) {
    logger.error("Failed to send notification", { error: error.message });
  }
}

// lib/ui/compression-report.ts
function isCompressionReport(part) {
  return part.type === "text" && part.ignored === true && part.metadata?.dcpCompressionReport === true;
}
async function showCompressionReport(client, sessionID, messageID, toolPartID, report2) {
  const partID = `${toolPartID}_dcp`;
  const fence = "`".repeat(Math.max(3, ...[...report2.matchAll(/`+/g)].map(([run]) => run.length + 1)));
  const part = {
    id: partID,
    sessionID,
    messageID,
    type: "text",
    text: `${fence}text
${report2}
${fence}`,
    ignored: true,
    metadata: { dcpCompressionReport: true }
  };
  const transport = client._client ?? client.client;
  if (!transport?.patch) throw new Error("Host client does not support updating message parts");
  await transport.patch({
    url: "/session/{sessionID}/message/{messageID}/part/{partID}",
    path: { sessionID, messageID, partID },
    body: part,
    headers: { "Content-Type": "application/json" },
    throwOnError: true
  });
}

// lib/compress/pipeline.ts
async function prepareSession(ctx, toolCtx, title) {
  await refreshManualMode(ctx.state, toolCtx.sessionID, ctx.logger, ctx.config.manualMode.enabled);
  if (ctx.state.manualMode && ctx.state.manualMode !== "compress-pending") {
    throw new Error(
      "Manual mode: compress blocked. Do not retry until `<compress triggered manually>` appears in user context."
    );
  }
  await toolCtx.ask({
    permission: "compress",
    patterns: ["*"],
    always: ["*"],
    metadata: {}
  });
  toolCtx.metadata({ title });
  const rawMessages = await fetchSessionMessages(ctx.client, toolCtx.sessionID);
  await ensureSessionInitialized(
    ctx.client,
    ctx.state,
    toolCtx.sessionID,
    ctx.logger,
    rawMessages,
    ctx.config.manualMode.enabled
  );
  assignMessageRefs(ctx.state, rawMessages);
  deduplicate(ctx.state, ctx.logger, ctx.config, rawMessages);
  purgeErrors(ctx.state, ctx.logger, ctx.config, rawMessages);
  return {
    rawMessages,
    searchContext: buildSearchContext(ctx.state, rawMessages)
  };
}
async function finalizeSession(ctx, toolCtx, rawMessages, entries, batchTopic) {
  if (ctx.state.manualMode === "compress-pending") {
    ctx.state.manualMode = false;
    await refreshManualMode(
      ctx.state,
      toolCtx.sessionID,
      ctx.logger,
      ctx.config.manualMode.enabled
    );
  }
  applyPendingCompressionDurations(ctx.state);
  await saveSessionState(ctx.state, ctx.logger);
  const sessionMessageIds = rawMessages.filter((msg) => !isIgnoredUserMessage(msg)).map((msg) => msg.info.id);
  const notification = await createCompressNotification(
    ctx.client,
    ctx.logger,
    ctx.config,
    ctx.state,
    entries,
    batchTopic,
    sessionMessageIds
  );
  if (!notification) return;
  const message = rawMessages.find((message2) => message2.info.id === toolCtx.messageID);
  const callID = ctx.state.prune.messages.blocksById.get(entries[0]?.blockId ?? -1)?.compressCallId;
  const calls = message?.parts.filter((part) => part.type === "tool" && part.tool === "compress") ?? [];
  const toolPart = calls.find((part) => part.type === "tool" && part.callID === callID) ?? (!callID && calls.length === 1 ? calls[0] : void 0);
  if (ctx.state.idFormat === "compact") return notification;
  try {
    if (message?.info.role !== "assistant" || !toolPart || !toolCtx.messageID) {
      throw new Error("Cannot locate the assistant compression tool part");
    }
    await showCompressionReport(ctx.client, toolCtx.sessionID, toolCtx.messageID, toolPart.id, notification);
  } catch (error) {
    ctx.logger.warn("Could not display compression report; keeping it in tool output", { error: String(error) });
    return notification;
  }
}

// lib/compress/protected-dedup.ts
function compareProtectedEntries(a, b, context2) {
  const aIndex = context2.rawIndexById.get(a.messageId);
  const bIndex = context2.rawIndexById.get(b.messageId);
  if (aIndex !== void 0 && bIndex !== void 0) return aIndex - bIndex || a.partIndex - b.partIndex;
  return a.createdAt - b.createdAt || a.messageId.localeCompare(b.messageId) || a.partIndex - b.partIndex;
}
function protectionKey(entry) {
  if (entry.tool === "skill" && /^\n\nThe following protected tools were used in this conversation as well:\n### Tool: skill\n<skill_content name="[^"\n]+">\n/.test(entry.text)) {
    const files = /\n<skill_files>\n(?:<file>[^\r\n]*<\/file>\n)*\n?<\/skill_files>\n<\/skill_content>\s*$/.exec(entry.text);
    const baseDirectory = entry.text.lastIndexOf("\nBase directory for this skill: ");
    if (files && baseDirectory >= 0 && baseDirectory < files.index) {
      return "skill:" + entry.text.slice(0, files.index) + "\n</skill_content>";
    }
  }
  return "text:" + entry.text;
}
function deduplicateProtectedEntries(entries, context2) {
  const unique = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const key = protectionKey(entry);
    const previous = unique.get(key);
    if (!previous || compareProtectedEntries(entry, previous, context2) > 0) unique.set(key, entry);
  }
  return [...unique.values()];
}

// lib/compress/protected-content.ts
function appendProtectedUserMessages(summary, selection, searchContext, state, enabled) {
  if (!enabled) return summary;
  const userTexts = [];
  for (const messageId of selection.messageIds) {
    const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId);
    if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
      continue;
    }
    const message = searchContext.rawMessagesById.get(messageId);
    if (!message) continue;
    if (message.info.role !== "user") continue;
    if (isIgnoredUserMessage(message)) continue;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        userTexts.push(part.text);
        break;
      }
    }
  }
  if (userTexts.length === 0) {
    return summary;
  }
  const heading = "\n\nThe following user messages were sent in this conversation verbatim:";
  const body = userTexts.map((text) => `
${text}`).join("");
  return summary + heading + body;
}
function appendProtectedPromptInfo(summary, selection, searchContext, state, enabled) {
  if (!enabled) return summary;
  const protectedTexts = [];
  for (const messageId of selection.messageIds) {
    const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId);
    if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
      continue;
    }
    const message = searchContext.rawMessagesById.get(messageId);
    if (!message) continue;
    if (message.info.role !== "user") continue;
    if (isIgnoredUserMessage(message)) continue;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      if (part.type !== "text" || typeof part.text !== "string") continue;
      protectedTexts.push(...extractProtectedPromptInfo(part.text));
    }
  }
  if (protectedTexts.length === 0) {
    return summary;
  }
  const heading = "\n\nThe following protected prompt information was included in this conversation verbatim:";
  const body = protectedTexts.map((text) => `
${text}`).join("");
  return summary + heading + body;
}
function extractProtectedPromptInfo(text) {
  const protectedTexts = [];
  const protectTagRegex = /<protect>([\s\S]*?)<\/protect>/gi;
  for (const match of text.matchAll(protectTagRegex)) {
    const protectedText = match[1]?.trim();
    if (protectedText) {
      protectedTexts.push(protectedText);
    }
  }
  return protectedTexts;
}
async function collectProtectedToolEntries(_client, state, _allowSubAgents, selection, searchContext, protectedTools, protectedFilePatterns = []) {
  const protectedOutputs = [];
  for (const messageId of selection.messageIds) {
    const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId);
    if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
      continue;
    }
    const message = searchContext.rawMessagesById.get(messageId);
    if (!message) continue;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const [partIndex, part] of parts.entries()) {
      if (part.type === "tool" && part.callID) {
        if (part.tool === "task" || part.tool === "subagent") continue;
        if (isToolProtected(
          part.tool,
          part.state.input,
          protectedTools,
          protectedFilePatterns,
          "metadata" in part.state ? part.state.metadata : void 0
        )) {
          let output2 = "";
          if (part.state?.status === "completed" && part.state?.output) {
            output2 = typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output);
          }
          if (output2) {
            protectedOutputs.push({
              text: `

The following protected tools were used in this conversation as well:
### Tool: ${part.tool}
${output2}`,
              tool: part.tool,
              messageId,
              createdAt: message.info.time.created,
              partIndex
            });
          }
        }
      }
    }
  }
  return protectedOutputs;
}
function selectLatestTodo(entries, context2) {
  const isTodo = (entry) => entry.tool === "todowrite" || entry.tool === "todoread";
  let latest;
  for (const entry of entries) {
    if (isTodo(entry) && (!latest || compareProtectedEntries(entry, latest, context2) > 0)) latest = entry;
  }
  return entries.filter((entry) => !isTodo(entry) || entry === latest);
}
async function appendProtectedTools(client, state, allowSubAgents, summary, selection, searchContext, protectedTools, protectedFilePatterns = []) {
  const entries = await collectProtectedToolEntries(
    client,
    state,
    allowSubAgents,
    selection,
    searchContext,
    protectedTools,
    protectedFilePatterns
  );
  return summary + deduplicateProtectedEntries(selectLatestTodo(entries, searchContext), searchContext).map((entry) => entry.text).join("");
}

// lib/compress/message.ts
function buildSchema(format2) {
  return {
    topic: tool.schema.string().describe(
      "Short label (3-5 words) for the overall batch - e.g., 'Closed Research Notes'"
    ),
    content: tool.schema.array(
      tool.schema.object({
        messageId: tool.schema.string().describe(
          `Raw message ID to compress (e.g. ${formatMessageRef(1, format2)})`
        ),
        topic: tool.schema.string().describe("Short label (3-5 words) for this one message summary"),
        summary: tool.schema.string().describe("Complete technical summary replacing that one message")
      })
    ).describe("Batch of individual message summaries to create in one tool call")
  };
}
function createCompressMessageTool(ctx) {
  ctx.prompts.reload();
  const runtimePrompts = ctx.prompts.getRuntimePrompts();
  return tool({
    description: runtimePrompts.compressMessage + messageFormat(ctx.state.idFormat),
    args: buildSchema(ctx.state.idFormat),
    async execute(args, toolCtx) {
      const input = args;
      validateArgs(input);
      const callId = typeof toolCtx.callID === "string" ? toolCtx.callID : void 0;
      const { rawMessages, searchContext } = await prepareSession(
        ctx,
        toolCtx,
        `Compress Message: ${input.topic}`
      );
      const { plans, skippedIssues, skippedCount } = resolveMessages(
        input,
        searchContext,
        ctx.state,
        ctx.config
      );
      if (plans.length === 0 && skippedCount > 0) {
        throw new Error(formatIssues(skippedIssues, skippedCount));
      }
      const notifications = [];
      const preparedPlans = [];
      for (const plan of plans) {
        const summaryWithPromptInfo = appendProtectedPromptInfo(
          plan.entry.summary,
          plan.selection,
          searchContext,
          ctx.state,
          ctx.config.compress.protectTags
        );
        const summaryWithTools = await appendProtectedTools(
          ctx.client,
          ctx.state,
          ctx.config.experimental.allowSubAgents,
          summaryWithPromptInfo,
          plan.selection,
          searchContext,
          ctx.config.compress.protectedTools,
          ctx.config.protectedFilePatterns
        );
        preparedPlans.push({
          plan,
          summaryWithTools
        });
      }
      const runId = allocateRunId(ctx.state);
      for (const { plan, summaryWithTools } of preparedPlans) {
        const blockId = allocateBlockId(ctx.state);
        const storedSummary = wrapCompressedSummary(
          blockId,
          summaryWithTools,
          ctx.state.idFormat
        );
        const summaryTokens = countTokens2(storedSummary);
        applyCompressionState(
          ctx.state,
          {
            topic: plan.entry.topic,
            batchTopic: input.topic,
            startId: plan.entry.messageId,
            endId: plan.entry.messageId,
            mode: "message",
            runId,
            compressMessageId: toolCtx.messageID,
            compressCallId: callId,
            summaryTokens
          },
          plan.selection,
          plan.anchorMessageId,
          blockId,
          storedSummary,
          []
        );
        notifications.push({
          blockId,
          runId,
          summary: summaryWithTools,
          summaryTokens
        });
      }
      const notification = await finalizeSession(ctx, toolCtx, rawMessages, notifications, input.topic);
      return appendCompressionNotification(formatResult(plans.length, skippedIssues, skippedCount), notification);
    }
  });
}

// lib/compress/hierarchical.ts
import { tool as tool2 } from "@opencode-ai/plugin";

// lib/compress/history-annotation.ts
var HISTORY_PREFIX = "[DCP-edited history, not original input: summary omitted after successful compression to avoid duplication; original stored as b";
var HISTORY_SUFFIX = ". Active summaries are provided separately. This is expected and requires no corrective compression.]";
var LEGACY_HISTORY_ANNOTATION = /^\[Summary stored in DCP block b\d+; earlier versions are archived\.\]$/;
function formatCompressionHistoryAnnotation(blockId) {
  return `${HISTORY_PREFIX}${blockId}${HISTORY_SUFFIX}`;
}
function isCompressionHistoryAnnotation(summary) {
  const text = summary.trim();
  if (LEGACY_HISTORY_ANNOTATION.test(text)) return true;
  if (!text.startsWith(HISTORY_PREFIX) || !text.endsWith(HISTORY_SUFFIX)) return false;
  return /^\d+$/.test(text.slice(HISTORY_PREFIX.length, -HISTORY_SUFFIX.length));
}

// lib/messages/sync.ts
function sortBlocksByCreation(a, b) {
  const createdAtDiff = a.createdAt - b.createdAt;
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }
  return a.blockId - b.blockId;
}
var syncCompressionBlocks = (state, logger, messages) => {
  const messagesState = state.prune.messages;
  if (!messagesState?.blocksById?.size) {
    return;
  }
  const messageIds = new Set(messages.map((msg) => msg.info.id));
  const messageById = new Map(messages.map((message) => [message.info.id, message]));
  const previousActiveBlockIds = new Set(
    Array.from(messagesState.blocksById.values()).filter((block) => block.active).map((block) => block.blockId)
  );
  messagesState.activeBlockIds.clear();
  messagesState.activeByAnchorMessageId.clear();
  const now = Date.now();
  const missingOriginBlockIds = [];
  const orderedBlocks = Array.from(messagesState.blocksById.values()).sort(sortBlocksByCreation);
  const previousDeactivations = new Map(orderedBlocks.map((block) => [block.blockId, {
    at: block.deactivatedAt,
    by: block.deactivatedByBlockId
  }]));
  for (const block of orderedBlocks) {
    const origin = messageById.get(block.compressMessageId);
    if (block.archived || origin && origin.info.time.created < state.lastCompaction) {
      block.archived = true;
      block.active = false;
      continue;
    }
    const hasOriginMessage = typeof block.compressMessageId === "string" && block.compressMessageId.length > 0 && messageIds.has(block.compressMessageId);
    if (!hasOriginMessage) {
      block.active = false;
      block.deactivatedAt ??= now;
      block.deactivatedByBlockId = void 0;
      missingOriginBlockIds.push(block.blockId);
      continue;
    }
    if (block.deactivatedByUser) {
      block.active = false;
      if (block.deactivatedAt === void 0) {
        block.deactivatedAt = now;
      }
      block.deactivatedByBlockId = void 0;
      continue;
    }
    for (const consumedBlockId of block.consumedBlockIds) {
      if (!messagesState.activeBlockIds.has(consumedBlockId)) {
        continue;
      }
      const consumedBlock = messagesState.blocksById.get(consumedBlockId);
      if (consumedBlock) {
        consumedBlock.active = false;
        const previous = previousDeactivations.get(consumedBlockId);
        consumedBlock.deactivatedAt = previous?.by === block.blockId ? previous.at ?? now : now;
        consumedBlock.deactivatedByBlockId = block.blockId;
        const mappedBlockId = messagesState.activeByAnchorMessageId.get(
          consumedBlock.anchorMessageId
        );
        if (mappedBlockId === consumedBlock.blockId) {
          messagesState.activeByAnchorMessageId.delete(consumedBlock.anchorMessageId);
        }
      }
      messagesState.activeBlockIds.delete(consumedBlockId);
    }
    block.active = true;
    block.deactivatedAt = void 0;
    block.deactivatedByBlockId = void 0;
    messagesState.activeBlockIds.add(block.blockId);
    if (messageIds.has(block.anchorMessageId)) {
      messagesState.activeByAnchorMessageId.set(block.anchorMessageId, block.blockId);
    }
  }
  for (const entry of messagesState.byMessageId.values()) {
    const allBlockIds = Array.isArray(entry.allBlockIds) ? [...new Set(entry.allBlockIds.filter((id) => Number.isInteger(id) && id > 0))] : [];
    entry.allBlockIds = allBlockIds;
    entry.activeBlockIds = allBlockIds.filter((id) => messagesState.activeBlockIds.has(id));
  }
  const nextActiveBlockIds = messagesState.activeBlockIds;
  let deactivatedCount = 0;
  let reactivatedCount = 0;
  for (const blockId of previousActiveBlockIds) {
    if (!nextActiveBlockIds.has(blockId)) {
      deactivatedCount++;
    }
  }
  for (const blockId of nextActiveBlockIds) {
    if (!previousActiveBlockIds.has(blockId)) {
      reactivatedCount++;
    }
  }
  if (missingOriginBlockIds.length > 0 || deactivatedCount > 0 || reactivatedCount > 0) {
    logger.info("Synced compress block state", {
      missingOriginCount: missingOriginBlockIds.length,
      deactivatedCount,
      reactivatedCount
    });
  }
};

// lib/compress/hierarchical-protection.ts
function promptEntries(selection, context2, state, protectUsers, protectTags) {
  const entries = [];
  for (const messageId of selection.messageIds) {
    const message = context2.rawMessagesById.get(messageId);
    if (!message) throw new Error("Original message unavailable: cannot reconstruct legacy protected content.");
    const one = { ...selection, messageIds: [messageId] };
    for (const text of [
      appendProtectedUserMessages("", one, context2, state, protectUsers),
      appendProtectedPromptInfo("", one, context2, state, protectTags)
    ]) {
      if (text) entries.push({ text, messageId, createdAt: message.info.time.created, partIndex: -1 });
    }
  }
  return entries;
}
async function migrateLegacyEntries(block, ctx, selection, context2, state) {
  if (block.protectedContent?.length === 0) return [];
  const oldSelection = { ...selection, messageIds: block.effectiveMessageIds };
  const entries = promptEntries(oldSelection, context2, state, true, true);
  const names = /* @__PURE__ */ new Set();
  for (const messageId of oldSelection.messageIds) {
    for (const part of context2.rawMessagesById.get(messageId).parts) {
      if (part.type === "tool" && part.tool !== "task" && part.tool !== "subagent") names.add(part.tool);
    }
  }
  entries.push(...await collectProtectedToolEntries(ctx.client, state, false, oldSelection, context2, [...names]));
  const archived = block.protectedContent?.join("") ?? block.summary;
  return entries.filter((entry) => archived.includes(entry.text.replace(/^\n\nThe following[^\n]*\n/, "")));
}
async function collectHierarchicalProtection(ctx, selection, context2) {
  const state = {
    ...ctx.state,
    prune: { ...ctx.state.prune, messages: { ...ctx.state.prune.messages, byMessageId: /* @__PURE__ */ new Map() } }
  };
  const entries = promptEntries(
    selection,
    context2,
    state,
    ctx.config.compress.protectUserMessages,
    ctx.config.compress.protectTags
  );
  entries.push(...await collectProtectedToolEntries(
    ctx.client,
    state,
    ctx.config.experimental.allowSubAgents,
    selection,
    context2,
    ctx.config.compress.protectedTools,
    ctx.config.protectedFilePatterns
  ));
  for (const blockId of selection.requiredBlockIds) {
    const block = context2.summaryByBlockId.get(blockId);
    const inherited = block.protectedEntries ?? await migrateLegacyEntries(block, ctx, selection, context2, state);
    entries.push(...inherited.filter((entry) => entry.tool !== "task" && entry.tool !== "subagent"));
  }
  return deduplicateProtectedEntries(selectLatestTodo(entries, context2), context2);
}

// lib/messages/utils.ts
import { createHash } from "crypto";
var SUMMARY_ID_HASH_LENGTH = 16;
var DCP_BLOCK_ID_TAG_REGEX = /(<dcp-message-id(?=[\s>])[^>]*>)b\d+(<\/dcp-message-id>)/g;
var DCP_PAIRED_TAG_REGEX = /<dcp[^>]*>[\s\S]*?<\/dcp[^>]*>/gi;
var DCP_UNPAIRED_TAG_REGEX = /<\/?dcp[^>]*>/gi;
var INJECTED_MESSAGE_ID_SUFFIX_REGEX = /(?<=\n)<dcp-message-id[^>]*>m\d+<\/dcp-message-id>\s*$/;
var HALLUCINATED_PARAMETER_SUFFIX_REGEX = /(?<=\n)m\d+<\/parameter>\s*$/;
var COMPACT_TAG_REGEX = /@(?:[1-9]\d*|b[1-9]\d*|blocked)@(?:[ \t]+\[(?:low|medium|high)\])?/gi;
var generateStableId = (prefix, seed) => {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, SUMMARY_ID_HASH_LENGTH);
  return `${prefix}_${hash}`;
};
var createSyntheticUserMessage = (baseMessage, content, stableSeed) => {
  const userInfo = baseMessage.info;
  const now = Date.now();
  const deterministicSeed = stableSeed?.trim() || userInfo.id;
  const messageId = generateStableId("msg_dcp_summary", deterministicSeed);
  const partId = generateStableId("prt_dcp_summary", deterministicSeed);
  return {
    info: {
      id: messageId,
      sessionID: userInfo.sessionID,
      role: "user",
      agent: userInfo.agent,
      model: userInfo.model,
      time: { created: now }
    },
    parts: [
      {
        id: partId,
        sessionID: userInfo.sessionID,
        messageID: messageId,
        type: "text",
        text: content
      }
    ]
  };
};
var createSyntheticTextPart = (baseMessage, content, stableSeed) => {
  const userInfo = baseMessage.info;
  const deterministicSeed = stableSeed?.trim() || userInfo.id;
  const partId = generateStableId("prt_dcp_text", deterministicSeed);
  return {
    id: partId,
    sessionID: userInfo.sessionID,
    messageID: userInfo.id,
    type: "text",
    text: content
  };
};
var appendToLastTextPart = (message, injection) => {
  const textPart = findLastTextPart(message);
  if (!textPart) {
    return false;
  }
  return appendToTextPart(textPart, injection);
};
var findLastTextPart = (message) => {
  for (let i = message.parts.length - 1; i >= 0; i--) {
    const part = message.parts[i];
    if (part.type === "text") {
      return part;
    }
  }
  return null;
};
var appendToTextPart = (part, injection) => {
  if (typeof part.text !== "string") {
    return false;
  }
  const normalizedInjection = injection.replace(/^\n+/, "");
  if (!normalizedInjection.trim()) {
    return false;
  }
  if (part.text.includes(normalizedInjection)) {
    return true;
  }
  const baseText = part.text.replace(/\n*$/, "");
  part.text = baseText.length > 0 ? `${baseText}

${normalizedInjection}` : normalizedInjection;
  return true;
};
var appendToAllToolParts = (message, tag) => {
  let injected = false;
  for (const part of message.parts) {
    if (part.type === "tool") {
      injected = appendToToolPart(part, tag) || injected;
    }
  }
  return injected;
};
var appendToToolPart = (part, tag) => {
  if (part.state?.status !== "completed" || typeof part.state.output !== "string") {
    return false;
  }
  if (part.state.output.includes(tag)) {
    return true;
  }
  part.state.output = `${part.state.output}${tag}`;
  return true;
};
var hasContent = (message) => {
  return message.parts.some(
    (part) => part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0 || part.type === "tool" && part.state?.status === "completed" && typeof part.state.output === "string"
  );
};
function buildToolIdList(state, messages) {
  const toolIds = [];
  for (const msg of messages) {
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    if (parts.length > 0) {
      for (const part of parts) {
        if (part.type === "tool" && part.callID && part.tool) {
          toolIds.push(part.callID);
        }
      }
    }
  }
  state.toolIdList = toolIds;
  return toolIds;
}
var replaceBlockIdsWithBlocked = (text, format2 = "xml") => {
  if (format2 === "compact") return text.replace(/@b[1-9]\d*@/gi, "@blocked@");
  return text.replace(DCP_BLOCK_ID_TAG_REGEX, "$1BLOCKED$2");
};
var stripHallucinationsFromString = (text, format2 = "xml") => {
  if (format2 === "compact") text = text.replace(COMPACT_TAG_REGEX, "");
  const withoutKnownSuffixes = text.replace(INJECTED_MESSAGE_ID_SUFFIX_REGEX, "").replace(HALLUCINATED_PARAMETER_SUFFIX_REGEX, "");
  return withoutKnownSuffixes.replace(DCP_PAIRED_TAG_REGEX, "").replace(DCP_UNPAIRED_TAG_REGEX, "");
};
var stripHallucinations = (messages, format2 = "xml") => {
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        part.text = stripHallucinationsFromString(part.text, format2);
      }
      if (part.type === "tool" && part.state?.status === "completed" && typeof part.state.output === "string") {
        part.state.output = stripHallucinationsFromString(part.state.output, format2);
      }
    }
  }
};

// lib/messages/compress-inputs.ts
function pruneCompressionInputs(state, messages) {
  const blocksByMessage = /* @__PURE__ */ new Map();
  for (const block of state.prune.messages.blocksById.values()) {
    const blocks = blocksByMessage.get(block.compressMessageId) ?? [];
    blocks.push(block);
    blocksByMessage.set(block.compressMessageId, blocks);
  }
  for (const message of messages) {
    const blocks = blocksByMessage.get(message.info.id);
    if (!blocks) continue;
    const calls = message.parts.filter((part) => part.type === "tool" && part.tool === "compress");
    for (const part of calls) {
      if (part.type !== "tool" || part.state.status !== "completed") continue;
      const matching = blocks.filter((block) => block.compressCallId === part.callID || !block.compressCallId && calls.length === 1).sort((a, b) => a.blockId - b.blockId);
      const input = part.state.input;
      const entries = input?.content;
      if (!Array.isArray(entries) || matching.length !== entries.length || !matching.length) continue;
      part.state.output = stripCompressionNotification(part.state.output);
      part.state.input = {
        ...input,
        content: entries.map((entry, index) => entry && typeof entry.summary === "string" ? { ...entry, summary: formatCompressionHistoryAnnotation(matching[index].blockId) } : entry)
      };
    }
  }
}

// lib/messages/prune.ts
var PRUNED_TOOL_OUTPUT_REPLACEMENT = "[Output removed to save context - information superseded or no longer needed]";
var PRUNED_TOOL_ERROR_INPUT_REPLACEMENT = "[input removed due to failed tool call]";
var PRUNED_QUESTION_INPUT_REPLACEMENT = "[questions removed - see output for user's answers]";
var prune = (state, logger, config, messages, summaryBase) => {
  for (const message of messages) {
    message.parts = message.parts.filter((part) => !isCompressionReport(part));
  }
  filterCompressedRanges(state, logger, config, messages, summaryBase);
  pruneCompressionInputs(state, messages);
  pruneToolOutputs(state, logger, messages);
  pruneToolInputs(state, logger, messages);
  pruneToolErrors(state, logger, messages);
};
var pruneToolOutputs = (state, logger, messages) => {
  for (const msg of messages) {
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type !== "tool") {
        continue;
      }
      if (!state.prune.tools.has(part.callID)) {
        continue;
      }
      if (part.state.status !== "completed") {
        continue;
      }
      if (part.tool === "question" || part.tool === "edit" || part.tool === "write") {
        continue;
      }
      part.state.output = PRUNED_TOOL_OUTPUT_REPLACEMENT;
    }
  }
};
var pruneToolInputs = (state, logger, messages) => {
  for (const msg of messages) {
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type !== "tool") {
        continue;
      }
      if (!state.prune.tools.has(part.callID)) {
        continue;
      }
      if (part.state.status !== "completed") {
        continue;
      }
      if (part.tool !== "question") {
        continue;
      }
      if (part.state.input?.questions !== void 0) {
        part.state.input.questions = PRUNED_QUESTION_INPUT_REPLACEMENT;
      }
    }
  }
};
var pruneToolErrors = (state, logger, messages) => {
  for (const msg of messages) {
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type !== "tool") {
        continue;
      }
      if (!state.prune.tools.has(part.callID)) {
        continue;
      }
      if (part.state.status !== "error") {
        continue;
      }
      const input = part.state.input;
      if (input && typeof input === "object") {
        for (const key of Object.keys(input)) {
          if (typeof input[key] === "string") {
            input[key] = PRUNED_TOOL_ERROR_INPUT_REPLACEMENT;
          }
        }
      }
    }
  }
};
var filterCompressedRanges = (state, logger, config, messages, summaryBase) => {
  if (state.prune.messages.byMessageId.size === 0 && state.prune.messages.activeByAnchorMessageId.size === 0) {
    return;
  }
  const result = [];
  for (const msg of messages) {
    const msgId = msg.info.id;
    const blockId = state.prune.messages.activeByAnchorMessageId.get(msgId);
    const summary = blockId !== void 0 ? state.prune.messages.blocksById.get(blockId) : void 0;
    if (summary) {
      const rawSummaryContent = summary.summary;
      if (summary.active !== true || typeof rawSummaryContent !== "string" || rawSummaryContent.length === 0) {
        logger.warn("Skipping malformed compress summary", {
          anchorMessageId: msgId,
          blockId: summary.blockId
        });
      } else {
        const msgIndex = messages.indexOf(msg);
        const userMessage = getLastUserMessage(messages, msgIndex) ?? summaryBase;
        if (userMessage) {
          const userInfo = userMessage.info;
          let renderedSummary = rawSummaryContent;
          if (state.idFormat === "compact") {
            renderedSummary = renderedSummary.replace(
              /<dcp-message-id>b(\d+)<\/dcp-message-id>\s*$/i,
              (_, id) => formatBlockRef(Number(id), "compact")
            );
          }
          const summaryContent = config.compress.mode === "message" ? replaceBlockIdsWithBlocked(renderedSummary, state.idFormat) : renderedSummary;
          const summarySeed = `${summary.blockId}:${summary.anchorMessageId}`;
          result.push(
            createSyntheticUserMessage(userMessage, summaryContent, summarySeed)
          );
          logger.info("Injected compress summary", {
            anchorMessageId: msgId,
            summaryLength: summaryContent.length
          });
        } else {
          logger.warn("No user message found for compress summary", {
            anchorMessageId: msgId
          });
        }
      }
    }
    const pruneEntry = state.prune.messages.byMessageId.get(msgId);
    if (pruneEntry && pruneEntry.activeBlockIds.length > 0) {
      continue;
    }
    result.push(msg);
  }
  messages.length = 0;
  messages.push(...result);
};

// lib/compress/selection-tokens.ts
function countSelectedContextTokens(ctx, selection, context2) {
  const messages = structuredClone(
    selection.messageIds.filter((id) => !ctx.state.prune.messages.byMessageId.get(id)?.activeBlockIds.length).map((id) => context2.rawMessagesById.get(id))
  );
  prune(ctx.state, ctx.logger, ctx.config, messages);
  return messages.reduce((sum, message) => sum + countAllMessageTokens(message), 0) + selection.requiredBlockIds.reduce((sum, id) => sum + countTokens2(context2.summaryByBlockId.get(id).summary), 0);
}

// lib/compress/hierarchical.ts
function visibleSources(context2, state) {
  const sources = /* @__PURE__ */ new Map();
  for (const [ref, messageId] of state.messageIds.byRef) {
    const message = context2.rawMessagesById.get(messageId);
    const rawIndex = context2.rawIndexById.get(messageId);
    if (!message || rawIndex === void 0 || isIgnoredUserMessage(message)) continue;
    if (message.info.time.created < state.lastCompaction) continue;
    if (state.prune.messages.byMessageId.get(messageId)?.activeBlockIds.length) continue;
    sources.set(ref, { ref, boundary: { kind: "message", rawIndex, messageId }, messageIds: [messageId] });
  }
  for (const block of context2.summaryByBlockId.values()) {
    const rawIndex = context2.rawIndexById.get(block.anchorMessageId);
    if (rawIndex === void 0 || block.archived) continue;
    const ref = formatBlockRef(block.blockId, state.idFormat);
    sources.set(ref, {
      ref,
      boundary: { kind: "compressed-block", rawIndex, blockId: block.blockId, anchorMessageId: block.anchorMessageId },
      messageIds: block.effectiveMessageIds,
      blockId: block.blockId
    });
  }
  return sources;
}
function resolveSources(entry, available, format2) {
  const hasRange = entry.startId !== void 0 || entry.endId !== void 0;
  if (entry.sources !== void 0 === hasRange) {
    throw new Error("Specify either sources or both startId/endId, never both selection forms.");
  }
  const lookup = (ref) => {
    const parsed = parseBoundaryId(ref, format2);
    const source = parsed && available.get(parsed.ref);
    if (!source) throw new Error(`Source ${ref} is not visible/active. Use an injected ${format2 === "compact" ? "@4@ or @b1@" : "mNNNN or bN"} ID.`);
    return source;
  };
  let selected;
  if (entry.sources !== void 0) {
    if (!entry.sources.length) throw new Error("sources must not be empty.");
    selected = entry.sources.map(lookup);
  } else {
    if (!entry.startId || !entry.endId) throw new Error("Both startId and endId are required.");
    const start = lookup(entry.startId);
    const end = lookup(entry.endId);
    if (start.boundary.rawIndex > end.boundary.rawIndex) throw new Error("startId must precede endId.");
    selected = [...available.values()].filter(
      (source) => source.boundary.rawIndex >= start.boundary.rawIndex && source.boundary.rawIndex <= end.boundary.rawIndex
    );
  }
  return selected.sort((a, b) => a.boundary.rawIndex - b.boundary.rawIndex);
}
function selectionFor(sources, context2) {
  const messageIds = sources.filter((source) => source.blockId === void 0).flatMap((source) => source.messageIds);
  const messageTokenById = /* @__PURE__ */ new Map();
  const toolIds = /* @__PURE__ */ new Set();
  for (const messageId of messageIds) {
    const message = context2.rawMessagesById.get(messageId);
    messageTokenById.set(messageId, countAllMessageTokens(message));
    for (const part of message.parts) {
      if (part.type === "tool") {
        if (part.state.status !== "completed" && part.state.status !== "error") {
          throw new Error("Cannot compress a message containing an unfinished tool call.");
        }
        toolIds.add(part.callID);
      }
    }
  }
  return {
    startReference: sources[0].boundary,
    endReference: sources[sources.length - 1].boundary,
    messageIds,
    messageTokenById,
    toolIds: [...toolIds],
    requiredBlockIds: sources.flatMap((source) => source.blockId === void 0 ? [] : [source.blockId])
  };
}
function createHierarchicalCompressTool(ctx) {
  ctx.prompts.reload();
  const ids = ctx.state.idFormat === "compact" ? "@4@/@b1@" : "mNNNN/bN";
  return tool2({
    description: ctx.prompts.getRuntimePrompts().compressRange + rangeFormat(ctx.state.idFormat),
    args: {
      topic: tool2.schema.string().describe("Short label (3-5 words) for this batch"),
      content: tool2.schema.array(tool2.schema.object({
        sources: tool2.schema.array(tool2.schema.string()).optional().describe(`Exact visible ${ids} sources, including nonadjacent messages and blocks`),
        startId: tool2.schema.string().optional().describe("Inclusive range start; omit when using sources"),
        endId: tool2.schema.string().optional().describe("Inclusive range end; omit when using sources"),
        summary: tool2.schema.string().describe("New standalone summary; rewrite selected old blocks without placeholders")
      })).describe("Independent selections, each replaced by one new block")
    },
    async execute(input, toolCtx) {
      toolCtx.abort.throwIfAborted();
      const callId = toolCtx.callID;
      if (!input.topic.trim() || !input.content.length) throw new Error("topic and content must not be empty.");
      for (const entry of input.content) {
        if (!entry.summary.trim()) throw new Error("summary must not be empty.");
        if (isCompressionHistoryAnnotation(entry.summary)) {
          throw new Error("This is a DCP history annotation, not a summary. The previous compression succeeded; no corrective call is needed.");
        }
        if (/\(b\d+\)|@b\d+@/.test(entry.summary)) {
          throw new Error("Rewrite old blocks in the summary. Block placeholders are no longer expanded.");
        }
        if (/<\/?dcp-(?:message-id|system-reminder)\b/i.test(entry.summary)) {
          throw new Error("Do not include DCP metadata tags in summaries.");
        }
      }
      const { rawMessages } = await prepareSession(ctx, toolCtx, `Compress: ${input.topic}`);
      syncCompressionBlocks(ctx.state, ctx.logger, rawMessages);
      const context2 = buildSearchContext(ctx.state, rawMessages);
      const available = visibleSources(context2, ctx.state);
      const claimedMessages = /* @__PURE__ */ new Set();
      const claimedSources = /* @__PURE__ */ new Set();
      const plans = input.content.map((entry) => {
        const sources = resolveSources(entry, available, ctx.state.idFormat);
        for (const source of sources) {
          if (claimedSources.has(source.ref)) throw new Error(`Duplicate source ${source.ref} in this batch.`);
          claimedSources.add(source.ref);
          for (const messageId of source.messageIds) {
            if (messageId === toolCtx.messageID) throw new Error("Cannot compress the current tool-call message.");
            if (claimedMessages.has(messageId)) throw new Error("Selections overlap, including nested block ancestry.");
            claimedMessages.add(messageId);
          }
        }
        const selection = selectionFor(sources, context2);
        const sourceTokens = countSelectedContextTokens(ctx, selection, context2);
        return {
          entry,
          sources,
          selection,
          sourceTokens,
          anchorMessageId: resolveAnchorMessageId(selection.endReference)
        };
      });
      const prepared = [];
      for (const [index, plan] of plans.entries()) {
        const protectedEntries = await collectHierarchicalProtection(ctx, plan.selection, context2);
        const protections = protectedEntries.map((entry) => entry.text);
        const summary = plan.entry.summary.trim() + protections.join("");
        const storedSummary = wrapCompressedSummary(
          ctx.state.prune.messages.nextBlockId + index,
          summary,
          ctx.state.idFormat
        );
        const summaryTokens = countTokens2(storedSummary);
        if (summaryTokens >= plan.sourceTokens) {
          throw new Error(`Compression must shrink each selection including protected content (${summaryTokens} >= ${plan.sourceTokens} estimated tokens). Shorten the summary or select more related sources.`);
        }
        prepared.push({ ...plan, protections, protectedEntries, summary, storedSummary, summaryTokens });
      }
      const previousMessages = ctx.state.prune.messages;
      toolCtx.abort.throwIfAborted();
      const previousStats = ctx.state.stats;
      ctx.state.prune.messages = structuredClone(previousMessages);
      ctx.state.stats = { ...previousStats };
      const notifications = [];
      try {
        const runId = allocateRunId(ctx.state);
        for (const plan of prepared) {
          const blockId = allocateBlockId(ctx.state);
          applyCompressionState(
            ctx.state,
            {
              topic: input.topic,
              batchTopic: input.topic,
              mode: "range",
              runId,
              startId: plan.sources[0].ref,
              endId: plan.sources[plan.sources.length - 1].ref,
              compressMessageId: toolCtx.messageID,
              compressCallId: callId,
              summaryTokens: plan.summaryTokens
            },
            plan.selection,
            plan.anchorMessageId,
            blockId,
            plan.storedSummary,
            plan.selection.requiredBlockIds
          );
          const block = ctx.state.prune.messages.blocksById.get(blockId);
          block.sourceRefs = plan.sources.map((source) => source.ref);
          block.protectedContent = plan.protections;
          block.protectedEntries = plan.protectedEntries;
          notifications.push({ blockId, runId, summary: plan.summary, summaryTokens: plan.summaryTokens });
        }
        await saveSessionState(ctx.state, ctx.logger, void 0, true);
      } catch (error) {
        ctx.state.prune.messages = previousMessages;
        ctx.state.stats = previousStats;
        throw error;
      }
      let notification;
      try {
        notification = await finalizeSession(ctx, toolCtx, rawMessages, notifications, input.topic);
      } catch (error) {
        ctx.logger.warn("Compression saved; notification failed", { error: String(error) });
      }
      const before = prepared.reduce((sum, plan) => sum + plan.sourceTokens, 0);
      const after = prepared.reduce((sum, plan) => sum + plan.summaryTokens, 0);
      const blockRefs = notifications.map((entry) => formatBlockRef(entry.blockId, ctx.state.idFormat)).join(", ");
      return appendCompressionNotification(
        `Compressed ${claimedSources.size} sources into ${blockRefs}. Estimated selected-context tokens: ${before} -> ${after}. Earlier block versions retained.`,
        notification
      );
    }
  });
}

// lib/host-permissions.ts
var findLastMatchingRule = (rules, predicate) => {
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];
    if (rule && predicate(rule)) {
      return rule;
    }
  }
  return void 0;
};
var wildcardMatch = (value, pattern) => {
  const normalizedValue = value.replaceAll("\\", "/");
  let escaped = pattern.replaceAll("\\", "/").replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  if (escaped.endsWith(" .*")) {
    escaped = escaped.slice(0, -3) + "( .*)?";
  }
  const flags = process.platform === "win32" ? "si" : "s";
  return new RegExp(`^${escaped}$`, flags).test(normalizedValue);
};
var getPermissionRules = (permissionConfigs) => {
  const rules = [];
  for (const permissionConfig of permissionConfigs) {
    if (!permissionConfig) {
      continue;
    }
    for (const [permission, value] of Object.entries(permissionConfig)) {
      if (value === "ask" || value === "allow" || value === "deny") {
        rules.push({ permission, pattern: "*", action: value });
        continue;
      }
      for (const [pattern, action] of Object.entries(value)) {
        if (action === "ask" || action === "allow" || action === "deny") {
          rules.push({ permission, pattern, action });
        }
      }
    }
  }
  return rules;
};
var compressDisabledByOpencode = (...permissionConfigs) => {
  const match = findLastMatchingRule(
    getPermissionRules(permissionConfigs),
    (rule) => wildcardMatch("compress", rule.permission)
  );
  return match?.pattern === "*" && match.action === "deny";
};
var resolveEffectiveCompressPermission = (basePermission, hostPermissions, agentName) => {
  if (basePermission === "deny") {
    return "deny";
  }
  return compressDisabledByOpencode(
    hostPermissions.global,
    agentName ? hostPermissions.agents[agentName] : void 0
  ) ? "deny" : basePermission;
};
var hasExplicitToolPermission = (permissionConfig, tool5) => {
  return permissionConfig ? Object.prototype.hasOwnProperty.call(permissionConfig, tool5) : false;
};

// lib/logger.ts
import { writeFile as writeFile2, mkdir as mkdir2 } from "fs/promises";
import { join as join3 } from "path";
import { existsSync as existsSync3 } from "fs";
import { homedir as homedir3 } from "os";
var Logger = class {
  logDir;
  enabled;
  constructor(enabled) {
    this.enabled = enabled;
    const configHome = process.env.XDG_CONFIG_HOME || join3(homedir3(), ".config");
    this.logDir = join3(configHome, "opencode", "logs", "dcp");
  }
  async ensureLogDir() {
    if (!existsSync3(this.logDir)) {
      await mkdir2(this.logDir, { recursive: true });
    }
  }
  formatData(data) {
    if (!data) return "";
    const parts = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === void 0 || value === null) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        parts.push(
          `${key}=[${value.slice(0, 3).join(",")}${value.length > 3 ? `...+${value.length - 3}` : ""}]`
        );
      } else if (typeof value === "object") {
        const str = JSON.stringify(value);
        if (str.length < 50) {
          parts.push(`${key}=${str}`);
        }
      } else {
        parts.push(`${key}=${value}`);
      }
    }
    return parts.join(" ");
  }
  getCallerFile(skipFrames = 3) {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    try {
      const err = new Error();
      Error.prepareStackTrace = (_, stack2) => stack2;
      const stack = err.stack;
      Error.prepareStackTrace = originalPrepareStackTrace;
      for (let i = skipFrames; i < stack.length; i++) {
        const filename = stack[i]?.getFileName();
        if (filename && !filename.includes("/logger.")) {
          const match = filename.match(/([^/\\]+)\.[tj]s$/);
          return match ? match[1] : filename;
        }
      }
      return "unknown";
    } catch {
      return "unknown";
    }
  }
  async write(level, component, message, data) {
    if (!this.enabled) return;
    try {
      await this.ensureLogDir();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const dataStr = this.formatData(data);
      const logLine = `${timestamp} ${level.padEnd(5)} ${component}: ${message}${dataStr ? " | " + dataStr : ""}
`;
      const dailyLogDir = join3(this.logDir, "daily");
      if (!existsSync3(dailyLogDir)) {
        await mkdir2(dailyLogDir, { recursive: true });
      }
      const logFile = join3(dailyLogDir, `${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.log`);
      await writeFile2(logFile, logLine, { flag: "a" });
    } catch (error) {
    }
  }
  info(message, data) {
    const component = this.getCallerFile(2);
    return this.write("INFO", component, message, data);
  }
  debug(message, data) {
    const component = this.getCallerFile(2);
    return this.write("DEBUG", component, message, data);
  }
  warn(message, data) {
    const component = this.getCallerFile(2);
    return this.write("WARN", component, message, data);
  }
  error(message, data) {
    const component = this.getCallerFile(2);
    return this.write("ERROR", component, message, data);
  }
  /**
   * Strips unnecessary metadata from messages for cleaner debug logs.
   *
   * Removed:
   * - All IDs (id, sessionID, messageID, parentID)
   * - summary, path, cost, model, agent, mode, finish, providerID, modelID
   * - step-start and step-finish parts entirely
   * - snapshot fields
   * - ignored text parts
   *
   * Kept:
   * - role, time (created only), tokens (input, output, reasoning, cache)
   * - text, reasoning, tool parts with content
   * - tool calls with: tool, callID, input, output, metadata
   */
  minimizeForDebug(messages) {
    return messages.map((msg) => {
      const minimized = {
        role: msg.info?.role
      };
      if (msg.info?.time?.created) {
        minimized.time = msg.info.time.created;
      }
      if (msg.info?.tokens) {
        minimized.tokens = {
          input: msg.info.tokens.input,
          output: msg.info.tokens.output,
          reasoning: msg.info.tokens.reasoning,
          cache: msg.info.tokens.cache
        };
      }
      if (msg.parts) {
        minimized.parts = msg.parts.map((part) => {
          if (part.type === "step-start" || part.type === "step-finish") {
            return null;
          }
          if (part.type === "text") {
            if (part.ignored) return null;
            const textPart = { type: "text", text: part.text };
            if (part.metadata) textPart.metadata = part.metadata;
            return textPart;
          }
          if (part.type === "reasoning") {
            const reasoningPart = { type: "reasoning", text: part.text };
            if (part.metadata) reasoningPart.metadata = part.metadata;
            return reasoningPart;
          }
          if (part.type === "tool") {
            const toolPart = {
              type: "tool",
              tool: part.tool,
              callID: part.callID
            };
            if (part.state?.status) {
              toolPart.status = part.state.status;
            }
            if (part.state?.input) {
              toolPart.input = part.state.input;
            }
            if (part.state?.output) {
              toolPart.output = part.state.output;
            }
            if (part.state?.error) {
              toolPart.error = part.state.error;
            }
            if (part.metadata) {
              toolPart.metadata = part.metadata;
            }
            if (part.state?.metadata) {
              toolPart.metadata = {
                ...toolPart.metadata || {},
                ...part.state.metadata
              };
            }
            if (part.state?.title) {
              toolPart.title = part.state.title;
            }
            return toolPart;
          }
          return null;
        }).filter(Boolean);
      }
      return minimized;
    });
  }
  async saveContext(sessionId, messages) {
    if (!this.enabled) return;
    try {
      const contextDir = join3(this.logDir, "context", sessionId);
      if (!existsSync3(contextDir)) {
        await mkdir2(contextDir, { recursive: true });
      }
      const minimized = this.minimizeForDebug(messages).filter(
        (msg) => msg.parts && msg.parts.length > 0
      );
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const contextFile = join3(contextDir, `${timestamp}.json`);
      await writeFile2(contextFile, JSON.stringify(minimized, null, 2));
    } catch (error) {
    }
  }
};

// lib/prompts/store.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, statSync as statSync2 } from "fs";
import { join as join4, dirname as dirname2 } from "path";
import { homedir as homedir4 } from "os";

// lib/prompts/system.ts
function systemPrompt(format2 = "xml") {
  const markers = format2 === "compact" ? "`@4@`, `@b1@`, `@blocked@`, priority labels" : "`<dcp-message-id>`";
  return `
DCP manages when context compression is needed. Focus on the user's task until DCP requests compression.

The ONLY tool you have for context management is \`compress\`. It replaces older conversation content with technical summaries you produce.

COMPRESSION TRIGGER
Use the compress tool only when an explicit DCP compression reminder instructs you to compress, or when the user explicitly requests compression (including a manual compression trigger).
Do not initiate compression based on your own token-budget estimates, perceived context pressure, or the completion of a work phase.
The criteria below guide what to compress after a reminder or explicit request; they do not independently trigger compression.

HISTORICAL COMPRESS CALLS
DCP may replace the summary argument of a successfully completed compress call with a "DCP-edited history" annotation in the model-facing history. This annotation is inserted by the plugin; it is not the assistant's original argument and does not indicate a failed or incomplete compression.
Current active summaries are provided separately as compressed blocks. A historical call may refer to a block that has since been superseded.
Do not issue another compress call merely to repair an omitted historical argument or replace this annotation. Recompress a block only when its actual content needs consolidation or further shortening, after a compression reminder or explicit request.

${markers} and \`<dcp-system-reminder>\` tags are environment-injected metadata. Do not output them.

THE PHILOSOPHY OF COMPRESS
\`compress\` transforms conversation content into dense, high-fidelity summaries. This is not cleanup - it is crystallization. Your summary becomes the authoritative record of what transpired.

Think of compression as phase transitions: raw exploration becomes refined understanding. The original context served its purpose; your summary now carries that understanding forward.

WHAT TO COMPRESS AFTER A TRIGGER

A section is genuinely closed and the raw conversation has served its purpose:

- Research concluded and findings are clear
- Implementation finished and verified
- Exploration exhausted and patterns understood
- Dead-end noise can be discarded without waiting for a whole chapter to close

DO NOT COMPRESS IF

- Raw context is still relevant and needed for edits or precise references
- The target content is still actively in progress
- You may need exact code, error messages, or file contents in the immediate next steps

Before compressing, ask: _"Is this section closed enough to become summary-only right now?"_

When DCP requests compression, prioritize older, resolved content and write faithful summaries. Otherwise, continue the user's task without proactive compression.
`;
}
var SYSTEM = systemPrompt();

// lib/prompts/compress-range.ts
function rangePrompt(format2 = "xml") {
  const compact = format2 === "compact";
  const message = compact ? "@4@" : "mNNNN";
  const block = compact ? "@b1@" : "bN";
  const example = compact ? '["@b1@", "@42@", "@b3@"]' : '["b1", "m0042", "b3"]';
  return `Replace selected conversation messages and/or existing compressed blocks with a new, smaller standalone summary.

SELECTION
- ${message} identifies a visible raw message; ${block} identifies an active compressed block.
- Use sources for exact selections, including nonadjacent messages and blocks, e.g. ${example}.
- Alternatively, startId/endId selects the inclusive visible range between two IDs.
- Select whole messages: a message ID covers all its tool calls and results.
- Only use IDs visible in the current context. Never select the current tool-call message or unfinished tools.
${compact ? "- Copy the whole marker, including both @ characters; omit priority labels." : "- Copy the ID from its metadata tag."}
- Each source may appear only once across the batch. Selections must not overlap, including block ancestry.
- Unselected messages stay in place. The replacement is inserted at the last selected source.

TRUE RECOMPRESSION
Read selected old blocks and WRITE THEIR RELEVANT CONTENT ANEW in the new summary. Merge duplicates and shorten obsolete detail. Old summaries are NOT automatically inserted.
Do not use block placeholders. A reference alone is not a summary. The new text must stand on its own without access to inactive blocks.
Earlier block versions and ancestry are retained in plugin storage. That archive is not automatically visible to you; preserve everything needed to continue.

SUMMARY FIDELITY
Preserve user intent, scope, constraints, corrections, acceptance criteria, decisions and reasons, important paths/APIs, verified results, unresolved questions, and next actions.
Clearly distinguish proposed/planned work from implemented and verified work. Preserve chronology and causality, especially when combining nonadjacent sources; do not imply that intervening unselected messages were summarized.
Keep precise details needed for future decisions; consolidate completed exploration and remove repetition. The final summary including automatically preserved content must be smaller than the selected visible inputs, or the entire batch is rejected.
Important outputs from subagents must be included in the summary.
Protected tool outputs, protected tags, and protected user messages are carried separately by the plugin. Do not duplicate automatically retained payloads verbatim in your summary.

BATCHING
Use one content entry per independent replacement block in the content array. All entries are validated before the batch is applied.
`;
}
var COMPRESS_RANGE = rangePrompt();

// lib/prompts/compress-message.ts
function messagePrompt(format2 = "xml") {
  const compact = format2 === "compact";
  const message = compact ? "@4@" : "mNNNN";
  return `Collapse selected individual messages in the conversation into detailed summaries.

THE SUMMARY
Your summary must be EXHAUSTIVE. Capture file paths, function signatures, decisions made, constraints discovered, key findings, tool outcomes, and user intent details that matter... EVERYTHING that preserves the value of the selected message after the raw message is removed.

USER INTENT FIDELITY
When a selected message contains user intent, preserve that intent with extra care. Do not change scope, constraints, priorities, acceptance criteria, or requested outcomes.
Directly quote short user instructions when that best preserves exact meaning.

Yet be LEAN. Strip away the noise: failed attempts that led nowhere, verbose tool output, and repetition. What remains should be pure signal - golden nuggets of detail that preserve full understanding with zero ambiguity.
If a message contains no significant technical decisions, code changes, or user requirements, produce a minimal one-line summary rather than a detailed one.

MESSAGE IDS
You specify individual raw messages by ID using the injected IDs visible in the conversation:

- \`${message}\` IDs identify raw messages

${compact ? "Each message has an ID like `@7@ [high]`." : 'Each message has an ID inside XML metadata tags like `<dcp-message-id priority="high">m0007</dcp-message-id>`.'}
The same ID tag appears in every tool output of the message it belongs to \u2014 each unique ID identifies one complete message.
Treat these tags as message metadata only, not as content to summarize. ${compact ? "Copy the whole ID, including both `@` characters, into `messageId`, without the priority label." : "Use only the inner `mNNNN` value as the `messageId`."}
${compact ? "The `[low]`, `[medium]`, and `[high]` labels indicate relative context cost." : "The `priority` attribute indicates relative context cost."} You MUST compress high-priority messages when their full text is no longer necessary for the active task.
If prior compress-tool results are present, always compress and summarize them minimally only as part of a broader compression pass. Do not invoke the compress tool solely to re-compress an earlier compression result.
Messages marked as \`${compact ? "@blocked@" : "<dcp-message-id>BLOCKED</dcp-message-id>"}\` cannot be compressed.

Rules:

- Pick each \`messageId\` directly from injected IDs visible in context.
- Only use raw message IDs of the form \`${message}\`.
- ${compact ? "Ignore priority labels when copying an ID: use `@7@`, not `@7@ [high]`. Summary IDs like `@b1@` are not valid message targets." : "Ignore XML attributes such as `priority` when copying the ID; use only the inner `mNNNN` value."}
- Do not invent IDs. Use only IDs that are present in context.

BATCHING
Select MANY messages in a single tool call when they are safe to compress.
Each entry should summarize exactly one message, and the tool can receive as many entries as needed in one batch.

GENERAL CLEANUP
Use the topic "general cleanup" for broad cleanup passes.
During general cleanup, compress all medium and high-priority messages that are not relevant to the active task.
Optimize for reducing context footprint, not for grouping messages by topic.
Do not compress away still-active instructions, unresolved questions, or constraints that are likely to matter soon.
Prioritize the earliest messages in the context as they will be the least relevant to the active task.
General cleanup should be done periodically between other normal compression tool passes, not as the primary form of compression.
`;
}
var COMPRESS_MESSAGE = messagePrompt();

// lib/prompts/context-limit-nudge.ts
var CONTEXT_LIMIT_NUDGE = `<dcp-system-reminder>
CRITICAL WARNING: MAX CONTEXT LIMIT REACHED

You are at or beyond the configured max context threshold. This is an emergency context-recovery moment.

You MUST use the \`compress\` tool now. Do not continue normal exploration until compression is handled.

If you are in the middle of a critical atomic operation, finish that atomic step first, then compress immediately.

SELECTION PROCESS
Start from older, resolved history and capture as much stale context as safely possible in one pass.
Avoid the newest active working messages unless it is clearly closed.

SUMMARY REQUIREMENTS
Your summary MUST cover all essential details from the selected messages so work can continue.
If the compressed range includes user messages, preserve user intent exactly. Prefer direct quotes for short user messages to avoid semantic drift.
</dcp-system-reminder>
`;

// lib/prompts/turn-nudge.ts
var TURN_NUDGE = `<dcp-system-reminder>
Evaluate the conversation for compressible ranges.

If any messages are cleanly closed and unlikely to be needed again, use the compress tool on them.
If direction has shifted, compress earlier ranges that are now less relevant.

The goal is to filter noise and distill key information so context accumulation stays under control.
Keep active context uncompressed.
</dcp-system-reminder>
`;

// lib/prompts/iteration-nudge.ts
var ITERATION_NUDGE = `<dcp-system-reminder>
You've been iterating for a while after the last user message.

If there is a closed portion that is unlikely to be referenced immediately (for example, finished research before implementation), use the compress tool on it now.
</dcp-system-reminder>
`;

// lib/prompts/extensions/system.ts
var MANUAL_MODE_SYSTEM_EXTENSION = `<dcp-system-reminder>
Manual mode is enabled. Do NOT use compress unless the user has explicitly triggered it through a manual marker.

Only use the compress tool after seeing \`<compress triggered manually>\` in the current user instruction context.

Issue exactly ONE compress tool per manual trigger. Do NOT launch multiple compress tools in parallel. Each trigger grants a single compression; after it completes, wait for the next trigger.

After completing a manually triggered context-management action, STOP IMMEDIATELY. Do NOT continue with any task execution. End your response right after the tool use completes and wait for the next user input.
</dcp-system-reminder>
`;
var SUBAGENT_SYSTEM_EXTENSION = `<dcp-system-reminder>
You are operating in a subagent environment.

The initial subagent instruction is imperative and must be followed exactly.
It is the only user message intentionally not assigned a message ID, and therefore is not eligible for compression.
All subsequent messages in the session will have IDs.
</dcp-system-reminder>
`;
function buildProtectedToolsExtension(protectedTools) {
  return protectedToolsExtension(protectedTools.filter((tool5) => tool5 !== "task" && tool5 !== "subagent")) + `
Important outputs from subagents must be included in the summary.
`;
}
function protectedToolsExtension(protectedTools) {
  if (protectedTools.length === 0) {
    return "";
  }
  const toolList = protectedTools.map((t) => `\`${t}\``).join(", ");
  return `<dcp-system-reminder>
The following tools are environment-managed: ${toolList}.
Their outputs are automatically preserved during compression.
Do not include their content in compress tool summaries \u2014 the environment retains it independently.
</dcp-system-reminder>`;
}

// lib/prompts/store.ts
var PROMPT_DEFINITIONS = [
  {
    key: "system",
    fileName: "system.md",
    label: "System",
    description: "Core system-level DCP instruction block",
    usage: "Injected into the model system prompt on every request",
    runtimeField: "system"
  },
  {
    key: "compress-range",
    fileName: "compress-range.md",
    label: "Compress Range",
    description: "range-mode compress tool instructions and summary constraints",
    usage: "Registered as the range-mode compress tool description",
    runtimeField: "compressRange"
  },
  {
    key: "compress-message",
    fileName: "compress-message.md",
    label: "Compress Message",
    description: "message-mode compress tool instructions and summary constraints",
    usage: "Registered as the message-mode compress tool description",
    runtimeField: "compressMessage"
  },
  {
    key: "context-limit-nudge",
    fileName: "context-limit-nudge.md",
    label: "Context Limit Nudge",
    description: "High-priority nudge when context is over max threshold",
    usage: "Injected when context usage is beyond configured max limits",
    runtimeField: "contextLimitNudge"
  },
  {
    key: "turn-nudge",
    fileName: "turn-nudge.md",
    label: "Turn Nudge",
    description: "Nudge to compress closed ranges at turn boundaries",
    usage: "Injected when context is between min and max limits at a new user turn",
    runtimeField: "turnNudge"
  },
  {
    key: "iteration-nudge",
    fileName: "iteration-nudge.md",
    label: "Iteration Nudge",
    description: "Nudge after many iterations without user input",
    usage: "Injected when iteration threshold is crossed",
    runtimeField: "iterationNudge"
  }
];
var HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g;
var LEGACY_INLINE_COMMENT_LINE_REGEX = /^[ \t]*\/\/.*?\/\/[ \t]*$/gm;
var DCP_SYSTEM_REMINDER_TAG_REGEX = /^\s*<dcp-system-reminder\b[^>]*>[\s\S]*<\/dcp-system-reminder>\s*$/i;
var DEFAULTS_README_FILE = "README.md";
function bundledPrompts(format2) {
  return {
    system: systemPrompt(format2),
    compressRange: rangePrompt(format2),
    compressMessage: messagePrompt(format2),
    contextLimitNudge: CONTEXT_LIMIT_NUDGE,
    turnNudge: TURN_NUDGE,
    iterationNudge: ITERATION_NUDGE
  };
}
var INTERNAL_PROMPT_EXTENSIONS = {
  manualExtension: MANUAL_MODE_SYSTEM_EXTENSION,
  subagentExtension: SUBAGENT_SYSTEM_EXTENSION
};
function createBundledRuntimePrompts(bundled) {
  return {
    ...bundled,
    manualExtension: INTERNAL_PROMPT_EXTENSIONS.manualExtension,
    subagentExtension: INTERNAL_PROMPT_EXTENSIONS.subagentExtension
  };
}
function findOpencodeDir2(startDir) {
  let current = startDir;
  while (current !== "/") {
    const candidate = join4(current, ".opencode");
    if (existsSync4(candidate)) {
      try {
        if (statSync2(candidate).isDirectory()) {
          return candidate;
        }
      } catch {
      }
    }
    const parent = dirname2(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}
function resolvePromptPaths(workingDirectory) {
  const configHome = process.env.XDG_CONFIG_HOME || join4(homedir4(), ".config");
  const globalRoot = join4(configHome, "opencode", "dcp-prompts");
  const defaultsDir = join4(globalRoot, "defaults");
  const globalOverridesDir = join4(globalRoot, "overrides");
  const configDirOverridesDir = process.env.OPENCODE_CONFIG_DIR ? join4(process.env.OPENCODE_CONFIG_DIR, "dcp-prompts", "overrides") : null;
  const opencodeDir = findOpencodeDir2(workingDirectory);
  const projectOverridesDir = opencodeDir ? join4(opencodeDir, "dcp-prompts", "overrides") : null;
  return {
    defaultsDir,
    globalOverridesDir,
    configDirOverridesDir,
    projectOverridesDir
  };
}
function stripConditionalTag(content, tagName) {
  const regex = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "gi");
  return content.replace(regex, "");
}
function unwrapDcpTagIfWrapped(content) {
  const trimmed = content.trim();
  if (DCP_SYSTEM_REMINDER_TAG_REGEX.test(trimmed)) {
    return trimmed.replace(/^\s*<dcp-system-reminder\b[^>]*>\s*/i, "").replace(/\s*<\/dcp-system-reminder>\s*$/i, "").trim();
  }
  return trimmed;
}
function normalizeReminderPromptContent(content) {
  const normalized = content.trim();
  if (!normalized) {
    return "";
  }
  const startsWrapped = /^\s*<dcp-system-reminder\b[^>]*>/i.test(normalized);
  const endsWrapped = /<\/dcp-system-reminder>\s*$/i.test(normalized);
  if (startsWrapped !== endsWrapped) {
    return "";
  }
  return unwrapDcpTagIfWrapped(normalized);
}
function stripPromptComments(content) {
  return content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(HTML_COMMENT_REGEX, "").replace(LEGACY_INLINE_COMMENT_LINE_REGEX, "");
}
function toEditablePromptText(definition, rawContent) {
  let normalized = stripPromptComments(rawContent).trim();
  if (!normalized) {
    return "";
  }
  if (definition.key === "system") {
    normalized = stripConditionalTag(normalized, "manual");
    normalized = stripConditionalTag(normalized, "subagent");
  }
  if (definition.key !== "compress-range" && definition.key !== "compress-message") {
    normalized = normalizeReminderPromptContent(normalized);
  }
  return normalized.trim();
}
function wrapRuntimePromptContent(definition, editableText) {
  const trimmed = editableText.trim();
  if (!trimmed) {
    return "";
  }
  if (definition.key === "compress-range" || definition.key === "compress-message") {
    return trimmed;
  }
  return `<dcp-system-reminder>
${trimmed}
</dcp-system-reminder>`;
}
function buildDefaultPromptFileContent(bundledEditableText) {
  return `${bundledEditableText.trim()}
`;
}
function buildDefaultsReadmeContent() {
  const lines = [];
  lines.push("# DCP Prompt Defaults");
  lines.push("");
  lines.push("This directory stores the DCP prompts.");
  lines.push("Each prompt file here should contain plain text only (no XML wrappers).");
  lines.push("");
  lines.push("## Creating Overrides");
  lines.push("");
  lines.push(
    "1. Copy a prompt file from this directory into an overrides directory using the same filename."
  );
  lines.push("2. Edit the copied file using plain text.");
  lines.push("3. Restart OpenCode.");
  lines.push("");
  lines.push("To reset an override, delete the matching file from your overrides directory.");
  lines.push("");
  lines.push(
    "Do not edit the default prompt files directly, they are just for reference, only files in the overrides directory are used."
  );
  lines.push("");
  lines.push("Override precedence (highest first):");
  lines.push("1. `.opencode/dcp-prompts/overrides/` (project)");
  lines.push("2. `$OPENCODE_CONFIG_DIR/dcp-prompts/overrides/` (config dir)");
  lines.push("3. `~/.config/opencode/dcp-prompts/overrides/` (global)");
  lines.push("");
  lines.push("## Prompt Files");
  lines.push("");
  for (const definition of PROMPT_DEFINITIONS) {
    lines.push(`- \`${definition.fileName}\``);
    lines.push(`  - Purpose: ${definition.description}.`);
    lines.push(`  - Runtime use: ${definition.usage}.`);
  }
  return `${lines.join("\n")}
`;
}
function readFileIfExists(filePath) {
  if (!existsSync4(filePath)) {
    return null;
  }
  try {
    return readFileSync2(filePath, "utf-8");
  } catch {
    return null;
  }
}
var PromptStore = class {
  logger;
  paths;
  customPromptsEnabled;
  runtimePrompts;
  bundled;
  constructor(logger, workingDirectory, customPromptsEnabled = false, idFormat = "xml") {
    this.logger = logger;
    this.paths = resolvePromptPaths(workingDirectory);
    this.customPromptsEnabled = customPromptsEnabled;
    this.bundled = bundledPrompts(idFormat);
    this.runtimePrompts = createBundledRuntimePrompts(this.bundled);
    if (this.customPromptsEnabled) {
      this.ensureDefaultFiles();
    }
    this.reload();
  }
  getRuntimePrompts() {
    return { ...this.runtimePrompts };
  }
  reload() {
    const nextPrompts = createBundledRuntimePrompts(this.bundled);
    if (!this.customPromptsEnabled) {
      this.runtimePrompts = nextPrompts;
      return;
    }
    for (const definition of PROMPT_DEFINITIONS) {
      const bundledSource = this.bundled[definition.runtimeField];
      const bundledEditable = toEditablePromptText(definition, bundledSource);
      const bundledRuntime = wrapRuntimePromptContent(definition, bundledEditable);
      const fallbackValue = bundledRuntime || bundledSource.trim();
      let effectiveValue = fallbackValue;
      for (const candidate of this.getOverrideCandidates(definition.fileName)) {
        const rawOverride = readFileIfExists(candidate.path);
        if (rawOverride === null) {
          continue;
        }
        const editableOverride = toEditablePromptText(definition, rawOverride);
        if (!editableOverride) {
          this.logger.warn("Prompt override is empty or invalid after normalization", {
            key: definition.key,
            path: candidate.path
          });
          continue;
        }
        const wrappedOverride = wrapRuntimePromptContent(definition, editableOverride);
        if (!wrappedOverride) {
          this.logger.warn("Prompt override could not be wrapped for runtime", {
            key: definition.key,
            path: candidate.path
          });
          continue;
        }
        effectiveValue = wrappedOverride;
        break;
      }
      nextPrompts[definition.runtimeField] = effectiveValue;
    }
    this.runtimePrompts = nextPrompts;
  }
  getOverrideCandidates(fileName) {
    const candidates = [];
    if (this.paths.projectOverridesDir) {
      candidates.push({
        path: join4(this.paths.projectOverridesDir, fileName)
      });
    }
    if (this.paths.configDirOverridesDir) {
      candidates.push({
        path: join4(this.paths.configDirOverridesDir, fileName)
      });
    }
    candidates.push({
      path: join4(this.paths.globalOverridesDir, fileName)
    });
    return candidates;
  }
  ensureDefaultFiles() {
    try {
      mkdirSync2(this.paths.defaultsDir, { recursive: true });
      mkdirSync2(this.paths.globalOverridesDir, { recursive: true });
    } catch {
      this.logger.warn("Failed to initialize prompt directories", {
        defaultsDir: this.paths.defaultsDir,
        globalOverridesDir: this.paths.globalOverridesDir
      });
      return;
    }
    for (const definition of PROMPT_DEFINITIONS) {
      const bundledEditable = toEditablePromptText(
        definition,
        this.bundled[definition.runtimeField]
      );
      const managedContent = buildDefaultPromptFileContent(
        bundledEditable || this.bundled[definition.runtimeField]
      );
      const filePath = join4(this.paths.defaultsDir, definition.fileName);
      try {
        const existing = readFileIfExists(filePath);
        if (existing === managedContent) {
          continue;
        }
        writeFileSync2(filePath, managedContent, "utf-8");
      } catch {
        this.logger.warn("Failed to write default prompt file", {
          key: definition.key,
          path: filePath
        });
      }
    }
    const readmePath = join4(this.paths.defaultsDir, DEFAULTS_README_FILE);
    const readmeContent = buildDefaultsReadmeContent();
    try {
      const existing = readFileIfExists(readmePath);
      if (existing !== readmeContent) {
        writeFileSync2(readmePath, readmeContent, "utf-8");
      }
    } catch {
      this.logger.warn("Failed to write defaults README", {
        path: readmePath
      });
    }
  }
};

// lib/compress-permission.ts
var compressPermission = (state, config) => {
  return state.compressPermission ?? config.compress.permission;
};
var syncCompressPermissionState = (state, config, hostPermissions, messages) => {
  const activeAgent = getLastUserMessage(messages)?.info.agent;
  state.compressPermission = resolveEffectiveCompressPermission(
    config.compress.permission,
    hostPermissions,
    activeAgent
  );
};

// lib/prompts/extensions/nudge.ts
function buildCompressedBlockGuidance(state) {
  const refs = Array.from(state.prune.messages.activeBlockIds).filter((id) => Number.isInteger(id) && id > 0).sort((a, b) => a - b).map((id) => formatBlockRef(id, state.idFormat));
  const blockCount = refs.length;
  const blockList = blockCount > 0 ? refs.join(", ") : "none";
  return [
    "Compressed block context:",
    `- Active compressed blocks in this session: ${blockCount} (${blockList})`,
    "- Select listed blocks through sources or range boundaries and rewrite their useful content into a shorter standalone summary. Do not insert block placeholders; earlier versions remain archived."
  ].join("\n");
}
function renderMessagePriorityGuidance(priorityLabel, refs) {
  const refList = refs.length > 0 ? refs.join(", ") : "none";
  return [
    "Message priority context:",
    "- Higher-priority older messages consume more context and should be compressed right away if it is safe to do so.",
    `- ${priorityLabel}-priority message IDs before this point: ${refList}`
  ].join("\n");
}
function appendGuidanceToDcpTag(nudgeText, guidance) {
  if (!guidance.trim()) {
    return nudgeText;
  }
  const closeTag = "</dcp-system-reminder>";
  const closeTagIndex = nudgeText.lastIndexOf(closeTag);
  if (closeTagIndex === -1) {
    return nudgeText;
  }
  const beforeClose = nudgeText.slice(0, closeTagIndex).trimEnd();
  const afterClose = nudgeText.slice(closeTagIndex);
  return `${beforeClose}

${guidance}
${afterClose}`;
}

// lib/messages/priority.ts
var MEDIUM_PRIORITY_MIN_TOKENS = 500;
var HIGH_PRIORITY_MIN_TOKENS = 5e3;
function buildPriorityMap(config, state, messages) {
  if (config.compress.mode !== "message") {
    return /* @__PURE__ */ new Map();
  }
  const priorities = /* @__PURE__ */ new Map();
  for (const message of messages) {
    if (isIgnoredUserMessage(message)) {
      continue;
    }
    if (isProtectedUserMessage(config, message)) {
      continue;
    }
    if (isMessageCompacted(state, message)) {
      continue;
    }
    const rawMessageId = message.info.id;
    if (typeof rawMessageId !== "string" || rawMessageId.length === 0) {
      continue;
    }
    const ref = state.messageIds.byRawId.get(rawMessageId);
    if (!ref) {
      continue;
    }
    const tokenCount = countAllMessageTokens(message);
    priorities.set(rawMessageId, {
      ref,
      tokenCount,
      priority: messageHasCompress(message) ? "high" : classifyMessagePriority(tokenCount)
    });
  }
  return priorities;
}
function classifyMessagePriority(tokenCount) {
  if (tokenCount >= HIGH_PRIORITY_MIN_TOKENS) {
    return "high";
  }
  if (tokenCount >= MEDIUM_PRIORITY_MIN_TOKENS) {
    return "medium";
  }
  return "low";
}
function listPriorityRefsBeforeIndex(messages, priorities, anchorIndex, priority) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  const upperBound = Math.max(0, Math.min(anchorIndex, messages.length));
  for (let index = 0; index < upperBound; index++) {
    const rawMessageId = messages[index]?.info.id;
    if (typeof rawMessageId !== "string") {
      continue;
    }
    const entry = priorities.get(rawMessageId);
    if (!entry || entry.priority !== priority || seen.has(entry.ref)) {
      continue;
    }
    seen.add(entry.ref);
    refs.push(entry.ref);
  }
  return refs;
}

// lib/messages/inject/utils.ts
var MESSAGE_MODE_NUDGE_PRIORITY = "high";
function getNudgeFrequency(config) {
  return Math.max(1, Math.floor(config.compress.nudgeFrequency || 1));
}
function getIterationNudgeThreshold(config) {
  return Math.max(1, Math.floor(config.compress.iterationNudgeThreshold || 1));
}
function findLastNonIgnoredMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (isIgnoredUserMessage(message)) {
      continue;
    }
    return { message, index: i };
  }
  return null;
}
function countMessagesAfterIndex(messages, index) {
  let count = 0;
  for (let i = index + 1; i < messages.length; i++) {
    const message = messages[i];
    if (isIgnoredUserMessage(message)) {
      continue;
    }
    count++;
  }
  return count;
}
function getModelInfo(messages) {
  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    return {
      providerId: void 0,
      modelId: void 0
    };
  }
  const userInfo = lastUserMessage.info;
  return {
    providerId: userInfo.model.providerID,
    modelId: userInfo.model.modelID
  };
}
function resolveContextTokenLimit(config, state, providerId, modelId, threshold) {
  const parseLimitValue = (limit) => {
    if (limit === void 0) {
      return void 0;
    }
    if (typeof limit === "number") {
      return limit;
    }
    if (!limit.endsWith("%") || state.modelContextLimit === void 0) {
      return void 0;
    }
    const parsedPercent = parseFloat(limit.slice(0, -1));
    if (isNaN(parsedPercent)) {
      return void 0;
    }
    const roundedPercent = Math.round(parsedPercent);
    const clampedPercent = Math.max(0, Math.min(100, roundedPercent));
    return Math.round(clampedPercent / 100 * state.modelContextLimit);
  };
  const modelLimits = threshold === "max" ? config.compress.modelMaxLimits : config.compress.modelMinLimits;
  if (modelLimits && providerId !== void 0 && modelId !== void 0) {
    const providerModelId = `${providerId}/${modelId}`;
    const modelLimit = modelLimits[providerModelId];
    if (modelLimit !== void 0) {
      return parseLimitValue(modelLimit);
    }
  }
  const globalLimit = threshold === "max" ? config.compress.maxContextLimit : config.compress.minContextLimit;
  return parseLimitValue(globalLimit);
}
function isContextOverLimits(config, state, providerId, modelId, messages) {
  const summaryTokenExtension = config.compress.summaryBuffer ? getActiveSummaryTokenUsage(state) : 0;
  const resolvedMaxContextLimit = resolveContextTokenLimit(
    config,
    state,
    providerId,
    modelId,
    "max"
  );
  const maxContextLimit = resolvedMaxContextLimit === void 0 ? void 0 : resolvedMaxContextLimit + summaryTokenExtension;
  const minContextLimit = resolveContextTokenLimit(config, state, providerId, modelId, "min");
  const currentTokens = getCurrentTokenUsage(state, messages);
  const overMaxLimit = maxContextLimit === void 0 ? false : currentTokens > maxContextLimit;
  const overMinLimit = minContextLimit === void 0 ? true : currentTokens >= minContextLimit;
  return {
    overMaxLimit,
    overMinLimit
  };
}
function addAnchor(anchorMessageIds, anchorMessageId, anchorMessageIndex, messages, interval) {
  if (anchorMessageIndex < 0) {
    return false;
  }
  let latestAnchorMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (anchorMessageIds.has(messages[i].info.id)) {
      latestAnchorMessageIndex = i;
      break;
    }
  }
  const shouldAdd = latestAnchorMessageIndex < 0 || anchorMessageIndex - latestAnchorMessageIndex >= interval;
  if (!shouldAdd) {
    return false;
  }
  const previousSize = anchorMessageIds.size;
  anchorMessageIds.add(anchorMessageId);
  return anchorMessageIds.size !== previousSize;
}
function buildMessagePriorityGuidance(messages, compressionPriorities, anchorIndex, priority) {
  if (!compressionPriorities || compressionPriorities.size === 0) {
    return "";
  }
  const refs = listPriorityRefsBeforeIndex(messages, compressionPriorities, anchorIndex, priority);
  const priorityLabel = `${priority[0].toUpperCase()}${priority.slice(1)}`;
  return renderMessagePriorityGuidance(priorityLabel, refs);
}
function injectAnchoredNudge(message, nudgeText) {
  if (!nudgeText.trim()) {
    return;
  }
  if (message.info.role === "user") {
    if (appendToLastTextPart(message, nudgeText)) {
      return;
    }
    message.parts.push(createSyntheticTextPart(message, nudgeText));
    return;
  }
  if (message.info.role !== "assistant") {
    return;
  }
  if (!hasContent(message)) {
    return;
  }
  for (const part of message.parts) {
    if (part.type === "text") {
      if (appendToTextPart(part, nudgeText)) {
        return;
      }
    }
  }
  const syntheticPart = createSyntheticTextPart(message, nudgeText);
  const firstToolIndex = message.parts.findIndex((p) => p.type === "tool");
  if (firstToolIndex === -1) {
    message.parts.push(syntheticPart);
  } else {
    message.parts.splice(firstToolIndex, 0, syntheticPart);
  }
}
function collectAnchoredMessages(anchorMessageIds, messages) {
  const anchoredMessages = [];
  for (const anchorMessageId of anchorMessageIds) {
    const index = messages.findIndex((message) => message.info.id === anchorMessageId);
    if (index === -1) {
      continue;
    }
    anchoredMessages.push({
      message: messages[index],
      index
    });
  }
  return anchoredMessages;
}
function collectTurnNudgeAnchors2(state, config, messages) {
  const turnNudgeAnchors = /* @__PURE__ */ new Set();
  const targetRole = config.compress.nudgeForce === "strong" ? "user" : "assistant";
  for (const message of messages) {
    if (!state.nudges.turnNudgeAnchors.has(message.info.id)) continue;
    if (message.info.role === targetRole) {
      turnNudgeAnchors.add(message.info.id);
    }
  }
  return turnNudgeAnchors;
}
function applyRangeModeAnchoredNudge(anchorMessageIds, messages, baseNudgeText, compressedBlockGuidance) {
  const nudgeText = appendGuidanceToDcpTag(baseNudgeText, compressedBlockGuidance);
  if (!nudgeText.trim()) {
    return;
  }
  for (const { message } of collectAnchoredMessages(anchorMessageIds, messages)) {
    injectAnchoredNudge(message, nudgeText);
  }
}
function applyMessageModeAnchoredNudge(anchorMessageIds, messages, baseNudgeText, compressionPriorities) {
  for (const { message, index } of collectAnchoredMessages(anchorMessageIds, messages)) {
    const priorityGuidance = buildMessagePriorityGuidance(
      messages,
      compressionPriorities,
      index,
      MESSAGE_MODE_NUDGE_PRIORITY
    );
    const nudgeText = appendGuidanceToDcpTag(baseNudgeText, priorityGuidance);
    injectAnchoredNudge(message, nudgeText);
  }
}
function applyAnchoredNudges(state, config, messages, prompts, compressionPriorities) {
  const turnNudgeAnchors = collectTurnNudgeAnchors2(state, config, messages);
  if (config.compress.mode === "message") {
    applyMessageModeAnchoredNudge(
      state.nudges.contextLimitAnchors,
      messages,
      prompts.contextLimitNudge,
      compressionPriorities
    );
    applyMessageModeAnchoredNudge(
      turnNudgeAnchors,
      messages,
      prompts.turnNudge,
      compressionPriorities
    );
    applyMessageModeAnchoredNudge(
      state.nudges.iterationNudgeAnchors,
      messages,
      prompts.iterationNudge,
      compressionPriorities
    );
    return;
  }
  const compressedBlockGuidance = buildCompressedBlockGuidance(state);
  applyRangeModeAnchoredNudge(
    state.nudges.contextLimitAnchors,
    messages,
    prompts.contextLimitNudge,
    compressedBlockGuidance
  );
  applyRangeModeAnchoredNudge(
    turnNudgeAnchors,
    messages,
    prompts.turnNudge,
    compressedBlockGuidance
  );
  applyRangeModeAnchoredNudge(
    state.nudges.iterationNudgeAnchors,
    messages,
    prompts.iterationNudge,
    compressedBlockGuidance
  );
}

// lib/messages/inject/inject.ts
var injectCompressNudges = (state, config, logger, messages, prompts, compressionPriorities, createAnchors = true) => {
  if (compressPermission(state, config) === "deny") {
    return;
  }
  if (state.manualMode) {
    return;
  }
  if (!createAnchors) {
    applyAnchoredNudges(state, config, messages, prompts, compressionPriorities);
    return;
  }
  const lastMessage = findLastNonIgnoredMessage(messages);
  const lastAssistantMessage = messages.findLast((message) => message.info.role === "assistant");
  if (lastAssistantMessage && messageHasCompress(lastAssistantMessage)) {
    state.nudges.contextLimitAnchors.clear();
    state.nudges.turnNudgeAnchors.clear();
    state.nudges.iterationNudgeAnchors.clear();
    void saveSessionState(state, logger);
    return;
  }
  const { providerId, modelId } = getModelInfo(messages);
  let anchorsChanged = false;
  const { overMaxLimit, overMinLimit } = isContextOverLimits(
    config,
    state,
    providerId,
    modelId,
    messages
  );
  if (!overMinLimit) {
    const hadTurnAnchors = state.nudges.turnNudgeAnchors.size > 0;
    const hadIterationAnchors = state.nudges.iterationNudgeAnchors.size > 0;
    if (hadTurnAnchors || hadIterationAnchors) {
      state.nudges.turnNudgeAnchors.clear();
      state.nudges.iterationNudgeAnchors.clear();
      anchorsChanged = true;
    }
  }
  if (overMaxLimit) {
    if (lastMessage) {
      const interval = getNudgeFrequency(config);
      const added = addAnchor(
        state.nudges.contextLimitAnchors,
        lastMessage.message.info.id,
        lastMessage.index,
        messages,
        interval
      );
      if (added) {
        anchorsChanged = true;
      }
    }
  } else if (overMinLimit) {
    const isLastMessageUser = lastMessage?.message.info.role === "user";
    if (isLastMessageUser && lastAssistantMessage) {
      const previousSize = state.nudges.turnNudgeAnchors.size;
      state.nudges.turnNudgeAnchors.add(lastMessage.message.info.id);
      state.nudges.turnNudgeAnchors.add(lastAssistantMessage.info.id);
      if (state.nudges.turnNudgeAnchors.size !== previousSize) {
        anchorsChanged = true;
      }
    }
    const lastUserMessage = getLastUserMessage(messages);
    if (lastUserMessage && lastMessage) {
      const lastUserMessageIndex = messages.findIndex(
        (message) => message.info.id === lastUserMessage.info.id
      );
      if (lastUserMessageIndex >= 0) {
        const messagesSinceUser = countMessagesAfterIndex(messages, lastUserMessageIndex);
        const iterationThreshold = getIterationNudgeThreshold(config);
        if (lastMessage.index > lastUserMessageIndex && messagesSinceUser >= iterationThreshold) {
          const interval = getNudgeFrequency(config);
          const added = addAnchor(
            state.nudges.iterationNudgeAnchors,
            lastMessage.message.info.id,
            lastMessage.index,
            messages,
            interval
          );
          if (added) {
            anchorsChanged = true;
          }
        }
      }
    }
  }
  applyAnchoredNudges(state, config, messages, prompts, compressionPriorities);
  if (anchorsChanged) {
    void saveSessionState(state, logger);
  }
};
var injectMessageIds = (state, config, messages, compressionPriorities) => {
  if (compressPermission(state, config) === "deny") {
    return;
  }
  for (const message of messages) {
    if (isIgnoredUserMessage(message)) {
      continue;
    }
    const messageRef = state.messageIds.byRawId.get(message.info.id);
    if (!messageRef) {
      continue;
    }
    const isBlockedMessage = isProtectedUserMessage(config, message);
    const priority = config.compress.mode === "message" && !isBlockedMessage ? compressionPriorities?.get(message.info.id)?.priority : void 0;
    const tag = formatMessageIdTag(
      isBlockedMessage ? "BLOCKED" : messageRef,
      priority ? { priority } : void 0,
      state.idFormat
    );
    if (message.info.role === "user") {
      let injected = false;
      for (const part of message.parts) {
        if (part.type === "text") {
          injected = appendToTextPart(part, tag) || injected;
        }
      }
      if (injected) {
        continue;
      }
      message.parts.push(createSyntheticTextPart(message, tag));
      continue;
    }
    if (message.info.role !== "assistant") {
      continue;
    }
    if (!hasContent(message)) {
      continue;
    }
    if (appendToAllToolParts(message, tag)) {
      continue;
    }
    if (appendToLastTextPart(message, tag)) {
      continue;
    }
    const syntheticPart = createSyntheticTextPart(message, tag);
    const firstToolIndex = message.parts.findIndex((p) => p.type === "tool");
    if (firstToolIndex === -1) {
      message.parts.push(syntheticPart);
    } else {
      message.parts.splice(firstToolIndex, 0, syntheticPart);
    }
  }
};

// lib/subagents/subagent-results.ts
var SUB_AGENT_RESULT_BLOCK_REGEX = /(<(?:task_result|subagent\b[^>]*)>\s*)([\s\S]*?)(\s*<\/(?:task_result|subagent)>)/i;
function getSubAgentId(part) {
  const sessionId = part?.state?.metadata?.sessionId ?? part?.state?.metadata?.sessionID;
  if (typeof sessionId !== "string") {
    return null;
  }
  const value = sessionId.trim();
  return value.length > 0 ? value : null;
}
function buildSubagentResultText(messages) {
  const assistantMessages = messages.filter((message) => message.info.role === "assistant");
  if (assistantMessages.length === 0) {
    return "";
  }
  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const lastText = getLastTextPart(lastAssistant);
  if (assistantMessages.length < 2) {
    return lastText;
  }
  const secondToLastAssistant = assistantMessages[assistantMessages.length - 2];
  if (!assistantMessageHasCompressTool(secondToLastAssistant)) {
    return lastText;
  }
  const secondToLastText = getLastTextPart(secondToLastAssistant);
  return [secondToLastText, lastText].filter((text) => text.length > 0).join("\n\n");
}
function mergeSubagentResult(output2, subAgentResultText) {
  if (!subAgentResultText || typeof output2 !== "string") {
    return output2;
  }
  return output2.replace(
    SUB_AGENT_RESULT_BLOCK_REGEX,
    (_match, openTag, _body, closeTag) => `${openTag}${subAgentResultText}${closeTag}`
  );
}
function getLastTextPart(message) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index];
    if (part.type !== "text" || typeof part.text !== "string") {
      continue;
    }
    const text = part.text.trim();
    if (!text) {
      continue;
    }
    return text;
  }
  return "";
}
function assistantMessageHasCompressTool(message) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts.some(
    (part) => part.type === "tool" && part.tool === "compress" && part.state?.status === "completed"
  );
}

// lib/messages/inject/subagent-results.ts
async function fetchSubAgentMessages(client, sessionId) {
  const response = await client.session.messages({
    path: { id: sessionId }
  });
  return filterMessages(response?.data || response);
}
var injectExtendedSubAgentResults = async (client, state, logger, messages, allowSubAgents) => {
  if (!allowSubAgents) {
    return;
  }
  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
      if (part.type !== "tool" || !["task", "subagent"].includes(part.tool) || !part.callID) {
        continue;
      }
      if (state.prune.tools.has(part.callID)) {
        continue;
      }
      if (part.state?.status !== "completed" || typeof part.state.output !== "string") {
        continue;
      }
      const cachedResult = state.subAgentResultCache.get(part.callID);
      if (cachedResult !== void 0) {
        if (cachedResult) {
          part.state.output = stripHallucinationsFromString(
            mergeSubagentResult(part.state.output, cachedResult),
            state.idFormat
          );
        }
        continue;
      }
      const subAgentSessionId = getSubAgentId(part);
      if (!subAgentSessionId) {
        continue;
      }
      let subAgentMessages = [];
      try {
        subAgentMessages = await fetchSubAgentMessages(client, subAgentSessionId);
      } catch (error) {
        logger.warn("Failed to fetch subagent session for output expansion", {
          subAgentSessionId,
          callID: part.callID,
          error: error instanceof Error ? error.message : String(error)
        });
        continue;
      }
      const subAgentResultText = buildSubagentResultText(subAgentMessages);
      if (!subAgentResultText) {
        continue;
      }
      state.subAgentResultCache.set(part.callID, subAgentResultText);
      part.state.output = stripHallucinationsFromString(
        mergeSubagentResult(part.state.output, subAgentResultText),
        state.idFormat
      );
    }
  }
};

// lib/messages/reasoning-strip.ts
function stripStaleMetadata(messages) {
  const lastUserMessage = getLastUserMessage(messages);
  if (lastUserMessage?.info.role !== "user") {
    return;
  }
  const modelID = lastUserMessage.info.model.modelID;
  const providerID = lastUserMessage.info.model.providerID;
  messages.forEach((message) => {
    if (message.info.role !== "assistant") {
      return;
    }
    if (message.info.modelID === modelID && message.info.providerID === providerID) {
      return;
    }
    message.parts = message.parts.map((part) => {
      if (part.type !== "text" && part.type !== "tool" && part.type !== "reasoning") {
        return part;
      }
      if (!("metadata" in part)) {
        return part;
      }
      const { metadata: _metadata, ...rest } = part;
      return rest;
    });
  });
}

// lib/prompts/index.ts
function renderSystemPrompt(prompts, protectedToolsExtension2, manual, subagent) {
  const extensions = [];
  if (protectedToolsExtension2) {
    extensions.push(protectedToolsExtension2.trim());
  }
  if (manual) {
    extensions.push(prompts.manualExtension.trim());
  }
  if (subagent) {
    extensions.push(prompts.subagentExtension.trim());
  }
  return [prompts.system.trim(), ...extensions].filter(Boolean).join("\n\n").replace(/\n([ \t]*\n)+/g, "\n\n").trim();
}

// lib/commands/context.ts
function analyzeContextTokens(state, messages) {
  const breakdown = {
    system: 0,
    user: 0,
    assistant: 0,
    tools: 0,
    toolCount: 0,
    toolsInContextCount: 0,
    prunedTokens: state.stats.totalPruneTokens,
    prunedToolCount: 0,
    prunedMessageCount: 0,
    total: 0
  };
  let firstAssistant;
  for (const msg of messages) {
    if (msg.info.role === "assistant") {
      const assistantInfo = msg.info;
      if (assistantInfo.tokens?.input > 0 || assistantInfo.tokens?.cache?.read > 0 || assistantInfo.tokens?.cache?.write > 0) {
        firstAssistant = assistantInfo;
        break;
      }
    }
  }
  let lastAssistant;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.info.role === "assistant") {
      const assistantInfo = msg.info;
      if (assistantInfo.tokens?.output > 0) {
        lastAssistant = assistantInfo;
        break;
      }
    }
  }
  const apiInput = lastAssistant?.tokens?.input || 0;
  const apiOutput = lastAssistant?.tokens?.output || 0;
  const apiReasoning = lastAssistant?.tokens?.reasoning || 0;
  const apiCacheRead = lastAssistant?.tokens?.cache?.read || 0;
  const apiCacheWrite = lastAssistant?.tokens?.cache?.write || 0;
  breakdown.total = apiInput + apiOutput + apiReasoning + apiCacheRead + apiCacheWrite;
  const userTextParts = [];
  const toolInputParts = [];
  const toolOutputParts = [];
  let firstUserText = "";
  let foundFirstUser = false;
  const allToolIds = /* @__PURE__ */ new Set();
  const activeToolIds = /* @__PURE__ */ new Set();
  const prunedByMessageToolIds = /* @__PURE__ */ new Set();
  const allMessageIds = /* @__PURE__ */ new Set();
  for (const msg of messages) {
    allMessageIds.add(msg.info.id);
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    const isCompacted = isMessageCompacted(state, msg);
    const pruneEntry = state.prune.messages.byMessageId.get(msg.info.id);
    const isMessagePruned = !!pruneEntry && pruneEntry.activeBlockIds.length > 0;
    const isIgnoredUser = isIgnoredUserMessage(msg);
    for (const part of parts) {
      if (part.type === "tool") {
        const toolPart = part;
        if (toolPart.callID) {
          allToolIds.add(toolPart.callID);
          if (!isCompacted) {
            activeToolIds.add(toolPart.callID);
          }
          if (isMessagePruned) {
            prunedByMessageToolIds.add(toolPart.callID);
          }
        }
        const isPruned = toolPart.callID && state.prune.tools.has(toolPart.callID);
        if (!isCompacted && !isPruned) {
          if (toolPart.state?.input) {
            const inputStr = typeof toolPart.state.input === "string" ? toolPart.state.input : JSON.stringify(toolPart.state.input);
            toolInputParts.push(inputStr);
          }
          const outputStr = extractCompletedToolOutput(toolPart);
          if (outputStr !== void 0) {
            toolOutputParts.push(outputStr);
          }
        }
      } else if (part.type === "text" && msg.info.role === "user" && !isCompacted && !isIgnoredUser) {
        const textPart = part;
        const text = textPart.text || "";
        userTextParts.push(text);
        if (!foundFirstUser) {
          firstUserText += text;
        }
      }
    }
    if (msg.info.role === "user" && !isIgnoredUser && !foundFirstUser) {
      foundFirstUser = true;
    }
  }
  const prunedByToolIds = /* @__PURE__ */ new Set();
  for (const id of allToolIds) {
    if (state.prune.tools.has(id)) {
      prunedByToolIds.add(id);
    }
  }
  const prunedToolIds = /* @__PURE__ */ new Set([...prunedByToolIds, ...prunedByMessageToolIds]);
  const toolsInContextCount = [...activeToolIds].filter((id) => !prunedByToolIds.has(id)).length;
  let prunedMessageCount = 0;
  for (const [id, entry] of state.prune.messages.byMessageId) {
    if (allMessageIds.has(id) && entry.activeBlockIds.length > 0) {
      prunedMessageCount++;
    }
  }
  breakdown.toolCount = allToolIds.size;
  breakdown.toolsInContextCount = toolsInContextCount;
  breakdown.prunedToolCount = prunedToolIds.size;
  breakdown.prunedMessageCount = prunedMessageCount;
  const firstUserTokens = countTokens2(firstUserText);
  breakdown.user = countTokens2(userTextParts.join("\n"));
  const toolInputTokens = countTokens2(toolInputParts.join("\n"));
  const toolOutputTokens = countTokens2(toolOutputParts.join("\n"));
  if (firstAssistant) {
    const firstInput = (firstAssistant.tokens?.input || 0) + (firstAssistant.tokens?.cache?.read || 0) + (firstAssistant.tokens?.cache?.write || 0);
    breakdown.system = Math.max(0, firstInput - firstUserTokens);
  }
  breakdown.tools = toolInputTokens + toolOutputTokens;
  breakdown.assistant = Math.max(
    0,
    breakdown.total - breakdown.system - breakdown.user - breakdown.tools
  );
  return breakdown;
}
function createBar(value, maxValue, width, char = "\u2588") {
  if (maxValue === 0) return "";
  const filled = Math.round(value / maxValue * width);
  const bar = char.repeat(Math.max(0, filled));
  return bar;
}
function formatContextMessage(breakdown) {
  const lines = [];
  const barWidth = 30;
  const toolsLabel = `Tools (${breakdown.toolsInContextCount})`;
  const categories = [
    { label: "System", value: breakdown.system, char: "\u2588" },
    { label: "User", value: breakdown.user, char: "\u2593" },
    { label: "Assistant", value: breakdown.assistant, char: "\u2592" },
    { label: toolsLabel, value: breakdown.tools, char: "\u2591" }
  ];
  const maxLabelLen = Math.max(...categories.map((c) => c.label.length));
  lines.push("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E");
  lines.push("\u2502                  DCP Context Analysis                     \u2502");
  lines.push("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F");
  lines.push("");
  lines.push("Session Context Breakdown:");
  lines.push("\u2500".repeat(60));
  lines.push("");
  for (const cat of categories) {
    const bar = createBar(cat.value, breakdown.total, barWidth, cat.char);
    const percentage = breakdown.total > 0 ? (cat.value / breakdown.total * 100).toFixed(1) : "0.0";
    const labelWithPct = `${cat.label.padEnd(maxLabelLen)} ${percentage.padStart(5)}% `;
    const valueStr = formatTokenCount(cat.value).padStart(13);
    lines.push(`${labelWithPct}\u2502${bar.padEnd(barWidth)}\u2502${valueStr}`);
  }
  lines.push("");
  lines.push("\u2500".repeat(60));
  lines.push("");
  lines.push("Summary:");
  if (breakdown.prunedTokens > 0) {
    const withoutPruning = breakdown.total + breakdown.prunedTokens;
    const pruned = [];
    if (breakdown.prunedToolCount > 0) pruned.push(`${breakdown.prunedToolCount} tools`);
    if (breakdown.prunedMessageCount > 0)
      pruned.push(`${breakdown.prunedMessageCount} messages`);
    lines.push(
      `  Pruned:          ${pruned.join(", ")} (~${formatTokenCount(breakdown.prunedTokens)})`
    );
    lines.push(`  Current context: ~${formatTokenCount(breakdown.total)}`);
    lines.push(`  Without DCP:     ~${formatTokenCount(withoutPruning)}`);
  } else {
    lines.push(`  Current context: ~${formatTokenCount(breakdown.total)}`);
  }
  lines.push("");
  return lines.join("\n");
}
async function handleContextCommand(ctx) {
  const { client, state, logger, sessionId, messages } = ctx;
  const breakdown = analyzeContextTokens(state, messages);
  const message = formatContextMessage(breakdown);
  const params = getCurrentParams(state, messages, logger);
  await sendIgnoredMessage(client, sessionId, message, params, logger);
}

// lib/commands/compression-targets.ts
function byBlockId(a, b) {
  return a.blockId - b.blockId;
}
function buildTarget(blocks) {
  const ordered = [...blocks].sort(byBlockId);
  const first = ordered[0];
  if (!first) {
    throw new Error("Cannot build compression target from empty block list.");
  }
  const grouped = first.mode === "message";
  return {
    displayId: first.blockId,
    runId: first.runId,
    topic: grouped ? first.batchTopic || first.topic : first.topic,
    compressedTokens: ordered.reduce((total, block) => total + block.compressedTokens, 0),
    durationMs: ordered.reduce((total, block) => Math.max(total, block.durationMs), 0),
    grouped,
    blocks: ordered
  };
}
function groupMessageBlocks(blocks) {
  const grouped = /* @__PURE__ */ new Map();
  for (const block of blocks) {
    const existing = grouped.get(block.runId);
    if (existing) {
      existing.push(block);
      continue;
    }
    grouped.set(block.runId, [block]);
  }
  return Array.from(grouped.values()).map(buildTarget);
}
function splitTargets(blocks) {
  const messageBlocks = [];
  const singleBlocks = [];
  for (const block of blocks) {
    if (block.mode === "message") {
      messageBlocks.push(block);
    } else {
      singleBlocks.push(block);
    }
  }
  const targets = [
    ...singleBlocks.map((block) => buildTarget([block])),
    ...groupMessageBlocks(messageBlocks)
  ];
  return targets.sort((a, b) => a.displayId - b.displayId);
}
function getActiveCompressionTargets(messagesState) {
  const activeBlocks = Array.from(messagesState.activeBlockIds).map((blockId) => messagesState.blocksById.get(blockId)).filter((block) => !!block && block.active);
  return splitTargets(activeBlocks);
}
function getRecompressibleCompressionTargets(messagesState, availableMessageIds) {
  const allBlocks = Array.from(messagesState.blocksById.values()).filter((block) => {
    return availableMessageIds.has(block.compressMessageId);
  });
  const messageGroups = /* @__PURE__ */ new Map();
  const singleTargets = [];
  for (const block of allBlocks) {
    if (block.mode === "message") {
      const existing = messageGroups.get(block.runId);
      if (existing) {
        existing.push(block);
      } else {
        messageGroups.set(block.runId, [block]);
      }
      continue;
    }
    if (block.deactivatedByUser && !block.active) {
      singleTargets.push(buildTarget([block]));
    }
  }
  for (const blocks of messageGroups.values()) {
    if (blocks.some((block) => block.deactivatedByUser && !block.active)) {
      singleTargets.push(buildTarget(blocks));
    }
  }
  return singleTargets.sort((a, b) => a.displayId - b.displayId);
}
function resolveCompressionTarget(messagesState, blockId) {
  const block = messagesState.blocksById.get(blockId);
  if (!block) {
    return null;
  }
  if (block.mode !== "message") {
    return buildTarget([block]);
  }
  const blocks = Array.from(messagesState.blocksById.values()).filter(
    (candidate) => candidate.mode === "message" && candidate.runId === block.runId
  );
  if (blocks.length === 0) {
    return null;
  }
  return buildTarget(blocks);
}

// lib/commands/decompress.ts
function parseBlockIdArg(arg) {
  const normalized = arg.trim().toLowerCase();
  const blockRef = parseBlockRef(normalized) ?? parseBlockRef(normalized, "compact");
  if (blockRef !== null) {
    return blockRef;
  }
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function findActiveParentBlockId(messagesState, block) {
  const queue = [...block.parentBlockIds];
  const visited = /* @__PURE__ */ new Set();
  while (queue.length > 0) {
    const parentBlockId = queue.shift();
    if (parentBlockId === void 0 || visited.has(parentBlockId)) {
      continue;
    }
    visited.add(parentBlockId);
    const parent = messagesState.blocksById.get(parentBlockId);
    if (!parent) {
      continue;
    }
    if (parent.active) {
      return parent.blockId;
    }
    for (const ancestorId of parent.parentBlockIds) {
      if (!visited.has(ancestorId)) {
        queue.push(ancestorId);
      }
    }
  }
  return null;
}
function findActiveAncestorBlockId(messagesState, target) {
  for (const block of target.blocks) {
    const activeAncestorBlockId = findActiveParentBlockId(messagesState, block);
    if (activeAncestorBlockId !== null) {
      return activeAncestorBlockId;
    }
  }
  return null;
}
function snapshotActiveMessages(messagesState) {
  const activeMessages = /* @__PURE__ */ new Map();
  for (const [messageId, entry] of messagesState.byMessageId) {
    if (entry.activeBlockIds.length > 0) {
      activeMessages.set(messageId, entry.tokenCount);
    }
  }
  return activeMessages;
}
function formatDecompressMessage(target, restoredMessageCount, restoredTokens, reactivatedBlockIds) {
  const lines = [];
  lines.push(`Restored compression ${target.displayId}.`);
  if (target.runId !== target.displayId || target.grouped) {
    lines.push(`Tool call label: Compression #${target.runId}.`);
  }
  if (reactivatedBlockIds.length > 0) {
    const refs = reactivatedBlockIds.map((id) => String(id)).join(", ");
    lines.push(`Also restored nested compression(s): ${refs}.`);
  }
  if (restoredMessageCount > 0) {
    lines.push(
      `Restored ${restoredMessageCount} message(s) (~${formatTokenCount(restoredTokens)}).`
    );
  } else {
    lines.push("No messages were restored.");
  }
  return lines.join("\n");
}
function formatAvailableBlocksMessage(availableTargets) {
  const lines = [];
  lines.push("Usage: /dcp decompress <n>");
  lines.push("");
  if (availableTargets.length === 0) {
    lines.push("No compressions are available to restore.");
    return lines.join("\n");
  }
  lines.push("Available compressions:");
  const entries = availableTargets.map((target) => {
    const topic = target.topic.replace(/\s+/g, " ").trim() || "(no topic)";
    const label = `${target.displayId} (${formatTokenCount(target.compressedTokens)})`;
    const details = target.grouped ? `Compression #${target.runId} - ${target.blocks.length} messages` : `Compression #${target.runId}`;
    return { label, topic: `${details} - ${topic}` };
  });
  const labelWidth = Math.max(...entries.map((entry) => entry.label.length)) + 4;
  for (const entry of entries) {
    lines.push(`  ${entry.label.padEnd(labelWidth)}${entry.topic}`);
  }
  return lines.join("\n");
}
async function handleDecompressCommand(ctx) {
  const { client, state, logger, sessionId, messages, args } = ctx;
  const params = getCurrentParams(state, messages, logger);
  const targetArg = args[0];
  if (args.length > 1) {
    await sendIgnoredMessage(
      client,
      sessionId,
      "Invalid arguments. Usage: /dcp decompress <n>",
      params,
      logger
    );
    return;
  }
  syncCompressionBlocks(state, logger, messages);
  const messagesState = state.prune.messages;
  if (!targetArg) {
    const availableTargets = getActiveCompressionTargets(messagesState);
    const message2 = formatAvailableBlocksMessage(availableTargets);
    await sendIgnoredMessage(client, sessionId, message2, params, logger);
    return;
  }
  const targetBlockId = parseBlockIdArg(targetArg);
  if (targetBlockId === null) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Please enter a compression number. Example: /dcp decompress 2`,
      params,
      logger
    );
    return;
  }
  const target = resolveCompressionTarget(messagesState, targetBlockId);
  if (!target) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Compression ${targetBlockId} does not exist.`,
      params,
      logger
    );
    return;
  }
  const activeBlocks = target.blocks.filter((block) => block.active);
  if (activeBlocks.length === 0) {
    const activeAncestorBlockId = findActiveAncestorBlockId(messagesState, target);
    if (activeAncestorBlockId !== null) {
      await sendIgnoredMessage(
        client,
        sessionId,
        `Compression ${target.displayId} is inside compression ${activeAncestorBlockId}. Restore compression ${activeAncestorBlockId} first.`,
        params,
        logger
      );
      return;
    }
    await sendIgnoredMessage(
      client,
      sessionId,
      `Compression ${target.displayId} is not active.`,
      params,
      logger
    );
    return;
  }
  const activeMessagesBefore = snapshotActiveMessages(messagesState);
  const activeBlockIdsBefore = new Set(messagesState.activeBlockIds);
  const deactivatedAt = Date.now();
  for (const block of target.blocks) {
    block.active = false;
    block.deactivatedByUser = true;
    block.deactivatedAt = deactivatedAt;
    block.deactivatedByBlockId = void 0;
  }
  syncCompressionBlocks(state, logger, messages);
  let restoredMessageCount = 0;
  let restoredTokens = 0;
  for (const [messageId, tokenCount] of activeMessagesBefore) {
    const entry = messagesState.byMessageId.get(messageId);
    const isActiveNow = entry ? entry.activeBlockIds.length > 0 : false;
    if (!isActiveNow) {
      restoredMessageCount++;
      restoredTokens += tokenCount;
    }
  }
  state.stats.totalPruneTokens = Math.max(0, state.stats.totalPruneTokens - restoredTokens);
  const reactivatedBlockIds = Array.from(messagesState.activeBlockIds).filter((blockId) => !activeBlockIdsBefore.has(blockId)).sort((a, b) => a - b);
  await saveSessionState(state, logger);
  const message = formatDecompressMessage(
    target,
    restoredMessageCount,
    restoredTokens,
    reactivatedBlockIds
  );
  await sendIgnoredMessage(client, sessionId, message, params, logger);
  logger.info("Decompress command completed", {
    targetBlockId: target.displayId,
    targetRunId: target.runId,
    restoredMessageCount,
    restoredTokens,
    reactivatedBlockIds
  });
}

// lib/commands/help.ts
var TUI_COMMANDS = [
  ["DCP Context", "Show token usage breakdown for current session"],
  ["DCP Stats", "Show DCP pruning statistics"],
  ["DCP Help", "Show this help in a modal"]
];
var TOOL_COMMANDS = {
  compress: ["/dcp-compress [focus]", "Trigger manual compress tool execution"],
  decompress: ["/dcp decompress <n>", "Restore selected compression"],
  recompress: ["/dcp recompress <n>", "Re-apply a user-decompressed compression"]
};
function getVisibleCommands(state, config) {
  const commands = [...TUI_COMMANDS];
  if (compressPermission(state, config) !== "deny") {
    commands.push(TOOL_COMMANDS.compress);
  }
  return commands;
}
function formatHelpMessage(state, config) {
  const commands = getVisibleCommands(state, config);
  const colWidth = Math.max(...commands.map(([cmd]) => cmd.length)) + 4;
  const lines = [];
  lines.push("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E");
  lines.push("\u2502                              DCP Commands                               \u2502");
  lines.push("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F");
  lines.push("");
  lines.push(`  ${"Manual mode:".padEnd(colWidth)}${state.manualMode ? "ON" : "OFF"}`);
  lines.push("");
  lines.push("  Open the command palette for DCP modal commands.");
  lines.push("  Use /dcp-compress [focus] when you want DCP to ask the model to run compression.");
  lines.push("");
  for (const [cmd, desc] of commands) {
    lines.push(`  ${cmd.padEnd(colWidth)}${desc}`);
  }
  lines.push("");
  return lines.join("\n");
}
async function handleHelpCommand(ctx) {
  const { client, state, logger, sessionId, messages } = ctx;
  const { config } = ctx;
  const message = formatHelpMessage(state, config);
  const params = getCurrentParams(state, messages, logger);
  await sendIgnoredMessage(client, sessionId, message, params, logger);
  logger.info("Help command executed");
}

// lib/commands/manual.ts
var MANUAL_MODE_ON = "Manual mode is now ON. Use /dcp-compress to trigger context tools manually.";
var MANUAL_MODE_OFF = "Manual mode is now OFF.";
var COMPRESS_TRIGGER_PROMPT = [
  "<compress triggered manually>",
  "Manual mode trigger received. You must now use the compress tool.",
  "Find the most significant completed conversation content that can be compressed into a high-fidelity technical summary.",
  "Follow the active compress mode, preserve all critical implementation details, and choose safe targets.",
  "Return after compress with a brief explanation of what content was compressed."
].join("\n\n");
function getTriggerPrompt(tool5, state, config, userFocus) {
  const base = COMPRESS_TRIGGER_PROMPT;
  const compressedBlockGuidance = config.compress.mode === "message" ? "" : buildCompressedBlockGuidance(state);
  const sections = [base, compressedBlockGuidance];
  if (userFocus && userFocus.trim().length > 0) {
    sections.push(`Additional user focus:
${userFocus.trim()}`);
  }
  return sections.join("\n\n");
}
async function handleManualToggleCommand(ctx, modeArg) {
  const { client, state, logger, sessionId, messages } = ctx;
  if (modeArg === "on") {
    state.manualMode = "active";
  } else if (modeArg === "off") {
    state.manualMode = false;
  } else {
    state.manualMode = state.manualMode ? false : "active";
  }
  const params = getCurrentParams(state, messages, logger);
  await sendIgnoredMessage(
    client,
    sessionId,
    state.manualMode ? MANUAL_MODE_ON : MANUAL_MODE_OFF,
    params,
    logger
  );
  await saveManualModeSetting(sessionId, !!state.manualMode, logger);
  logger.info("Manual mode toggled", { manualMode: state.manualMode });
}
async function handleManualTriggerCommand(ctx, tool5, userFocus) {
  return getTriggerPrompt(tool5, ctx.state, ctx.config, userFocus);
}
function applyPendingManualTrigger(state, messages, logger) {
  const pending = state.pendingManualTrigger;
  if (!pending) {
    return;
  }
  if (!state.sessionId || pending.sessionId !== state.sessionId) {
    state.pendingManualTrigger = null;
    return;
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.info.role !== "user" || isIgnoredUserMessage(msg)) {
      continue;
    }
    for (const part of msg.parts) {
      if (part.type !== "text" || part.ignored || part.synthetic) {
        continue;
      }
      part.text = pending.prompt;
      state.pendingManualTrigger = null;
      logger.debug("Applied manual prompt", { sessionId: pending.sessionId });
      return;
    }
  }
  state.pendingManualTrigger = null;
}

// lib/commands/recompress.ts
function parseBlockIdArg2(arg) {
  const normalized = arg.trim().toLowerCase();
  const blockRef = parseBlockRef(normalized) ?? parseBlockRef(normalized, "compact");
  if (blockRef !== null) {
    return blockRef;
  }
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function snapshotActiveMessages2(messagesState) {
  const activeMessages = /* @__PURE__ */ new Set();
  for (const [messageId, entry] of messagesState.byMessageId) {
    if (entry.activeBlockIds.length > 0) {
      activeMessages.add(messageId);
    }
  }
  return activeMessages;
}
function formatRecompressMessage(target, recompressedMessageCount, recompressedTokens, deactivatedBlockIds) {
  const lines = [];
  lines.push(`Re-applied compression ${target.displayId}.`);
  if (target.runId !== target.displayId || target.grouped) {
    lines.push(`Tool call label: Compression #${target.runId}.`);
  }
  if (deactivatedBlockIds.length > 0) {
    const refs = deactivatedBlockIds.map((id) => String(id)).join(", ");
    lines.push(`Also re-compressed nested compression(s): ${refs}.`);
  }
  if (recompressedMessageCount > 0) {
    lines.push(
      `Re-compressed ${recompressedMessageCount} message(s) (~${formatTokenCount(recompressedTokens)}).`
    );
  } else {
    lines.push("No messages were re-compressed.");
  }
  return lines.join("\n");
}
function formatAvailableBlocksMessage2(availableTargets) {
  const lines = [];
  lines.push("Usage: /dcp recompress <n>");
  lines.push("");
  if (availableTargets.length === 0) {
    lines.push("No user-decompressed blocks are available to re-compress.");
    return lines.join("\n");
  }
  lines.push("Available user-decompressed compressions:");
  const entries = availableTargets.map((target) => {
    const topic = target.topic.replace(/\s+/g, " ").trim() || "(no topic)";
    const label = `${target.displayId} (${formatTokenCount(target.compressedTokens)})`;
    const details = target.grouped ? `Compression #${target.runId} - ${target.blocks.length} messages` : `Compression #${target.runId}`;
    return { label, topic: `${details} - ${topic}` };
  });
  const labelWidth = Math.max(...entries.map((entry) => entry.label.length)) + 4;
  for (const entry of entries) {
    lines.push(`  ${entry.label.padEnd(labelWidth)}${entry.topic}`);
  }
  return lines.join("\n");
}
async function handleRecompressCommand(ctx) {
  const { client, state, logger, sessionId, messages, args } = ctx;
  const params = getCurrentParams(state, messages, logger);
  const targetArg = args[0];
  if (args.length > 1) {
    await sendIgnoredMessage(
      client,
      sessionId,
      "Invalid arguments. Usage: /dcp recompress <n>",
      params,
      logger
    );
    return;
  }
  syncCompressionBlocks(state, logger, messages);
  const messagesState = state.prune.messages;
  const availableMessageIds = new Set(messages.map((msg) => msg.info.id));
  if (!targetArg) {
    const availableTargets = getRecompressibleCompressionTargets(
      messagesState,
      availableMessageIds
    );
    const message2 = formatAvailableBlocksMessage2(availableTargets);
    await sendIgnoredMessage(client, sessionId, message2, params, logger);
    return;
  }
  const targetBlockId = parseBlockIdArg2(targetArg);
  if (targetBlockId === null) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Please enter a compression number. Example: /dcp recompress 2`,
      params,
      logger
    );
    return;
  }
  const target = resolveCompressionTarget(messagesState, targetBlockId);
  if (!target) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Compression ${targetBlockId} does not exist.`,
      params,
      logger
    );
    return;
  }
  if (target.blocks.some((block) => block.archived || !availableMessageIds.has(block.compressMessageId))) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Compression ${target.displayId} can no longer be re-applied because its origin message is no longer in this session.`,
      params,
      logger
    );
    return;
  }
  if (!target.blocks.some((block) => block.deactivatedByUser)) {
    const message2 = target.blocks.some((block) => block.active) ? `Compression ${target.displayId} is already active.` : `Compression ${target.displayId} is not user-decompressed.`;
    await sendIgnoredMessage(client, sessionId, message2, params, logger);
    return;
  }
  const activeMessagesBefore = snapshotActiveMessages2(messagesState);
  const activeBlockIdsBefore = new Set(messagesState.activeBlockIds);
  const descendants = new Set(target.blocks.map((block) => block.blockId));
  const queue = [...descendants];
  for (let index = 0; index < queue.length; index++) {
    const block = messagesState.blocksById.get(queue[index]);
    for (const id of block?.consumedBlockIds ?? []) {
      if (descendants.has(id)) continue;
      descendants.add(id);
      queue.push(id);
    }
  }
  const targetMessages = new Set(target.blocks.flatMap((block) => block.effectiveMessageIds));
  const conflict = [...messagesState.activeBlockIds].find(
    (id) => !descendants.has(id) && messagesState.blocksById.get(id)?.effectiveMessageIds.some((messageId) => targetMessages.has(messageId))
  );
  if (conflict !== void 0) {
    await sendIgnoredMessage(
      client,
      sessionId,
      `Compression ${target.displayId} overlaps active compression ${conflict}. Restore that compression first.`,
      params,
      logger
    );
    return;
  }
  for (const block of target.blocks) {
    block.deactivatedByUser = false;
    block.deactivatedAt = void 0;
    block.deactivatedByBlockId = void 0;
  }
  syncCompressionBlocks(state, logger, messages);
  let recompressedMessageCount = 0;
  let recompressedTokens = 0;
  for (const [messageId, entry] of messagesState.byMessageId) {
    const isActiveNow = entry.activeBlockIds.length > 0;
    if (isActiveNow && !activeMessagesBefore.has(messageId)) {
      recompressedMessageCount++;
      recompressedTokens += entry.tokenCount;
    }
  }
  state.stats.totalPruneTokens += recompressedTokens;
  const deactivatedBlockIds = Array.from(activeBlockIdsBefore).filter((blockId) => !messagesState.activeBlockIds.has(blockId)).sort((a, b) => a - b);
  await saveSessionState(state, logger);
  const message = formatRecompressMessage(
    target,
    recompressedMessageCount,
    recompressedTokens,
    deactivatedBlockIds
  );
  await sendIgnoredMessage(client, sessionId, message, params, logger);
  logger.info("Recompress command completed", {
    targetBlockId: target.displayId,
    targetRunId: target.runId,
    recompressedMessageCount,
    recompressedTokens,
    deactivatedBlockIds
  });
}

// lib/commands/stats.ts
function formatStatsMessage(sessionTokens, sessionSummaryTokens, sessionTools, sessionMessages, sessionDurationMs, allTime) {
  const lines = [];
  lines.push("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E");
  lines.push("\u2502                    DCP Statistics                         \u2502");
  lines.push("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F");
  lines.push("");
  lines.push("Compression:");
  lines.push("\u2500".repeat(60));
  lines.push(
    `  Tokens in|out:    ~${formatTokenCount(sessionTokens)} | ~${formatTokenCount(sessionSummaryTokens)}`
  );
  lines.push(`  Ratio:            ${formatCompressionRatio(sessionTokens, sessionSummaryTokens)}`);
  lines.push(`  Time:             ${formatCompressionTime(sessionDurationMs)}`);
  lines.push(`  Messages:         ${sessionMessages}`);
  lines.push(`  Tools:            ${sessionTools}`);
  lines.push("");
  lines.push("All-time:");
  lines.push("\u2500".repeat(60));
  lines.push(`  Tokens saved:    ~${formatTokenCount(allTime.totalTokens)}`);
  lines.push(`  Tools pruned:     ${allTime.totalTools}`);
  lines.push(`  Messages pruned:  ${allTime.totalMessages}`);
  lines.push(`  Sessions:         ${allTime.sessionCount}`);
  return lines.join("\n");
}
function formatCompressionRatio(inputTokens, outputTokens) {
  if (inputTokens <= 0) {
    return "0:1";
  }
  if (outputTokens <= 0) {
    return "\u221E:1";
  }
  const ratio = Math.max(1, Math.round(inputTokens / outputTokens));
  return `${ratio}:1`;
}
function formatCompressionTime(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  if (safeMs < 1e3) {
    return `${safeMs} ms`;
  }
  const totalSeconds = safeMs / 1e3;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} s`;
  }
  const wholeSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor(wholeSeconds % 3600 / 60);
  const seconds = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}
async function handleStatsCommand(ctx) {
  const { client, state, logger, sessionId, messages } = ctx;
  const report2 = await buildStatsReport(state, logger);
  const message = formatStatsMessage(
    report2.sessionTokens,
    report2.sessionSummaryTokens,
    report2.sessionTools,
    report2.sessionMessages,
    report2.sessionDurationMs,
    report2.allTime
  );
  const params = getCurrentParams(state, messages, logger);
  await sendIgnoredMessage(client, sessionId, message, params, logger);
  logger.info("Stats command executed", {
    sessionTokens: report2.sessionTokens,
    sessionSummaryTokens: report2.sessionSummaryTokens,
    sessionTools: report2.sessionTools,
    sessionMessages: report2.sessionMessages,
    sessionDurationMs: report2.sessionDurationMs,
    allTimeTokens: report2.allTime.totalTokens,
    allTimeTools: report2.allTime.totalTools,
    allTimeMessages: report2.allTime.totalMessages
  });
}
async function buildStatsReport(state, logger) {
  const sessionTokens = state.stats.totalPruneTokens;
  const sessionSummaryTokens = Array.from(state.prune.messages.blocksById.values()).reduce(
    (total, block) => block.active ? total + block.summaryTokens : total,
    0
  );
  const sessionDurationMs = getActiveCompressionTargets(state.prune.messages).reduce(
    (total, target) => total + target.durationMs,
    0
  );
  const prunedToolIds = new Set(state.prune.tools.keys());
  for (const block of state.prune.messages.blocksById.values()) {
    if (block.active) {
      for (const toolId of block.effectiveToolIds) {
        prunedToolIds.add(toolId);
      }
    }
  }
  const sessionTools = prunedToolIds.size;
  let sessionMessages = 0;
  for (const entry of state.prune.messages.byMessageId.values()) {
    if (entry.activeBlockIds.length > 0) {
      sessionMessages++;
    }
  }
  const allTime = await loadAllSessionStats(logger);
  return {
    sessionTokens,
    sessionSummaryTokens,
    sessionTools,
    sessionMessages,
    sessionDurationMs,
    allTime
  };
}

// lib/commands/sweep.ts
function findLastUserMessageIndex(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.info.role === "user" && !isIgnoredUserMessage(msg)) {
      return i;
    }
  }
  return -1;
}
function collectToolIdsAfterIndex(state, messages, afterIndex) {
  const toolIds = [];
  for (let i = afterIndex + 1; i < messages.length; i++) {
    const msg = messages[i];
    if (isMessageCompacted(state, msg)) {
      continue;
    }
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    if (parts.length > 0) {
      for (const part of parts) {
        if (part.type === "tool" && part.callID && part.tool) {
          toolIds.push(part.callID);
        }
      }
    }
  }
  return toolIds;
}
function formatNoUserMessage() {
  const lines = [];
  lines.push("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E");
  lines.push("\u2502                      DCP Sweep                            \u2502");
  lines.push("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F");
  lines.push("");
  lines.push("Nothing swept: no user message found.");
  return lines.join("\n");
}
function formatSweepMessage(toolCount, tokensSaved, mode, toolIds, toolMetadata, workingDirectory, skippedProtected) {
  const lines = [];
  lines.push("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E");
  lines.push("\u2502                      DCP Sweep                            \u2502");
  lines.push("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F");
  lines.push("");
  if (toolCount === 0) {
    if (mode === "since-user") {
      lines.push("No tools found since the previous user message.");
    } else {
      lines.push(`No tools found to sweep.`);
    }
    if (skippedProtected && skippedProtected > 0) {
      lines.push(`(${skippedProtected} protected tool(s) skipped)`);
    }
  } else {
    if (mode === "since-user") {
      lines.push(`Swept ${toolCount} tool(s) since the previous user message.`);
    } else {
      lines.push(`Swept the last ${toolCount} tool(s).`);
    }
    lines.push(`Tokens saved: ~${tokensSaved.toLocaleString()}`);
    if (skippedProtected && skippedProtected > 0) {
      lines.push(`(${skippedProtected} protected tool(s) skipped)`);
    }
    lines.push("");
    const itemLines = formatPrunedItemsList(toolIds, toolMetadata, workingDirectory);
    lines.push(...itemLines);
  }
  return lines.join("\n");
}
async function handleSweepCommand(ctx) {
  const { client, state, config, logger, sessionId, messages, args, workingDirectory } = ctx;
  const params = getCurrentParams(state, messages, logger);
  const protectedTools = config.commands.protectedTools;
  syncToolCache(state, config, logger, messages);
  buildToolIdList(state, messages);
  const numArg = args[0] ? parseInt(args[0], 10) : null;
  const isLastNMode = numArg !== null && !isNaN(numArg) && numArg > 0;
  let toolIdsToSweep;
  let mode;
  if (isLastNMode) {
    mode = "last-n";
    const startIndex = Math.max(0, state.toolIdList.length - numArg);
    toolIdsToSweep = state.toolIdList.slice(startIndex);
    logger.info(`Sweep command: last ${numArg} mode, found ${toolIdsToSweep.length} tools`);
  } else {
    mode = "since-user";
    const lastUserMsgIndex = findLastUserMessageIndex(messages);
    if (lastUserMsgIndex === -1) {
      const message2 = formatNoUserMessage();
      await sendIgnoredMessage(client, sessionId, message2, params, logger);
      logger.info("Sweep command: no user message found");
      return;
    } else {
      toolIdsToSweep = collectToolIdsAfterIndex(state, messages, lastUserMsgIndex);
      logger.info(
        `Sweep command: found last user at index ${lastUserMsgIndex}, sweeping ${toolIdsToSweep.length} tools`
      );
    }
  }
  const newToolIds = toolIdsToSweep.filter((id) => {
    if (state.prune.tools.has(id)) {
      return false;
    }
    const entry = state.toolParameters.get(id);
    if (!entry) {
      return true;
    }
    if (isToolProtected(
      entry.tool,
      entry.parameters,
      protectedTools,
      config.protectedFilePatterns,
      entry.metadata
    )) {
      logger.debug(`Sweep: skipping protected tool ${entry.tool} (${id})`);
      return false;
    }
    return true;
  });
  const skippedProtected = toolIdsToSweep.filter((id) => {
    const entry = state.toolParameters.get(id);
    if (!entry) {
      return false;
    }
    return isToolProtected(
      entry.tool,
      entry.parameters,
      protectedTools,
      config.protectedFilePatterns,
      entry.metadata
    );
  }).length;
  if (newToolIds.length === 0) {
    const message2 = formatSweepMessage(
      0,
      0,
      mode,
      [],
      /* @__PURE__ */ new Map(),
      workingDirectory,
      skippedProtected
    );
    await sendIgnoredMessage(client, sessionId, message2, params, logger);
    logger.info("Sweep command: no new tools to sweep", { skippedProtected });
    return;
  }
  const tokensSaved = getTotalToolTokens(state, newToolIds);
  for (const id of newToolIds) {
    const entry = state.toolParameters.get(id);
    state.prune.tools.set(id, entry?.tokenCount ?? 0);
  }
  state.stats.pruneTokenCounter += tokensSaved;
  state.stats.totalPruneTokens += state.stats.pruneTokenCounter;
  state.stats.pruneTokenCounter = 0;
  const toolMetadata = /* @__PURE__ */ new Map();
  for (const id of newToolIds) {
    const entry = state.toolParameters.get(id);
    if (entry) {
      toolMetadata.set(id, entry);
    }
  }
  saveSessionState(state, logger).catch(
    (err) => logger.error("Failed to persist state after sweep", { error: err.message })
  );
  const message = formatSweepMessage(
    newToolIds.length,
    tokensSaved,
    mode,
    newToolIds,
    toolMetadata,
    workingDirectory,
    skippedProtected
  );
  await sendIgnoredMessage(client, sessionId, message, params, logger);
  logger.info("Sweep command completed", {
    toolsSwept: newToolIds.length,
    tokensSaved,
    skippedProtected,
    mode,
    tools: Array.from(toolMetadata.entries()).map(([id, entry]) => ({
      id,
      tool: entry.tool
    }))
  });
}

// lib/hooks.ts
var INTERNAL_AGENT_SIGNATURES = [
  "You are a title generator",
  "You are a helpful AI assistant tasked with summarizing conversations",
  "You are an anchored context summarization assistant for coding sessions",
  "Summarize what was done in this conversation"
];
function isInternalAgentCall(systemPrompts) {
  const primaryPrompt = systemPrompts[0];
  if (typeof primaryPrompt !== "string" || primaryPrompt.length === 0) {
    return false;
  }
  return INTERNAL_AGENT_SIGNATURES.some((signature) => primaryPrompt.includes(signature));
}
function createSystemPromptHandler(state, logger, config, prompts) {
  return async (input, output2) => {
    if (input.model?.limit?.context) {
      state.modelContextLimit = input.model.limit.context;
      logger.debug("Cached model context limit", { limit: state.modelContextLimit });
    }
    if (state.isSubAgent && !config.experimental.allowSubAgents) {
      return;
    }
    if (isInternalAgentCall(output2.system)) {
      logger.info("Skipping DCP system prompt injection for internal agent");
      return;
    }
    const effectivePermission = input.sessionID && state.sessionId === input.sessionID ? compressPermission(state, config) : config.compress.permission;
    if (effectivePermission === "deny") {
      return;
    }
    prompts.reload();
    const runtimePrompts = prompts.getRuntimePrompts();
    const newPrompt = renderSystemPrompt(
      runtimePrompts,
      buildProtectedToolsExtension(config.compress.protectedTools),
      !!state.manualMode,
      state.isSubAgent && config.experimental.allowSubAgents
    );
    if (output2.system.length > 0) {
      output2.system[output2.system.length - 1] += "\n\n" + newPrompt;
    } else {
      output2.system.push(newPrompt);
    }
  };
}
function createChatMessageTransformHandler(client, state, logger, config, prompts, hostPermissions) {
  return async (input, output2) => {
    const receivedMessages = Array.isArray(output2.messages) ? output2.messages.length : 0;
    const messages = filterMessagesInPlace(output2.messages);
    if (messages.length !== receivedMessages) {
      logger.warn("Skipping messages with unexpected shape during chat transform", {
        received: receivedMessages,
        usable: messages.length
      });
    }
    await checkSession(client, state, logger, output2.messages, config.manualMode.enabled);
    syncCompressPermissionState(state, config, hostPermissions, output2.messages);
    if (state.isSubAgent && !config.experimental.allowSubAgents) {
      return;
    }
    stripHallucinations(output2.messages);
    cacheSystemPromptTokens(state, output2.messages);
    assignMessageRefs(state, output2.messages);
    syncCompressionBlocks(state, logger, output2.messages);
    syncToolCache(state, config, logger, output2.messages);
    buildToolIdList(state, output2.messages);
    prune(state, logger, config, output2.messages);
    await injectExtendedSubAgentResults(
      client,
      state,
      logger,
      output2.messages,
      config.experimental.allowSubAgents
    );
    const compressionPriorities = buildPriorityMap(config, state, output2.messages);
    prompts.reload();
    injectCompressNudges(
      state,
      config,
      logger,
      output2.messages,
      prompts.getRuntimePrompts(),
      compressionPriorities
    );
    injectMessageIds(state, config, output2.messages, compressionPriorities);
    applyPendingManualTrigger(state, output2.messages, logger);
    stripStaleMetadata(output2.messages);
    if (state.sessionId) {
      await logger.saveContext(state.sessionId, output2.messages);
    }
  };
}
function createCommandExecuteHandler(client, state, logger, config, workingDirectory, hostPermissions) {
  return async (input, output2) => {
    if (!config.commands.enabled) {
      return;
    }
    if (input.command === "dcp" || input.command === "dcp-compress") {
      const messagesResponse = await client.session.messages({
        path: { id: input.sessionID }
      });
      const messages = filterMessages(messagesResponse.data || messagesResponse);
      await ensureSessionInitialized(
        client,
        state,
        input.sessionID,
        logger,
        messages,
        config.manualMode.enabled
      );
      syncCompressPermissionState(state, config, hostPermissions, messages);
      const effectivePermission = compressPermission(state, config);
      if (effectivePermission === "deny") {
        return;
      }
      const args = (input.arguments || "").trim().split(/\s+/).filter(Boolean);
      const isCompressCommand = input.command === "dcp-compress";
      const subcommand = isCompressCommand ? "compress" : args[0]?.toLowerCase() || "";
      const subArgs = isCompressCommand ? args : args.slice(1);
      const commandCtx = {
        client,
        state,
        config,
        logger,
        sessionId: input.sessionID,
        messages
      };
      if (subcommand === "context") {
        await handleContextCommand(commandCtx);
        return;
      }
      if (subcommand === "stats") {
        await handleStatsCommand(commandCtx);
        return;
      }
      if (subcommand === "sweep") {
        await handleSweepCommand({
          ...commandCtx,
          args: subArgs,
          workingDirectory
        });
        return;
      }
      if (subcommand === "manual") {
        await handleManualToggleCommand(commandCtx, subArgs[0]?.toLowerCase());
        return;
      }
      if (subcommand === "compress") {
        const userFocus = subArgs.join(" ").trim();
        const prompt = await handleManualTriggerCommand(commandCtx, "compress", userFocus);
        if (!prompt) {
          throw new Error("__DCP_MANUAL_TRIGGER_BLOCKED__");
        }
        state.manualMode = "compress-pending";
        state.pendingManualTrigger = {
          sessionId: input.sessionID,
          prompt
        };
        const rawArgs = (input.arguments || "").trim();
        output2.parts.length = 0;
        output2.parts.push({
          type: "text",
          text: isCompressCommand ? rawArgs ? `/dcp-compress ${rawArgs}` : "/dcp-compress" : rawArgs ? `/dcp ${rawArgs}` : `/dcp ${subcommand}`
        });
        return;
      }
      if (subcommand === "decompress") {
        await handleDecompressCommand({
          ...commandCtx,
          args: subArgs
        });
        return;
      }
      if (subcommand === "recompress") {
        await handleRecompressCommand({
          ...commandCtx,
          args: subArgs
        });
        return;
      }
      await handleHelpCommand(commandCtx);
      return;
    }
  };
}
function createTextCompleteHandler() {
  return async (_input, output2) => {
    output2.text = stripHallucinationsFromString(output2.text);
  };
}
function createEventHandler(state, logger) {
  return async (input) => {
    const eventTime = typeof input.event?.time === "number" && Number.isFinite(input.event.time) ? input.event.time : typeof input.event?.properties?.time === "number" && Number.isFinite(input.event.properties.time) ? input.event.properties.time : void 0;
    if (input.event.type !== "message.part.updated") {
      return;
    }
    const part = input.event.properties?.part;
    if (part?.type !== "tool" || part.tool !== "compress") {
      return;
    }
    if (part.state.status === "pending") {
      if (typeof part.callID !== "string" || typeof part.messageID !== "string") {
        return;
      }
      const startedAt = eventTime ?? Date.now();
      const key = buildCompressionTimingKey(part.messageID, part.callID);
      if (state.compressionTiming.startsByCallId.has(key)) {
        return;
      }
      state.compressionTiming.startsByCallId.set(key, startedAt);
      logger.debug("Recorded compression start", {
        messageID: part.messageID,
        callID: part.callID,
        startedAt
      });
      return;
    }
    if (part.state.status === "completed") {
      if (typeof part.callID !== "string" || typeof part.messageID !== "string") {
        return;
      }
      const key = buildCompressionTimingKey(part.messageID, part.callID);
      const start = consumeCompressionStart(state, part.messageID, part.callID);
      const durationMs = resolveCompressionDuration(start, eventTime, part.state.time);
      if (typeof durationMs !== "number") {
        return;
      }
      state.compressionTiming.pendingByCallId.set(key, {
        messageId: part.messageID,
        callId: part.callID,
        durationMs
      });
      const updates = applyPendingCompressionDurations(state);
      if (updates === 0) {
        return;
      }
      await saveSessionState(state, logger);
      logger.info("Attached compression time to blocks", {
        messageID: part.messageID,
        callID: part.callID,
        blocks: updates,
        durationMs
      });
      return;
    }
    if (part.state.status === "running") {
      return;
    }
    if (typeof part.callID === "string" && typeof part.messageID === "string") {
      state.compressionTiming.startsByCallId.delete(
        buildCompressionTimingKey(part.messageID, part.callID)
      );
    }
  };
}

// lib/auth.ts
function isSecureMode() {
  return !!process.env.OPENCODE_SERVER_PASSWORD;
}
function getAuthorizationHeader() {
  const password = process.env.OPENCODE_SERVER_PASSWORD;
  if (!password) return void 0;
  const username = process.env.OPENCODE_SERVER_USERNAME ?? "opencode";
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${credentials}`;
}
function configureClientAuth(client) {
  const authHeader = getAuthorizationHeader();
  if (!authHeader) {
    return client;
  }
  const innerClient = client._client || client.client;
  if (innerClient?.interceptors?.request) {
    innerClient.interceptors.request.use((request) => {
      if (!request.headers.has("Authorization")) {
        request.headers.set("Authorization", authHeader);
      }
      return request;
    });
  }
  return client;
}

// lib/exclusive.ts
function createExclusiveRunner() {
  let pending = Promise.resolve();
  return function exclusive(fn) {
    return (...args) => {
      const next = pending.then(() => fn(...args));
      pending = next.catch(() => {
      });
      return next;
    };
  };
}

// lib/v2/index.ts
import { tool as tool4 } from "@opencode-ai/plugin";

// lib/v2/messages.ts
var emptyUsage = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } };
function mediaFile(part) {
  if ("media" in part) {
    return { mime: part.media.mediaType, url: part.media.source.url ?? "" };
  }
  return { mime: part.mediaType, url: typeof part.data === "string" ? part.data : "" };
}
function info(id, role, session2, entry) {
  const model = entry?.type === "assistant" ? entry.model : session2.model;
  return {
    id,
    role,
    sessionID: session2.id,
    time: { created: entry?.time.created ?? 0 },
    agent: entry?.type === "assistant" ? entry.agent : session2.agent,
    model: { providerID: model?.providerID, modelID: model?.id, variant: model?.variant },
    providerID: model?.providerID,
    modelID: model?.id,
    tokens: entry?.type === "assistant" ? entry.tokens ?? emptyUsage : emptyUsage,
    summary: entry?.type === "compaction" && entry.status === "completed"
  };
}
function history(entries, session2) {
  return entries.flatMap((entry) => {
    const base = { sessionID: session2.id, messageID: entry.id };
    if (entry.type === "assistant") {
      const parts = entry.content.map((part, index) => {
        if (part.type !== "tool")
          return { ...base, id: `${entry.id}:${index}`, type: part.type, text: part.text };
        const state = part.state;
        return {
          ...base,
          id: part.id,
          type: "tool",
          callID: part.id,
          tool: part.name,
          state: {
            ...state,
            input: structuredClone(state.input),
            ...state.status === "completed" ? { output: output(state.content) } : {}
          }
        };
      });
      return [
        {
          info: info(entry.id, "assistant", session2, entry),
          parts: [{ ...base, id: `${entry.id}:step`, type: "step-start" }, ...parts]
        }
      ];
    }
    let text;
    if (entry.type === "user")
      text = [
        ...(entry.skills ?? []).flatMap(
          (skill) => skill.text === void 0 ? [] : [skill.text]
        ),
        entry.text
      ].join("\n\n");
    if (entry.type === "synthetic" || entry.type === "skill") text = entry.text;
    if (entry.type === "location-switched")
      text = `The working directory has been changed to ${entry.location.directory}.`;
    if (entry.type === "shell" && entry.metadata?.background !== true)
      text = `The following shell command was executed by the user:

Command:
${entry.command}

Output:
${entry.output?.output ?? ""}`;
    if (text !== void 0) {
      return [
        {
          info: info(entry.id, "user", session2, entry),
          parts: [{ ...base, id: `${entry.id}:text`, type: "text", text }]
        }
      ];
    }
    if (entry.type === "compaction" && entry.status === "completed") {
      return [{ info: info(entry.id, "assistant", session2, entry), parts: [] }];
    }
    return [];
  });
}
function output(content) {
  return content.length === 1 && content[0]?.type === "text" ? content[0].text : structuredClone(content);
}
function project(native, entries, session2) {
  const byID = new Map(entries.map((entry) => [entry.id, entry]));
  const results = /* @__PURE__ */ new Map();
  const owners = /* @__PURE__ */ new Map();
  const links = /* @__PURE__ */ new Map();
  const originals = /* @__PURE__ */ new Map();
  const messages = [];
  for (const message of native)
    for (const part of message.content) {
      if (part.type === "tool-result") results.set(part.id, part);
      if (part.type === "tool-call" && message.id) owners.set(part.id, message.id);
    }
  for (const message of native) {
    if (!message.id || !["user", "assistant"].includes(message.role)) continue;
    const entry = byID.get(message.id);
    if (!entry || entry.type === "compaction") continue;
    const base = { sessionID: session2.id, messageID: message.id };
    const parts = [];
    if (message.role === "assistant")
      parts.push({ ...base, id: `${message.id}:step`, type: "step-start" });
    for (const [index, part] of message.content.entries()) {
      let projected2;
      if (part.type === "text")
        projected2 = { ...base, id: `${message.id}:${index}`, type: "text", text: part.text };
      if (part.type === "media")
        projected2 = {
          ...base,
          id: `${message.id}:${index}`,
          type: "file",
          ...mediaFile(part)
        };
      if (part.type === "tool-call") {
        const result = results.get(part.id);
        const entry2 = byID.get(message.id);
        const durable = entry2?.type === "assistant" ? entry2.content.find((item) => item.type === "tool" && item.id === part.id) : void 0;
        projected2 = {
          ...base,
          id: part.id,
          type: "tool",
          callID: part.id,
          tool: part.name,
          state: {
            status: !result ? "running" : result.result.type === "error" ? "error" : "completed",
            input: structuredClone(part.input),
            ...result?.result.type === "error" ? { error: result.result.value } : {
              output: structuredClone(
                result?.result.type === "text" ? result.result.value : result?.result
              )
            },
            metadata: durable?.type === "tool" && "metadata" in durable.state ? durable.state.metadata : {}
          }
        };
        if (result) links.set(result, projected2);
      }
      if (projected2) {
        parts.push(projected2);
        links.set(part, projected2);
      }
    }
    const projected = {
      info: info(message.id, message.role, session2, byID.get(message.id)),
      parts
    };
    messages.push(projected);
    originals.set(message.id, projected);
  }
  function restore() {
    const retained = new Set(messages.map((message) => message.info.id));
    const linked = new Set(links.values());
    const output2 = [];
    let next = 0;
    const synthetic = () => {
      while (next < messages.length && !originals.has(messages[next].info.id)) {
        const message = messages[next++];
        output2.push({
          id: message.info.id,
          role: "user",
          content: message.parts.filter((part) => part.type === "text").map((part) => ({ type: "text", text: part.text }))
        });
      }
    };
    for (const message of native) {
      const projected = message.id ? originals.get(message.id) : void 0;
      if (projected) {
        synthetic();
        if (!retained.has(message.id)) continue;
        next++;
      }
      const content = [];
      const added = projected?.parts.flatMap(
        (part) => part.type === "text" && !linked.has(part) ? [{ type: "text", text: part.text }] : []
      ) ?? [];
      for (const part of message.content) {
        if (part.type === "tool-call") content.push(...added.splice(0));
        if (part.type === "tool-result" && originals.has(owners.get(part.id)) && !retained.has(owners.get(part.id)))
          continue;
        const edit = links.get(part);
        if (part.type === "text" && edit?.type === "text")
          content.push({ ...part, text: edit.text });
        else if (part.type === "tool-call" && edit?.type === "tool")
          content.push({ ...part, input: edit.state.input });
        else if (part.type === "tool-result" && edit?.type === "tool" && edit.state.status === "completed" && typeof edit.state.output === "string" && edit.state.output !== part.result.value) {
          content.push({ ...part, result: { type: "text", value: edit.state.output } });
        } else content.push(part);
      }
      content.push(...added);
      if (content.length || message.content.length === 0) output2.push({ ...message, content });
    }
    synthetic();
    return output2;
  }
  const summaryBase = { info: info("msg_dcp_base", "user", session2), parts: [] };
  return { messages, restore, summaryBase };
}

// lib/v2/rpc.ts
import { tool as tool3 } from "@opencode-ai/plugin";
var z = tool3.schema;
var session = z.object({ sessionID: z.string() });
var stats = z.object({
  sessionTokens: z.number(),
  sessionSummaryTokens: z.number(),
  sessionDurationMs: z.number(),
  sessionTools: z.number(),
  sessionMessages: z.number(),
  allTime: z.object({
    totalTokens: z.number(),
    totalTools: z.number(),
    totalMessages: z.number(),
    sessionCount: z.number()
  })
});
var context = z.object({
  system: z.number(),
  user: z.number(),
  assistant: z.number(),
  tools: z.number(),
  toolCount: z.number(),
  toolsInContextCount: z.number(),
  prunedTokens: z.number(),
  prunedToolCount: z.number(),
  prunedMessageCount: z.number(),
  total: z.number()
});
var rpc = {
  id: "dcp",
  methods: {
    status: { input: z.object({}), output: z.object({ enabled: z.boolean() }) },
    snapshot: {
      input: session,
      output: z.object({
        manualMode: z.boolean(),
        canCompress: z.boolean(),
        blockedReason: z.string().optional(),
        context,
        stats
      })
    },
    manual: { input: session.extend({ enabled: z.boolean() }), output: z.object({}) }
  },
  events: {}
};

// lib/v2/index.ts
async function report(logger, text, sessionID) {
  logger.debug("V2 report (display pending)", { sessionID, text });
}
async function setup(ctx) {
  const warnings = {
    tui: {
      showToast: async (input) => {
        console.warn(`DCP: ${input.body.message}`);
      }
    }
  };
  const config = getConfig({ directory: ctx.location.directory, client: warnings });
  if (!config.enabled) {
    await ctx.rpc.register(
      { ...rpc, methods: { status: rpc.methods.status } },
      { status: async () => ({ enabled: false }) }
    );
    return;
  }
  const logger = new Logger(config.debug);
  const prompts = new PromptStore(
    logger,
    ctx.location.directory,
    config.experimental.customPrompts,
    "compact"
  );
  const sessions = /* @__PURE__ */ new Map();
  const queues = /* @__PURE__ */ new Map();
  const limits = /* @__PURE__ */ new Map();
  const aliases = {
    task: "subagent",
    bash: "shell",
    apply_patch: "patch"
  };
  for (const list of [
    config.compress.protectedTools,
    config.commands.protectedTools,
    config.strategies.deduplication.protectedTools,
    config.strategies.purgeErrors.protectedTools
  ]) {
    for (const name of [...list])
      if (aliases[name] && !list.includes(aliases[name])) list.push(aliases[name]);
  }
  function serial(sessionID, operation) {
    const pending = (queues.get(sessionID) ?? Promise.resolve()).catch(() => {
    }).then(operation);
    queues.set(sessionID, pending);
    void pending.finally(() => {
      if (queues.get(sessionID) === pending) queues.delete(sessionID);
    }).catch(() => {
    });
    return pending;
  }
  const client = {
    session: {
      get: async ({ path }) => ({
        data: await ctx.session.get({ sessionID: path.id })
      }),
      messages: async ({ path }) => {
        const [entries, session2] = await Promise.all([
          ctx.session.context({ sessionID: path.id }),
          ctx.session.get({ sessionID: path.id })
        ]);
        return { data: history(entries, session2) };
      },
      prompt: async (input) => report(logger, input.body.parts.map((part) => part.text).join("\n"), input.path.id)
    },
    tui: {
      showToast: async (input) => report(logger, input.body.message)
    }
  };
  async function load(sessionID, agentID) {
    const [session2, entries] = await Promise.all([
      ctx.session.get({ sessionID }),
      ctx.session.context({ sessionID })
    ]);
    const selected = agentID ?? session2.agent ?? entries.findLast((entry) => entry.type === "assistant")?.agent;
    if (!selected) throw new Error("DCP commands require a session with a selected agent");
    const { data: agent } = await ctx.agent.get({ agentID: selected });
    let state = sessions.get(sessionID);
    if (!state) {
      state = createSessionState("compact");
      sessions.set(sessionID, state);
    }
    const messages = history(entries, session2);
    await ensureSessionInitialized(
      client,
      state,
      sessionID,
      logger,
      messages,
      config.manualMode.enabled
    );
    await checkSession(client, state, logger, messages, config.manualMode.enabled);
    const rule = [...agent.permissions, ...session2.permissions ?? []].findLast(
      (rule2) => matchesGlob("compress", rule2.action) && matchesGlob("*", rule2.resource)
    );
    state.compressPermission = config.compress.permission === "deny" ? "deny" : rule?.effect === "deny" ? "deny" : config.compress.permission === "ask" || rule?.effect === "ask" ? "ask" : "allow";
    return { state, entries, session: session2, messages };
  }
  function allowed(state) {
    if (state.isSubAgent && !config.experimental.allowSubAgents)
      throw new Error("DCP compression is disabled in subagents");
    if (state.compressPermission === "deny") throw new Error("DCP compression is denied");
    if (state.compressPermission === "ask")
      throw new Error(
        "DCP: compress permission 'ask' is not supported by OpenCode V2's public plugin API yet. Compression was not performed."
      );
  }
  await ctx.model.transform((editor) => {
    limits.clear();
    for (const model of editor.list())
      limits.set(`${model.providerID}/${model.id}`, model.limit.context);
  });
  for (const kind of ["context", "compaction"])
    await ctx.session.hook(
      kind,
      (event) => serial(event.sessionID, async () => {
        const { state, entries, session: session2, messages } = await load(
          event.sessionID,
          event.agent
        );
        if (state.isSubAgent && !config.experimental.allowSubAgents) {
          delete event.tools.compress;
          return;
        }
        if (state.compressPermission === "deny") delete event.tools.compress;
        state.modelContextLimit = limits.get(`${event.model.providerID}/${event.model.id}`);
        state.systemPromptTokens = countTokens2(
          event.system.map((part) => part.text).join("\n")
        );
        const view = project(event.messages, entries, {
          ...session2,
          agent: event.agent,
          model: event.model
        });
        stripHallucinations(view.messages, state.idFormat);
        assignMessageRefs(state, view.messages);
        syncCompressionBlocks(state, logger, messages);
        syncToolCache(state, config, logger, view.messages);
        buildToolIdList(state, view.messages);
        prune(state, logger, config, view.messages, view.summaryBase);
        await injectExtendedSubAgentResults(
          client,
          state,
          logger,
          view.messages,
          config.experimental.allowSubAgents
        );
        const priorities = buildPriorityMap(config, state, view.messages);
        prompts.reload();
        injectCompressNudges(
          state,
          config,
          logger,
          view.messages,
          prompts.getRuntimePrompts(),
          priorities,
          kind === "context"
        );
        injectMessageIds(state, config, view.messages, priorities);
        applyPendingManualTrigger(state, view.messages, logger);
        event.messages = view.restore();
        const system = { system: event.system.map((part) => part.text) };
        await createSystemPromptHandler(
          state,
          logger,
          config,
          prompts
        )(
          {
            sessionID: event.sessionID,
            model: { limit: { context: state.modelContextLimit ?? 0 } }
          },
          system
        );
        event.system = system.system.map((text, index) => ({
          ...event.system[index],
          type: "text",
          text
        }));
        await logger.saveContext(event.sessionID, view.messages);
      })
    );
  if (config.compress.permission !== "deny") {
    const define = (state) => (config.compress.mode === "message" ? createCompressMessageTool : createHierarchicalCompressTool)({ client, state, logger, config, prompts });
    const definition = define(createSessionState("compact"));
    await ctx.tool.transform(
      (editor) => editor.add({
        name: "compress",
        description: definition.description,
        input: tool4.schema.object(definition.args),
        options: { codemode: false, permission: "compress" },
        execute: (input, context2) => serial(context2.sessionID, async () => {
          const { state } = await load(context2.sessionID, context2.agent);
          allowed(state);
          const started = Date.now();
          const legacy = define(state);
          const content = await legacy.execute(input, {
            sessionID: context2.sessionID,
            messageID: context2.messageID,
            callID: context2.id,
            agent: context2.agent,
            directory: ctx.location.directory,
            worktree: ctx.location.directory,
            abort: new AbortController().signal,
            ask: async () => allowed(state),
            metadata: ({ title }) => {
              void context2.progress({ title });
            }
          });
          attachCompressionDuration(
            state.prune.messages,
            context2.messageID,
            context2.id,
            Date.now() - started
          );
          await saveSessionState(state, logger);
          return { content };
        })
      })
    );
  }
  if (config.commands.enabled)
    await ctx.command.transform((editor) => {
      for (const name of ["dcp", "dcp-compress"])
        editor.add({
          name,
          description: name === "dcp" ? "DCP commands" : "Trigger DCP manual compression",
          execute: async (invocation) => {
            const prompt = await serial(invocation.sessionID, async () => {
              const { state } = await load(invocation.sessionID);
              const permission = state.compressPermission ?? config.compress.permission;
              if (name === "dcp-compress" || invocation.prompt.text.trim().split(/\s+/)[0] === "compress")
                allowed(state);
              const output2 = { parts: [] };
              await createCommandExecuteHandler(
                client,
                state,
                logger,
                config,
                ctx.location.directory,
                { global: { compress: permission }, agents: {} }
              )(
                {
                  command: name,
                  sessionID: invocation.sessionID,
                  arguments: invocation.prompt.text
                },
                output2
              );
              state.compressPermission = permission;
              const pending = state.pendingManualTrigger;
              if (!pending) return;
              allowed(state);
              state.pendingManualTrigger = null;
              return pending.prompt;
            });
            if (prompt)
              await ctx.session.prompt({
                sessionID: invocation.sessionID,
                text: prompt,
                delivery: invocation.delivery
              });
          }
        });
    });
  await ctx.rpc.register(rpc, {
    status: async () => ({ enabled: config.commands.enabled }),
    snapshot: ({ sessionID }) => serial(sessionID, async () => {
      const { state, messages } = await load(sessionID);
      syncCompressionBlocks(state, logger, messages);
      return {
        manualMode: !!state.manualMode,
        canCompress: state.compressPermission === "allow" && (!state.isSubAgent || config.experimental.allowSubAgents),
        ...state.compressPermission === "ask" ? {
          blockedReason: "Permission 'ask' is not supported by the V2 plugin API yet."
        } : {},
        context: analyzeContextTokens(state, messages),
        stats: await buildStatsReport(state, logger)
      };
    }),
    manual: ({ sessionID, enabled }) => serial(sessionID, async () => {
      const { state } = await load(sessionID);
      state.manualMode = enabled ? "active" : false;
      await saveSessionState(state, logger);
      return {};
    })
  });
  logger.info("DCP V2 initialized");
  return () => {
    sessions.clear();
    limits.clear();
  };
}

// index.ts
var server = (async (ctx) => {
  const config = getConfig(ctx);
  if (!config.enabled) {
    return {};
  }
  const logger = new Logger(config.debug);
  const state = createSessionState();
  const prompts = new PromptStore(logger, ctx.directory, config.experimental.customPrompts);
  const hostPermissions = {
    global: void 0,
    agents: {}
  };
  if (isSecureMode()) {
    configureClientAuth(ctx.client);
  }
  logger.info("DCP initialized", {
    strategies: config.strategies
  });
  const exclusive = createExclusiveRunner();
  const compressToolContext = {
    client: ctx.client,
    state,
    logger,
    config,
    prompts
  };
  const compressTool = config.compress.mode === "message" ? createCompressMessageTool(compressToolContext) : createHierarchicalCompressTool(compressToolContext);
  compressTool.execute = exclusive(compressTool.execute);
  return {
    "experimental.chat.system.transform": exclusive(createSystemPromptHandler(
      state,
      logger,
      config,
      prompts
    )),
    "experimental.chat.messages.transform": exclusive(createChatMessageTransformHandler(
      ctx.client,
      state,
      logger,
      config,
      prompts,
      hostPermissions
    )),
    "experimental.text.complete": createTextCompleteHandler(),
    "command.execute.before": exclusive(createCommandExecuteHandler(
      ctx.client,
      state,
      logger,
      config,
      ctx.directory,
      hostPermissions
    )),
    event: exclusive(createEventHandler(state, logger)),
    tool: {
      ...config.compress.permission !== "deny" && {
        compress: compressTool
      }
    },
    config: async (opencodeConfig) => {
      if (config.compress.permission !== "deny" && compressDisabledByOpencode(opencodeConfig.permission)) {
        config.compress.permission = "deny";
      }
      if (config.commands.enabled && config.compress.permission !== "deny") {
        opencodeConfig.command ??= {};
        opencodeConfig.command["dcp-compress"] = {
          template: "",
          description: "Trigger DCP manual compression with: /dcp-compress [focus]"
        };
      }
      const toolsToAdd = [];
      if (config.compress.permission !== "deny" && !config.experimental.allowSubAgents) {
        toolsToAdd.push("compress");
      }
      if (toolsToAdd.length > 0) {
        const existingPrimaryTools = opencodeConfig.experimental?.primary_tools ?? [];
        opencodeConfig.experimental = {
          ...opencodeConfig.experimental,
          primary_tools: [...existingPrimaryTools, ...toolsToAdd]
        };
      }
      if (!hasExplicitToolPermission(opencodeConfig.permission, "compress")) {
        const permission = opencodeConfig.permission ?? {};
        opencodeConfig.permission = {
          ...permission,
          compress: config.compress.permission
        };
      }
      hostPermissions.global = opencodeConfig.permission;
      hostPermissions.agents = Object.fromEntries(
        Object.entries(opencodeConfig.agent ?? {}).map(([name, agent]) => [
          name,
          agent?.permission
        ])
      );
    }
  };
});
var index_default = { id: "opencode-dcp", setup, server };
export {
  index_default as default
};
//# sourceMappingURL=index.js.map