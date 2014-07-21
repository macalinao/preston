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
  this.constraints = [];
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
