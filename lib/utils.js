"use strict";

exports.parseFilterString = function(str) {
  var regex = /([\w\|]+)|["'](?:\\"|[^"'])+["']/g;
  var matches = str.match(regex);

  var ret = [];
  var current = [];
  matches.filter(function(part) {
    if (part === '|') {
      ret.push(current);
      current = [];
    } else {
      current.push(part);
    }
  });
  ret.push(current);
  return ret;
};
