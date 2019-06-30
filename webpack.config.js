const webpack = require('webpack')
const path = require('path')

const resolve = {
    alias: {
        Common: path.resolve(__dirname, 'src/')
    }
}

const myModule = {
    rules: [
        {
            test: /\.txt$/i,
            use: 'raw-loader',
        }
    ]
}

module.exports = [
    {
        resolve,
        module: myModule,
        target: 'node',
        entry: './src/server.js',
        output: {
            filename: 'server.js'
        },
        optimization: {
            minimize: false
        },
        externals: { 'sqlite3':'commonjs sqlite3', }
    },
    {
        resolve,
        module: myModule,
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
