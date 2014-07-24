# restifier

Serves Mongoose models on an extensible RESTful API.

[![Stories in Ready](https://badge.waffle.io/simplyianm/restifier.png?label=ready&title=Ready)](https://waffle.io/simplyianm/restifier)
[![build status](https://secure.travis-ci.org/simplyianm/restifier.png)](http://travis-ci.org/simplyianm/restifier)

## Installation

This module is installed via npm:

```bash
$ npm install restifier
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

## API Usage

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

### Filters

Anything more complicated than the use cases above should use a filter. A filter is a function which modifies the query.
Filters are applied to the query before the parameters listed above are.
