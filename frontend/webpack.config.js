const path = require("path");
module.exports = {
    module: {
    rules: [
        {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        },{
            test: /\.(gif|png|jpe?g|svg)$/i,
            use: [
                'file-loader',
                {
                    loader: 'image-webpack-loader',
                    options: {
                        disable: true, // webpack@2.x and newer
                    },
                },
            ],
        },{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        },
    ]
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    mode: "development",
    devtool: "inline-source-map",
    entry: "./src/index.ts",
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "../build/public"),
    },
    devServer: {
        inline: false,
        hot: true,
        contentBase: path.resolve(__dirname, "../build/public"),
        watchOptions: {
            poll: true
        },
        port: 9998
    }
};
