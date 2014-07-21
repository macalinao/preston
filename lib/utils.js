"use strict";

exports.parseFilterString = function(str) {
  var regex = /([\w\|]+)|["'](?:\\"|[^"'])+["']/g;
  var matches = str.match(regex);
  
  var ret = [];
  var current = [];
  matches.filter(function(part) {
    if (part.equals('|')) {
      ret.push(current);
      current = [];
      continue;
    }

    current.push(part);
  });
  ret.push(current);
  return ret;
};
