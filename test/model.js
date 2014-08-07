'use strict';

var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var restifier = require('../lib/');
var setup = require('./setup');

describe('Model', function() {
  var app, conn, User, Comment;

  beforeEach(function(done) {
    var ret = setup(done);
    app = ret.app;
    conn = ret.conn;
    User = ret.User;
    Comment = ret.Comment;
  });

  afterEach(function(done) {
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });

  it('should detect restricted fields in a schema', function() {
    expect(User.restricted).to.eql(['password']);
  });
});
