'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  libxmljs = require("libxmljs"),
  request = require("request"),
  glob = Promise.promisify(require('glob'));

var gessoLastVerion = "7.x-1.4";

module.exports = generators.Base.extend({
  initializing : {
    version : function() {
      request({url : "https://updates.drupal.org/release-history/gesso/all"}, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          gessoLastVerion = libxmljs.parseXml(body).get('//release/version').text();
        }
        else {
          console.log('WARNING: you may not use the last version of gesso!');
        }
      });
    }
  },
  writing : {
    settings : function() {
      console.log("gesso last version: " + gessoLastVerion);
    }
  }
});