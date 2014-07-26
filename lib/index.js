"use strict";

var chain = require('chain-middleware');
var Model = require('./model');

var models = []; // Stores our models

var restifier = module.exports = function(mongooseModel) {
  if (arguments.length > 1) {
    var middlewares = [];
    middlewares.push(restifier.initialize());
    var args = Array.prototype.slice.call(arguments, 0);
    middlewares.concat(restifier.modelsMiddleware(args));
  }
  if (!mongooseModel) {
    return restifier.initialize();
  }
  return restifier.model(mongooseModel);
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param models The models
 */
restifier.modelsMiddleware = function(models) {
  models = models.map(function(mong) {
    return restifier.model(mong).middleware();
  });
  return chain(models);
};

restifier.model = function(mongooseModel) {
  var m = new Model(this, mongooseModel);
  models.push(m);
  return m;
};

/**
 * Initialization middleware.
 */
restifier.initialize = function() {
  return require('res-error')({
    log: false
  });
};
