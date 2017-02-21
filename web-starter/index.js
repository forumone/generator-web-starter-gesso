'use strict';
var generators = require('yeoman-generator'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  glob = Promise.promisify(require('glob')),
  fs = require('fs'),
  pkg = require('../package.json'),
  ygp = require('yeoman-generator-bluebird');

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
      this.options.addDevDependency(pkg.name, '~' + pkg.version);
    },
    version : function() {
      if (!this.options.parent) {
        // for test purposes
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
      var that = this;
    }
  },
  prompting : function() {
    var that = this;

    var config = this.config.getAll();

    return this.prompt([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false
    }])
    .then(function (answers) {
      that.config.set(answers);

      answers.config = {};
      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-gesso' : answers });
    });
  },
  configuring : {
    gruntPatternlab : function() {
      if (typeof this.options.getPlugin === "function" && this.options.getPlugin('grunt')) {
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
      }
    },
    gruntLibSass : function() {
      if (this.options.getPlugin('grunt')) {
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
          task : 'postcss:theme',
          priority : 3
        }]);

        this.bowerInstall('singularity', { saveDev : true });

        this.options.getPlugin('grunt').registerTask('build', 'buildStyles', 50);
      }
      else {
        this.log('INFO unable to write libsass grunt task because Grunt plugin not selected for this project');
      }
    },
    themePath : function() {

    }
  },
  writing : {
    theme : function() {
      var that = this;
      var promise = null;

      if (this.config.get('install_gesso')) {
        switch (this.options.parent.answers.platform) {
          case 'wordpress':
            promise = this.remoteAsync('forumone', 'gesso-wp', 'master');
            break;

          case 'drupal':
            promise = this.remoteAsync('forumone', 'gesso', '7.x-2.x');
            break;

          case 'drupal8':
            promise = this.remoteAsync('forumone', 'gesso', '8.x-1.x');
            break;
        }

        if (promise) {
          var remotePath;

          return promise
          .then(function(remote) {
            remotePath = remote.cachePath;
            return glob('**', { cwd : remote.cachePath });
          })
          .then(function(files) {
            _.each(files, function(file) {
              that.fs.copy(
                remotePath + '/' + file,
                that.destinationPath(that.options.parent.answers.theme_path + '/' + file)
              );
            });
          });
        }
      }
    },
    patternLab : function() {
      var done = this.async();
      var that = this;

      if (this.config.get('install_pattern_lab')) {
        this.fs.copyTpl(
          this.templatePath('gitignore'),
          this.destinationPath(this.options.parent.answers.theme_path + '/pattern-lab/.gitignore'),
          { }
        );
      }

      done();
    }
  }
});
