'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  libxmljs = require("libxmljs"),
  request = require("request"),
  glob = Promise.promisify(require('glob')),
  http = require('http'),
  fs = require('fs'),
  Download = require('download');

var DRUPAL_GESSO_URL = "https://updates.drupal.org/release-history/gesso/all";

module.exports = generators.Base.extend({
  initializing : {
    version : function() {
      if(!this.options.parent) {
        //for test purposes 
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
      var that = this;
      if(this.options.parent.answers.platform === 'drupal') {
        request({url : DRUPAL_GESSO_URL}, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            that.config.gessoDl = libxmljs.parseXml(body).get('//release/download_link').text();
          }
          else {
            console.log('ERROR unable to retrieve gesso version number from Drupal: ' + DRUPAL_GESSO_URL);
          }
        });
      }
    }
  },
  prompting : function() {
    var done = this.async();
    var that = this;
    var config = _.extend({
      install_pattern_lab : true,
    }, this.config.getAll());
    that.prompt([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab',
      message: 'Install pattern lab?',
      default: config.install_pattern_lab,
      when: function(answers) {
        // only available for drupal
        if(that.options.parent.answers.platform === 'drupal') {
          return true;
        }
        else {
          return false;
        }
      }
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab_confirm',
      message: 'Install a fresh copy of pattern lab?',
      default: false,
      when: function(answers) {
        // if the user doesn't want to install pattern lab, this question is not asked
        return answers.install_pattern_lab;
      }
    }], function (answers) {
      that.config.set(answers);
      _.extend(that.config, answers);
      done();
    });
  },
  configuring : {
    grunt : function() {
      if(this.config.install_pattern_lab) {
        if(typeof this.options.getPlugin === "function" && this.options.getPlugin('grunt')) {
          this.options.getPlugin('grunt').addGruntTasks('copy', 'grunt-contrib-copy', 'patternlab', {
            expand : true,
            cwd : '<%= pkg.themePath %>/pattern-lab/core/styleguide/',
            src : '**',
            dest : '<%= pkg.themePath %>/pattern-lab/public/styleguide/'
          });
          this.options.getPlugin('grunt').addGruntTasks('watch', 'grunt-contrib-watch', 'patternlab', {
            files : [ '<%= pkg.themePath %>/pattern-lab/source/**/*' ],
            tasks : [ 'shell:patternlab' ],
            options : {
              livereload : true
            }
          });
          this.options.getPlugin('grunt').addGruntTasks('shell', 'grunt-shell', 'patternlab', {
            command : 'php core/builder.php -g',
            options : {
              execOptions : {
                cwd : '<%= pkg.themePath %>/pattern-lab'
              }
            }
          });
          this.options.addDevDependency('grunt-contrib-copy', '^0.8.0');
          this.options.addDevDependency('grunt-shell', '^1.2.1');
        }
        else {
          console.log('INFO: grunt generartion not available');
        }
      }
    }
  },
  writing : {
    settings : function() {
      var that = this;
      if(this.options.parent.answers.platform === 'drupal') {
        if(this.config.install_gesso) {
          // new Download({extract: true}).get(this.config.gessoDl, 'sites/all/themes/').dest('.').run();
          // Create a Promise for remote downloading
          var remote = new Promise(function(resolve, reject) {
            that.remote(that.config.gessoDl, function(err, remote) {
              if (err) {
                reject(err);
              }
              else {
                resolve(remote);
              }
            });
          });
          
          // Begin Promise chain
          remote.bind(this).then(function(remote) {
            this.remote = remote;
            return glob('**', { cwd : remote.cachePath });
          }).then(function(files) {
            var remote = this.remote;
            
            _.each(files, function(file) {
              that.fs.copy(
                remote.cachePath + '/' + file,
                that.destinationPath('public/sites/all/themes/gesso/' + file)
              );
            });
          });
        }
        if(this.config.install_pattern_lab_confirm) {
          // Create a Promise for remote downloading
          var remote = new Promise(function(resolve, reject) {
            that.remote('dcmouyard', 'patternlab-php-gesso', 'master', function(err, remote) {
              if (err) {
                reject(err);
              }
              else {
                resolve(remote);
              }
            }, true);
          });
          
          // Begin Promise chain
          remote.bind(this).then(function(remote) {
            this.remote = remote;
            return glob('**', { cwd : remote.cachePath });
          }).then(function(files) {
            var remote = this.remote;
            
            _.each(files, function(file) {
              that.fs.copy(
                remote.cachePath + '/' + file,
                that.destinationPath('public/sites/all/themes/pattern-lab/' + file)
              );
            });
          });
        }
      }
      else if (this.options.parent.answers.platform === 'wordpress') {
        if(this.config.install_gesso) {
          // Create a Promise for remote downloading
          var remote = new Promise(function(resolve, reject) {
            that.remote('forumone', 'gesso-theme-wordpress', 'master', function(err, remote) {
              if (err) {
                reject(err);
              }
              else {
                resolve(remote);
              }
            }, true);
          });
          
          // Begin Promise chain
          remote.bind(this).then(function(remote) {
            this.remote = remote;
            return glob('**', { cwd : remote.cachePath });
          }).then(function(files) {
            var remote = this.remote;
            
            _.each(files, function(file) {
              that.fs.copy(
                remote.cachePath + '/' + file,
                that.destinationPath('public/wp-content/themes/' + file)
              );
            });
          });
        }
      }
    }
  }
});