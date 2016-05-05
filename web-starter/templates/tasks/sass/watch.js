{
      options: {
        livereload: true,
      },
      files : [ 'src/sass/**/*.scss', '!src/sass/partials/sass-globbing/**/*.scss' ],
      tasks : [
        // 'modernizr',
        'compileStyles',
        'sync:build',
      ],
    }