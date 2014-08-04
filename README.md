# Restifier
Serves Mongoose models on an extensible RESTful API.
[![Stories in Ready](https://badge.waffle.io/simplyianm/restifier.png?label=ready&title=Ready)](https://waffle.io/simplyianm/restifier)
[![build status](https://secure.travis-ci.org/simplyianm/restifier.png)](http://travis-ci.org/simplyianm/restifier)

<img src="http://m2.i.pbase.com/u26/chonchat/upload/31626102.IMG_6580.jpg" width="300" alt="A RESTing Mongoose" align="right">

### Features at a Glance
* **Tight integration with Mongoose and Express.** - You don't need to rewrite your app to use this system.
  * The API is served as an Express middleware. You can put it on its own route, for example `/api/v1`, and it won't mess up your code.
  * It uses Mongoose schema parameters to determine many things about the document. Little configuration is required.
* Query/Create/Get/Update/Destroy - Nothing extra needed on the developer's part
  * Middleware supported on each route, so integration with things like Passport is very simple
* Modular filters (much like Angular) to allow fine-tuned control over the data despite writing very little code
* Document transformer system to control what data gets sent to which users

## Installation
This module is installed via npm:

```bash
$ npm install restifier --save
```

## Example
The following example serves the `User` and `Page` models on a RESTful API.

```js
var express = require('express');
var restifier = require('restifier');
var models = require('./models'); // Your mongoose models would be loaded here

var app = express();

app.use(require('body-parser').json()); // Required

restifier(mongoose.model('User'), mongoose.model('Page')); // Add models
app.use('/api', restifier.middleware()); // Serve the api on /api.

app.listen(3000);
```

## REST API
Restifier uses the MongoDB collection name to determine the name of the base route, so the `User` model would create routes under `/users`.

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
First, declare all of your models using `restifier(mongooseModel)`. This function returns a `Model` object which can be altered. (see the JSDocs)

Next, serve the API as middleware:

```
app.use('/api', restifier.middleware());
```

This will create a middleware that will be used by Express.

### Namespace Collision
In the case of namespace collision, routes are handled sequentially by Express. Declare your custom routes
before using the middleware. For example:

```
app.post('/api/login', myLoginHandler);
app.use('/api', restifier.middleware());
```

is the appropriate way to add functionality to your API.

## The Query Pipeline
Restifier was designed to be very flexible so it could be used as a backend for any app. Thus, queries go through a series of steps before being transformed into what is sent to the client.

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

Transformers are applied to each individual document in a query result.

#### Population Transformers
Population transformers are transformers that operate on populated fields. They can be used to make your application more secure by removing fields you don't want people to see.

```js
model.transformPopulate('owners', function(req, doc) {
  delete doc._id;
  delete doc.password;
});
```

## AngularJS Integration
This software was built with [Angular](https://angularjs.org/) in mind. Use the module [Restangular](https://github.com/mgonto/restangular) to deal with the generated API
in a very intuitive manner.

## Example Apps
Here are some apps that use Restifier. If you have one you'd like to share, please don't be afraid to send a PR!

* [todo-restifier](https://github.com/simplyianm/todo-restifier) - A Restifier-powered Todo app made with Angular, Restangular, Bootstrap, and Restifier.

## License
Copyright (c) 2014 Ian Macalinao. Released under the MIT License, which can be viewed in the attached `LICENSE` file.
