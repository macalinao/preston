"use strict";

module.exports = Model;

/**
 * Constructor.
 *
 * @param model - The mongoose model that is being restified.
 */
function Model(restifier, model) {
  this.restifier = restifier;
  this.model = model;
  this.modifiers = [];
  this.middleware = []; // For example, auth
}

/**
 * Adds a query modifier to the model. Useful if you want to
 * limit the number of returned results, for example.
 *
 * @param {function(query, next)} - The callback
 */
Model.prototype.modifyQuery = function modifyQuery(cb) {
  this.modifiers.push(cb);
};

Model.prototype.serve = function serve(app) {
  var prefix = this.restifier.prefix;

  var uriItems = prefix + '/' + this.model.modelName;
  var uriItem = uriItems + '/' + 
  
  app.get
};
