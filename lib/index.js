"use strict";

var Model = require('./model');

module.exports = function () {
  return new Restifier();
};

function Restifier() {
}

Restifier.prototype.model = function(mongooseModel) {
  return new Model(this, mongooseModel);
});
