# Preston
Piece-of-cake REST on Node.

Preston serves Mongoose models on an extensible RESTful API. It handles routing and provides extensibility.

[![Stories in Ready](https://badge.waffle.io/simplyianm/preston.png?label=ready&title=Ready)](https://waffle.io/simplyianm/preston)
[![build status](https://secure.travis-ci.org/simplyianm/preston.png)](http://travis-ci.org/simplyianm/preston)
[![Coverage Status](https://img.shields.io/coveralls/simplyianm/preston.svg)](https://coveralls.io/r/simplyianm/preston)

### Features at a Glance
* **Tight integration with Mongoose and Express.**
  * An Express middleware. Put it on its own route and the rest of your code is left untouched.
  * Configured within the Mongoose schema. No need to deal with messy configuration objects.
* **Query/Create/Get/Update/Destroy**
  * Everything you'd ever need from a REST API (other than auth) is already included.
  * Middleware supported on each route, so integration with things like Passport is very simple
* **[Flexible query filtering system.](#filters)**
* **[Document transformer system.](#transformers)** Control what gets sent to which clients.
* **[Built with Angular in mind.](#angularjs-integration)**

## Installation
This module is installed via npm:

```bash
$ npm install preston --save
```

## Example
The following example serves the `User` and `Badge` models on a RESTful API.

```js
var express = require('express');
var preston = require('preston');
var mongoose = require('mongoose');

var app = express();

app.use(require('body-parser').json()); // Required

var User = preston(mongoose.model('User', new mongoose.Schema({
  name: {
    type: String,
    id: true, // The id used in the route
    unique: true
  },
  password: {
    type: String,
    restricted: true // Don't display this field to anyone!
  }
})));

// A nested route
var Badge = User.submodel('badges', 'owner', mongoose.model('Badge', new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  id: {
    type: Number,
    id: true,
    unique: true
  },
  content: String
})));

app.use('/api', preston.middleware()); // Serve the api on /api.

app.listen(3000);
```

## REST API
Preston uses the MongoDB collection name to determine the name of the base route, so the `User` model would create routes under `/users`.

### Query
Querying takes in the following parameters:
* `field` - Replace `field` with any field in your Mongoose model, and it will check for equality.
* `populate` - Comma-delimited list of fields to populate
* `sort` - Sorts by the given fields in the given order, comma delimited. A `-` sign will sort descending.
* `limit` - Limits the number of returned results.
* `skip` - Skips a number of results. Useful for pagination when combined with `limit`.
* `filter` - Applies a filter. See the Filters section for more details.

```
GET /users
GET /users?field=value
GET /users?populate=posts,comments
GET /users?sort=field,-field2
GET /users?limit=10&skip=10
GET /users?filter=filter1|filter2
GET /users/Bob/badges?sort=date
```

### Create
```
POST /users
POST /users/Bob/badges
```

### Get
Get supports one parameter, the `populate` field.

```
GET /users/Bob
GET /users/Bob?populate=posts
GET /users/Bob/badges/1
GET /users/Bob/badges/1?populate=things
```

### Update
PUT and PATCH are handled the same way.

```
PUT /users/Bob
PATCH /users/Bob
PUT /users/Bob/badges/1
PATCH /users/Bob/badges/1
```

### Destroy
```
DELETE /users/Bob
DELETE /users/Bob/badges/1
```

## Creating an API
First, declare all of your models using `preston(mongooseModel)`. This function returns a `Model` object which can be altered. (see the JSDocs)

Next, serve the API as middleware:

```
app.use('/api', preston.middleware());
```

This will create a middleware that will be used by Express.

### Namespace Collision
In the case of namespace collision, routes are handled sequentially by Express. Declare your custom routes
before using the middleware. For example:

```
app.post('/api/login', myLoginHandler);
app.use('/api', preston.middleware());
```

is the appropriate way to add functionality to your API.

### Route middleware
There are 5 types of routes: query, create, get, update, and destroy. You can apply middleware to a single one of these routes by doing the following:

```js
model.use('get', function(req, res, next) {
  console.log('Get middleware on model ' + model.model.modelName + ' called!');
});
```

You can also apply middleware to all of a model's routes:

```js
model.use('all', function(req, res, next) {
  console.log('Middleware on model ' + model.model.modelName + ' called!');
});
```

The following fields are exposed in the request object:
* `doc` -- The document being retrieved, or null if not operating on a document route
* `parentDoc` -- The parent document being retrieved. Used for nested routes.
* `req.query` - The `populate` and `sort` fields are parsed beforehand, `populate` being an Array of Strings and `sort` being an object.

Error middleware can also be added to each route or for all routes:

```js
model.use('get', function(err, req, res, next) {
  console.log('Error on model');
});
```

#### Authentication middleware example with Passport
Here is an example of using [Passport](http://passportjs.org/) to restrict access to a document:

```js
model.use('get', function(req, res, next) {
  if (req.user._id !== req.doc.owner) {
    res.status(403).send('Unauthorized!');
  }
  return next();
});
```

Passport exposes a `user` property on the request, so we can deal with that directly in our middleware. If we were to use something like [connect-roles](https://github.com/ForbesLindesay/connect-roles), we would do something like this:

```js
model.use('all', user.can('operate on the model'));
```

## The Query Pipeline
Preston was designed to be very flexible so it could be used as a backend for any app. Thus, queries go through a series of steps before being transformed into what is sent to the client.

```
Modifiers --> Parameters --> Filters --> Population --> Execution --> Transformers
```

### Modifiers
Modifiers alter the query parameters that will be passed to the pipeline. For example, you could have a modifier that forces sorting by name ascending, as shown below:

```js
model.modifyParam('sort', function(req, value) {
  value.name = 1;
  return value;
});
```

To modify a parameter, just pass the name of the parameter you wish to modify and a callback that returns the modified value of the parameter.

`sort` and `populate` are the only parameters that are objects.

The `sort` parameter looks like this:

```js
{
  name: 1, // Ascending
  date: -1 // Descending
}
```

The `populate` parameter looks like this:

```js
['users', 'comments', 'posts']
```

### Parameters
There are 4 types of parameters: limit, skip, sort, and field equality. These are all described in the [Query](#query) section.

### Filters
Filters are user-defined functions that modify the query. They work very similarly to AngularJS filters. They can be chained and take parameters, allowing immense flexibility for developers to add features to APIs.

Filters are defined as follows:
```js
model.filter('children', function(req, query) {
  query.where('age').lt(18);
});
```

Here is an example of a filter that takes parameters:
```js
model.filter('proximity', function(req, query, distance) {
  query.where('location').maxDistance(distance);
});
```
This filter would be called using `proximity 5` if one wanted to check if the location was within a distance of 5.

Chaining filters is pretty simple; just use the `|` (pipe) operator to do so.

```
GET /people?filter=children | proximity 5
```

### Population
Fields that were marked for population in the query are now populated. You can change what fields are returned using [population transformers](#population-transformers).

### Execution
At this point in the pipeline, `query.exec()` is called and we query the database.

### Transformers
Transformers change the returned results. One transformer is built in, the `restricted` transformer, and cannot be changed. Here is an example of using a transformer:

```js
model.transform(function(req, doc) {
  delete doc._id;
  delete doc.password;
  doc.type = 'This is a string that isn\'t in the database!';
});
```

Transformers are applied to each individual document or document array in a query result.

#### Population Transformers
Population transformers are transformers that operate on populated fields. They can be used to make your application more secure by removing fields you don't want people to see.

```js
model.transformPopulate('owners', function(req, doc) {
  delete doc._id;
  delete doc.password;
});
```

### Model Setup Within Schema
You can also easily set up a model by declaring a `setupPreston(model)` static function within the schema like so:

```js
MySchema.statics.setupPreston = function(model) {
  // Anything can go here modifying the model
  model.transform(function(req, doc) {
    doc.modifiedWithinModel = true;
  });
}
```

This is to keep your code organized if you like to have a separate file for each model.

## AngularJS Integration
This software was built with [Angular](https://angularjs.org/) in mind. Use the module [Restangular](https://github.com/mgonto/restangular) to deal with the generated API
in a very intuitive manner.

## Example Apps
Here are some apps that use Preston. If you have one you'd like to share, please don't be afraid to send a PR!

* [todo-preston](https://github.com/simplyianm/todo-preston) - A Preston-powered Todo app made with Angular, Restangular, Bootstrap, and Preston.

## Contributing
Contributions are very welcome! Just send a pull request. Feel free to contact me using one of the options on [my website](http://ian.pw)!

### Running the Tests
Do `npm install` to install all of the dependencies, ensure that [MongoDB](http://mongodb.org) is installed, then run `npm test` to run the unit tests.

*Note: The tests like to fail on Travis because Travis's database stuff is slow.*

## License
Copyright (c) 2014 Ian Macalinao. Released under the MIT License, which can be viewed in the attached `LICENSE` file.
