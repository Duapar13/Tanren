module.exports = {
  apps: [
    {
      name: 'tanren-api',
      cwd: __dirname,
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
