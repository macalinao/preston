# restifier

Serves Mongoose models on an extensible RESTful API.

[![Stories in Ready](https://badge.waffle.io/simplyianm/restifier.png?label=ready&title=Ready)](https://waffle.io/simplyianm/restifier)
[![build status](https://secure.travis-ci.org/simplyianm/restifier.png)](http://travis-ci.org/simplyianm/restifier)

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

app.use(restifier()); // Sets up restifier
app.use(restifier(mongoose.model('User')).middleware());
app.use(restifier(mongoose.model('Page')).middleware());

app.listen(3000);
```

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
There are 4 types of parameters: limit, skip, sort, and field equality. These are all described in the [Query](#Query) section.

## Configuring Restifier

### Filters

A filter is a function which modifies the Mongoose query.
Filters are applied to the query before the parameters listed above are.

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

