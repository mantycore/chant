const webpack = require('webpack')
const path = require('path')

const resolve = {
    alias: {
        Common: path.resolve(__dirname, 'src/common/'),
        Mantra: path.resolve(__dirname, 'src/common/mantra/'),
        Psalm: path.resolve(__dirname, 'src/common/psalm/'),
        Surah: path.resolve(__dirname, 'src/common/surah/'),
        Browser: path.resolve(__dirname, 'src/browser/'),
        Tools: path.resolve(__dirname, 'tools/') //TODO: think about better solution
    }
}

const myModule = {
    rules: [
        {
            test: /\.css$/i,
            use: 'style-loader'
        },
        {
            test: /\.css$/i,
            loader: 'css-loader',
            options: {
                modules: {
                    localIdentName: '[name]__[local]--[hash:base64:5]' //[path]
                }
            }
        },
        {
            test: /\.txt$/i,
            use: 'raw-loader',
        },
        {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
               loader: "babel-loader"
            }
        }
    ]
}

module.exports = [
    {
        resolve,
        module: myModule,
        target: 'node',
        entry: './src/server/index.js',
        plugins: [
            new webpack.IgnorePlugin(/^pg-native$/)
        ],
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
