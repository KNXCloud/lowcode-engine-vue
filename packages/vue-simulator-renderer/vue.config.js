/* eslint-env node */
const path = require('path');
const { defineConfig } = require('@vue/cli-service');

const resolve = (...p) => path.resolve(__dirname, ...p);

module.exports = defineConfig({
  productionSourceMap: false,
  transpileDependencies: false,
  css: {
    extract: true,
  },
  configureWebpack: {
    devServer: {
      host: '127.0.0.1',
      port: 5559,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    externals: {
      vue: 'Vue',
    },
    optimization: {
      splitChunks: false,
    },
  },
  chainWebpack: (config) => {
    config.entryPoints
      .delete('app')
      .end()
      .entry('vue-simulator-renderer')
      .add('./src/index.ts');

    config.output
      .chunkFilename('[name].js')
      .filename('[name].js')
      .library('LCVueSimulatorRenderer')
      .libraryTarget('umd');

    config.plugin('extract-css').tap(([options]) => {
      return [
        Object.assign(options, {
          filename: '[name].css',
          chunkFilename: '[name].css',
        }),
      ];
    });

    config.resolve.alias.merge({
      '@knxcloud/lowcode-hooks': resolve('../hooks/src'),
      '@knxcloud/lowcode-utils': resolve('../utils/src'),
      '@knxcloud/lowcode-vue-renderer': resolve('../vue-renderer/src'),
    });

    config.devServer.allowedHosts.add('all');
  },
});
