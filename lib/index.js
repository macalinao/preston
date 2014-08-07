'use strict';

var express = require('express');
var _ = require('lodash');
var Model = require('./model');

var init = function() {
  var api = new RestAPI();

  /**
   * The main function. Wraps {@link RestAPI#setup}.
   *
   * @global
   * @see RestAPI#setup
   */
  var restifier = module.exports = function() {
    return api.setup.apply(api, Array.prototype.slice.call(arguments, 0));
  };

  /**
   * Factory function to create a new {@link RestAPI}.
   *
   * @name restifier.api
   * @global
   * @see RestAPI
   *
   * @returns RestAPI A new RestAPI.
   */
  restifier.api = function() {
    return new RestAPI();
  };

  /**
   * Resets the restifier API. You should not use this.
   *
   * @api private
   */
  restifier.reset = init;

  // Bind all RestAPI functions to the restifier object
  _.forEach(RestAPI.prototype, function(method, name) {
    if (typeof method !== 'function') {
      return;
    }
    restifier[name] = _.bind(method, api);
  });
};

/**
 * Represents a RESTful API powered by Restifier.
 *
 * @class
 */
function RestAPI() {
  this.models = {};
}

/**
 * Gateway function that can add model(s) or return initialization
 * middleware depending on the arguments passed to it.
 *
 * @returns {Model|Function} A model or middleware depending on the arguments.
 * * `setup()` - Returns `initialize()`
 * * `setup(mong)` - Returns `model(mong)`
 * * `setup(mong1, mong2)` - Returns `modelsMiddleware(mong1, mong2)`
 */
RestAPI.prototype.setup = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  if (args.length > 1) {
    return this.modelsMiddleware(args);
  }

  if (args.length === 0 || !args[0].schema) {
    return this.initialize();
  }
  return this.model(args[0]);
};

/**
 * Initialization middleware.
 *
 * @returns {Function} Express middleware
 */
RestAPI.prototype.initialize = function() {
  return require('res-error')({
    log: false
  });
};

/**
 * Should be called after the app has been created.
 *
 * @returns {Function} Express middleware
 */
RestAPI.prototype.finish = function() {
  return function(req, res, next) {
    return res.error(404, 'Path not found.');
  };
};

/**
 * Adds a model to this RestAPI.
 *
 * @param {mongoose.Model} mong The mongoose model
 */
RestAPI.prototype.model = function(mong) {
  var m = new Model(this, mong);
  this.models[mong.modelName] = m;
  return m;
};

/**
 * Adds multiple models to this RestAPI.
 *
 * @param {mongoose.Model[]} mongs The mongoose models
 */
RestAPI.prototype.addModels = function(mongs) {
  return _.map(mongs, function(mong) {
    return this.model(mong);
  }, this);
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param {mongoose.Model[]} mongs The mongoose models
 */
RestAPI.prototype.modelsMiddleware = function(mongs) {
  var router = express.Router();
  _.forEach(this.addModels(mongs), function(model) {
    model.serve(router);
  });
  return router;
};

/**
 * Creates middleware that encompasses all registered models.
 * This is equivalent to calling `model.middleware()` for each
 * individual model, plus calling `restifier.initialize()` and
 * `restifier.finish()`.
 *
 * @returns {Router} Returns an Express router containing all middlewares.
 */
RestAPI.prototype.middleware = function() {
  var router = express.Router();
  router.use(this.initialize());
  _.forEach(this.models, function(model) {
    router.use(model.middleware());
    _.forEach(model.submodels, function(submodel) {
      router.use(submodel.middleware());
    });
  });
  router.use(this.finish());
  return router;
};

init();
