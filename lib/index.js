"use strict";

var Model = require('./model');

module.exports = function () {
  return new Restifier();
};

function Restifier() {
}

/**
 * Serves a Mongoose model on an Express app.
 *
 * @param app - The Express app
 * @param model - The Mongoose model
 * @return {RestifiedModel} - A handle that allows modification of the model
 */
Restifier.prototype.serve = function serve(app, model) {

};
