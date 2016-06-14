'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  jsdom = Promise.promisifyAll(require('jsdom')),
  wgxpath = require('wgxpath'),
  glob = Promise.promisify(require('glob')),
  http = require('http'),
  fs = require('fs'),
  pkg = require('../package.json'),
  ygp = require('yeoman-generator-bluebird');

var DRUPAL_GESSO_URL = "https://updates.drupal.org/release-history/gesso/all";
var SASS_CHOICES = ['Libsass','Ruby Sass'];

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
      this.options.addDevDependency(pkg.name, '^' + pkg.version);
    },
    version : function() {
      var done = this.async();

      if (!this.options.parent) {
        // for test purposes
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
      var that = this;

      if (this.options.parent.answers.platform === 'drupal') {
        jsdom.envAsync(DRUPAL_GESSO_URL, [], { parsingMode : 'xml' })
        .then(function(window) {
          wgxpath.install(window);
          var expression = window.document.createExpression('//release/download_link');
          var result = expression.evaluate(window.document, wgxpath.XPathResultType.STRING_TYPE);
          that.config.gessoDl = result.stringValue;
        })
        .finally(function() {
          done();
        });
      }
      else {
        done();
      }
    }
  },
  prompting : function() {
    var done = this.async();
    var that = this;
    var config = _.extend({
      install_pattern_lab : true,
      install_sass : true
    }, this.config.getAll());
    this.promptAsync([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false
    },
    {
      type: 'confirm',
      name: 'install_sass',
      message: 'Does this project use Sass?',
      default: config.install_sass,
      when: function(answers) {
        if (that.options.getPlugin('grunt')) {
          return true;
        }
        that.log('INFO: you have to enable Grunt to be able to configure Sass here. Sass configuration skiped.');
        return false;
      }
    },
    {
      type : 'list',
      name : 'sass',
      choices : SASS_CHOICES,
      message : 'Sass compilation',
      default : config.sass,
      when: function(answers) {
        if (that.options.getPlugin('grunt') && answers.install_sass) {
          return true;
        }
        return false;
      }
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab',
      message: 'Does this project use Pattern Lab?',
      default: config.install_pattern_lab,
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab_confirm',
      message: 'Install a fresh copy of Pattern Lab?',
      default: false,
      when: function(answers) {
        // if the user doesn't want to install pattern lab, this question is not
        // asked
        return answers.install_pattern_lab;
      }
    }]).then(function (answers) {
      that.config.set(answers);
      _.extend(that.config, answers);
    })
    .finally(function() {
      done();
    });
  },
  configuring : {
    gruntPatternlab : function() {
      var done = this.async();

      if (typeof this.options.getPlugin === "function" && this.options.getPlugin('grunt') && this.config.install_pattern_lab) {
        // Add copy task for Pattern Lab
        var copy = this.options.getPlugin('grunt').getGruntTask('copy');
        copy.insertConfig('copy.patternlabStyleguide', this.fs.read(this.templatePath('tasks/patternlab/copy.js')));
        copy.loadNpmTasks('grunt-contrib-copy');
        this.options.addDevDependency('grunt-contrib-copy', '^0.8.0');

        // Watch task for Pattern Lab
        var watch = this.options.getPlugin('grunt').getGruntTask('watch');
        watch.insertConfig('watch.patternlab', this.fs.read(this.templatePath('tasks/patternlab/watch.js')));
        watch.loadNpmTasks('grunt-contrib-watch');
        watch.loadNpmTasks('grunt-simple-watch');
        this.options.addDevDependency('grunt-contrib-watch', '^0.6.1');
        this.options.addDevDependency('grunt-simple-watch', '^0.1.2');

        // Shell task for Pattern Lab
        var shell = this.options.getPlugin('grunt').getGruntTask('shell');
        shell.insertConfig('shell.patternlab', this.fs.read(this.templatePath('tasks/patternlab/shell.js')));
        shell.loadNpmTasks('grunt-shell');
        this.options.addDevDependency('grunt-shell', '^1.1.2');

        this.options.getPlugin('grunt').registerTask('buildPatternlab', [{
          task : 'copy:patternlabStyleguide',
          priority : 1
        },
        {
          task : 'shell:patternlab',
          priority : 2
        }]);

        //build => build.js buildPatternlab==task name 100 priority
        this.options.getPlugin('grunt').registerTask('build', 'buildPatternlab', 100);

        done();
      }
      done();
    },
    gruntLibSass : function() {
      var done = this.async();
      if (this.config.sass === SASS_CHOICES[0]) { //lib sass
        if(this.options.getPlugin('grunt')) {
          var editor = this.options.getPlugin('grunt').getGruntTask('postcss');
          editor.insertConfig('postcss', this.fs.read(this.templatePath('tasks/sass/postcss.js')));
          editor.loadNpmTasks('grunt-postcss');
          editor.prependJavaScript('var assets  = require(\'postcss-assets\');');
          this.options.addDevDependency('grunt-postcss', '^0.8.0');
          this.options.addDevDependency('postcss-assets', '^4.1.0');
          this.options.addDevDependency('autoprefixer', '^6.3.6');
          
          var editor = this.options.getPlugin('grunt').getGruntTask('sass');
          editor.insertConfig('sass', this.fs.read(this.templatePath('tasks/sass/sass.js')));
          editor.loadNpmTasks('grunt-sass');
          this.options.addDevDependency('grunt-sass', '^1.2.0');

          var editor = this.options.getPlugin('grunt').getGruntTask('sass_globbing');
          editor.insertConfig('sass_globbing', this.fs.read(this.templatePath('tasks/sass/sass_globbing.js')));
          editor.loadNpmTasks('grunt-sass-globbing');
          this.options.addDevDependency('grunt-sass-globbing', '^1.4.0');

          var editor = this.options.getPlugin('grunt').getGruntTask('watch');
          editor.insertConfig('sass', this.fs.read(this.templatePath('tasks/sass/watch.js')));

          // Adding buildStyles for Libsass
          this.options.getPlugin('grunt').registerTask('buildStyles', [{
            task : 'sass_globbing:gesso',
            priority : 1
          },
          {
            task : 'sass:gesso',
            priority : 2
          },
          {
            task : 'postcss:gesso',
            priority : 3
          }]);
          
          this.bowerInstall('singularity', { saveDev : true });

          this.options.getPlugin('grunt').registerTask('build', 'buildStyles', 50);
        }
        else {
          this.log('INFO unable to write libsass grunt task because Grunt plugin not selected for this project');
        }
      }
      done();
    },
    gruntRubySass : function() {
      var done = this.async();
      if (this.config.sass === SASS_CHOICES[1]) { // ruby sass
        if (this.options.getPlugin('grunt')) {
          var editor = this.options.getPlugin('grunt').getGruntTask('compass');
          editor.insertConfig('compass', this.fs.read(this.templatePath('tasks/sass/compass.js')));
          editor.loadNpmTasks('grunt-contrib-compass');
          this.options.addDevDependency('grunt-contrib-compass', '^1.1.1');

          // Adding buildStyles for Ruby Sass
          this.options.getPlugin('grunt').registerTask('buildStyles', [{
            task : 'compass:dev',
            priority : 1
          }]);

          this.options.getPlugin('grunt').registerTask('build', 'buildStyles', 50);
        }
        else {
          this.log('INFO unable to write ruby sass grunt task because Grunt plugin not selected for this project');
        }
      }
      done();
    },
    themePath : function() {
      
    }
  },
  writing : {
    theme : function() {
      var done = this.async();
      var that = this;
      var promise = null;
      
      if (this.config.install_gesso) {
        switch (this.options.parent.answers.platform) {
          case 'wordpress':
            promise = this.remoteAsync('forumone', 'gesso-theme-wordpress', 'master');
            break;
          
          case 'drupal':
            promise = (this.config.sass === SASS_CHOICES[1]) ? this.remoteAsync(this.config.gessoDl) 
                : this.remoteAsync('forumone', 'gesso-theme-libsass-drupal7', 'master');
            break;
        }
        if (promise) {
          promise.bind({})
          .then(function(remote) {
            this.remotePath = remote.cachePath;
            return glob('**', { cwd : remote.cachePath });
          })
          .then(function(files) {
            var remotePath = this.remotePath;
            
            _.each(files, function(file) {
              that.fs.copy(
                remotePath + '/' + file,
                that.destinationPath(that.options.parent.answers.theme_path + '/' + file)
              );
            });
          })
          .finally(function() {
            done();
          });
        }
        // TODO: Fix this deep nesting of conditionals
        else {
          done();
        }
      }
      else {
        done();
      }
    },
    patternLab : function() {
      var done = this.async();
      var that = this;
      
      if (this.config.install_pattern_lab) {
        this.fs.copyTpl(
          this.templatePath('gitignore'),
          this.destinationPath('.gitignore'),
          { }
        );
      }
      if (this.config.install_pattern_lab_confirm) {
        this.remoteAsync('dcmouyard', 'patternlab-php-gesso', 'master')
        .bind({})
        .then(function(remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd : remote.cachePath });
        })
        .then(function(files) {
          var remotePath = this.remotePath;
          
          _.each(files, function(file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath(that.options.parent.answers.theme_path + '/pattern-lab/' + file)
            );
          });
        })
        .finally(function() {
          done();
        });
      }
      else {
        done();
      }
    }
  }
});
