'use strict';

var express = require('express');
var _ = require('lodash');
var Model = require('./model');

/**
 * Resets the restifier API. You should typically not use this.
 */
var init = function() {
  var api = new RestAPI();

  var restifier = module.exports = function() {
    return api.setup.apply(api, Array.prototype.slice.call(arguments, 0));
  };

  /**
   * Factory function to create a new RestAPI.
   */
  restifier.api = function(cb) {
    return new RestAPI();
  };

  restifier.reset = init;

  // Bind all RestAPI functions to the restifier object
  _.forEach(RestAPI.prototype, function(method, name) {
    if (typeof method !== 'function') {
      return;
    }
    restifier[name] = _.bind(method, api);
  });
};

function RestAPI() {
  this.models = {};
}

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
 */
RestAPI.prototype.initialize = function() {
  return require('res-error')({
    log: false
  });
};

/**
 * Should be called after the app has been created.
 */
RestAPI.prototype.finish = function() {
  var router = express.Router();
  router.use(function(req, res, next) {
    return res.error(405, req.method + ' not allowed on path ' + req.path + '.');
  });
  return router;
};

/**
 * Creates a middleware out of multiple models.
 *
 * @param models The mongoose models
 */
RestAPI.prototype.modelsMiddleware = function(models) {
  var router = express.Router();
  _.forEach(models, function(mong) {
    this.model(mong).serve(router);
  }, this);
  return router;
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

/**
 * Creates middleware for all registered models. Useful for if you
 * don't want to type app.use('/api' a million times.
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
