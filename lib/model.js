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
  return this;
};

/**
 * Adds a filter to this model.
 *
 * @param name - The name of the filter.
 * @param filter(req, query, params...) - The filter function that will be run on queries.
 */
Model.prototype.filter = function(name, filter) {
  this.filters[name] = filter;
  return this;
};

/**
 * Serves this model on a RESTful API.
 *
 * @param app - The Express app to serve the model on.
 */
Model.prototype.serve = function(app) {
  var thiz = this;
  var model = this.model;

  var uriBase = '/' + model.collection.name;

  app.get(this.restifier.prefix + uriBase, function(req, res) {
    var query = model.find();
    var reqQuery = req.query;

    // Fields
    try {
      model.schema.eachPath(function(name) {
        if (!reqQuery.hasOwnProperty(name)) {
          return;
        }
        var val = reqQuery[name];

        if (thiz.restricted.indexOf(name) !== -1) {
          var err = new Error('Field is restricted.');
          err.status = 401;
          throw err;
        }

        query.where(name).equals(val);
      });
    } catch (err) {
      return res.error(err.status, err.message);
    }

    query.exec(function(err, docs) {
      res.json(docs);
    });
  });

  return this;
};
