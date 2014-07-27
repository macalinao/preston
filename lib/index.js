"use strict";

var chain = require('chain-middleware');
var Model = require('./model');

var api = new RestAPI(); // Stores our models

var restifier = module.exports = function() {
  return api.setup.apply(api, Array.prototype.slice.call(arguments, 0));
};

function RestAPI() {
  this.initialized = false;
  this.models = {};
}

RestAPI.prototype.setup = function() {
  if (arguments.length > 1) {
    var middlewares = [];
    middlewares.push(restifier.initialize());
    var args = Array.prototype.slice.call(arguments, 0);
    middlewares.concat(this.modelsMiddleware(args));
  }
  var mongooseModel = arguments[0];
  if (!mongooseModel) {
    return this.initialize();
  }
  return this.model(mongooseModel);
};

/**
 * Initialization middleware.
 */
RestAPI.prototype.initialize = function() {
  this.initialized = true;
  return require('res-error')({
    log: false
  });
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param models The mongoose models
 */
RestAPI.prototype.modelsMiddleware = function(models) {
  var api = this;
  models = models.map(function(mong) {
    return api.model(mong).middleware();
  });
  return chain(models);
};

/**
 * Adds a model to RestAPI.prototype.
 *
 * @param mongooseModel The mongoose model
 */
RestAPI.prototype.model = function(mongooseModel) {
  var m = new Model(this, mongooseModel);
  this.models[mongooseModel.modelName] = m;
  return m;
};
