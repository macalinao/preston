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

  // Restricted fields
  var restricted = this.restricted = [];
  model.schema.eachPath(function(pathName, path) {
    if (path.options.restricted) {
      restricted.push(pathName);
    }
  });

  this.constraints = [];
  this.filters = {};
}

/**
 * Constrains a query parameter.
 *
 * @param field - The field to constrain
 * @paran fn(req, num) - The constraint function.
 */
Model.prototype.constrain = function(field, fn) {
  this.constraints.push({
    field: field,
    fn: fn
  });
};

/**
 * Adds a filter to this model.
 *
 * @param name - The name of the filter.
 * @param filter(req, query, params...) - The filter function that will be run on queries.
 */
Model.prototype.filter = function(name, filter) {
  filters[name] = filter;
};
