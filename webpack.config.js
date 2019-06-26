const webpack = require('webpack')
const path = require('path')

const resolve = {
    alias: {
        Common: path.resolve(__dirname, 'src/')
    }
}

module.exports = [
    {
        resolve,
        target: 'node',
        entry: './src/server.js',
        output: {
            filename: 'server.js'
        },
        optimization: {
            minimize: false
        }
    },
    {
        resolve,
        target: 'web',
        entry: './src/browser/index.js',
        plugins: [
            new webpack.IgnorePlugin({
                resourceRegExp: /^ws$/,
                contextRegExp: /peer-relay/
            })
        ],
        optimization: {
            minimize: false
        }
    }
]
