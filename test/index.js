"use strict";

var bodyParser = require('body-parser');
var express = require('express');
var expect = require('chai').expect;
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');
var restifier = require('..');

describe('restifier', function() {
  var app, server, User, Post;

  before(function(done) {
    // Some setup
    mongoose.connect('mongodb://localhost:27017/test');
    User = mongoose.model('User', new mongoose.Schema({
      name: {
        id: true,
        type: String
      },
      description: String
    }));

    Post = mongoose.model('Post', new mongoose.Schema({
      name: {
        id: true,
        type: String
      },
      contents: String
    }));

    var bob = new User({
      name: 'Bob',
      description: 'test'
    });

    bob.save(done);
  });

  beforeEach(function() {
    app = express();
    app.use(bodyParser.json());
  });

  describe('quick initialize', function() {
    it('should add the appropriate error handlers', function() {
      app.use(restifier());
      app.use(restifier(User, Post));
      server = http.createServer(app);
      server.listen(9999);

      request(app).get('/users/Bobb').end(function(err, res) {
        expect(err).to.be.null;
        expect(res.body.message).to.match(/not found/);
      });
    });
  });

  afterEach(function() {
    server.close();
  });
});
