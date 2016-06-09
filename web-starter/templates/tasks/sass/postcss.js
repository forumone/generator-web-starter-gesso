{
  options : {
    processors: [
      require('postcss-assets')(),
      require('autoprefixer')({
        browsers: '> 1%, last 3 versions',
        remove: false // don't remove outdated prefixes (there shouldn't be any, and this saves compile time)
      }),
    ]
  },
  theme: {
    src: 'build/css/*.css'
  }
}