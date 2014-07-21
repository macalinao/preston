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
}
