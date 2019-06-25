var webpack = require('webpack')

module.exports = [
    {
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
        target: 'web',
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
