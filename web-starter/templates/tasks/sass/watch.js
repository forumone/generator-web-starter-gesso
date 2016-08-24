{
      options: {
        livereload: true,
      },
      files : [ '<%= pkg.themePath %>/sass/**/*.scss', '!<%= pkg.themePath %>/sass/partials/sass-globbing/**/*.scss' ],
      tasks : [
        'buildStyles'
      ],
    }