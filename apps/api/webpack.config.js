const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Include workspace packages in the bundle so they get resolved properly
        allowlist: ['@helpmytravel/shared'],
      }),
    ],
  };
};
