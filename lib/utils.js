'use strict';

exports.parseFilterString = function(str) {
  var regex = /([\w\|]+)|["'](?:\\"|[^"'])+["']/g;
  var quoted = /(["'])(.*?)\1/g;
  var matches = str.match(regex);

  var ret = [];
  var current = [];
  matches.filter(function(part) {
    if (part === '|') {
      ret.push(current);
      current = [];
    } else {
      if (!part.match(quoted)) {
        current.push(part);
        return;
      }

      var quoteMatch;
      while ((quoteMatch = quoted.exec(part)) !== null) {
        current.push(quoteMatch[2]);
      }
    }
  });
  ret.push(current);
  return ret;
};
