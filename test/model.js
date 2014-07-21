"use strict";

var expect = require('chai').expect;
var mongoose = require('mongoose');

var restifier = require('../lib/');

describe('Model', function() {
  it('should detect restricted fields in a schema', function() {
    var User = mongoose.model('User', new mongoose.Schema({
      name: String,
      password: {
        type: String,
        restricted: true
      }
    }));

    var UserModel = restifier.model(User);
    
    expect(UserModel.restricted).to.eql(['password']);
  });
});
