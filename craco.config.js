const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        process: 'process/browser',
      };
      webpackConfig.resolve.fallback = {
        "buffer": require.resolve("buffer/"),
        "https": require.resolve("https-browserify"),
        "querystring": require.resolve("querystring-es3"),
        "url": require.resolve("url/"),
        "fs": require.resolve("./src/fs-mock.js"),
        "os": require.resolve("os-browserify/browser"),
        "stream": require.resolve("stream-browserify"),
        "child_process": false,
        "path": require.resolve("path-browserify"),
        "util": require.resolve("util/"),
        "crypto": require.resolve("crypto-browserify"),
        "http2": require.resolve("./src/http2-mock.js"),
        "zlib": require.resolve("browserify-zlib"),
        "process": require.resolve("process/browser"),
        "net": false,
        "tls": false,
        "assert": require.resolve("assert/"),
        "http": require.resolve("stream-http"),
        "vm": require.resolve("vm-browserify")
      };
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: require.resolve('process/browser'),
          Buffer: ['buffer', 'Buffer'],
        })
      );
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];
      return webpackConfig;
    }
  },
  devServer: {
    allowedHosts: 'auto',
  },
};
