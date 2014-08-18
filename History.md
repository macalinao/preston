0.2.1
=====
* Fix bug where an incorrect ObjectId wouldn't 404
* First release where we're renamed to Preston

0.2.0
=====
* Add `RestAPI#asFunction` to allow creating multiple APIs in an intuitive way
* Update tests to use RestAPI#asFunction to prevent conflicts with other tests

0.1.10
=====
* Added async calling of transformers and modifiers
* Improved documentation even more
* Changed 405 to only be returned on existing models, else 404
* Modified code to use lodash
* Coveralls

0.1.9
=====
* Greatly improved documentation
* Fixed a bug where sending an invalid field to `populate` would crash the server

0.1.8
=====
* Add restifier.middleware() method
* Make restifier possess all methods of RestAPI

0.1.7
=====
* Add 405 JSON handler for missing methods.

0.1.6
=====
* Fixed tests
* Made a pact with myself to always test first

0.1.5
=====
* Fix small bug where id field was wrong

0.1.4
=====
* Add id property to returned models
* Fix thrown errors when populating in the doc fetcher

0.1.3
=====
* Update res-error

0.1.2
=====
* Add population transformers
* Improve docs

0.1.1
=====
* Make things testable by allowing creation of RestAPI instances

0.1.0
=====

Initial release
