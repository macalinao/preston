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
  this.transformers = [];

  this.transform(function(req, doc) {
    restricted.filter(function(path) {
      delete doc[path];
    });
  });
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
 * Adds a transformer to this model.
 *
 * @param transformer(req, doc) - The transformer
 */
Model.prototype.transform = function(transformer) {
  this.transformers.push(transformer);
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
          throw res.error(401, 'Cannot access restricted field "' + name + '".');
        }

        query.where(name).equals(val);
      });
    } catch (err) {
      return;
    }

    query.exec(function(err, docs) {
      var display = [];
      docs.filter(function(doc) {
        var jsoned = doc.toObject();
        thiz.transformers.filter(function(tf) {
          tf(req, jsoned);
        });
        display.push(jsoned);
      });
      res.json(display);
    });
  });

  return this;
};
