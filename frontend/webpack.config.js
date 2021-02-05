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
        }
    ]
    },
    mode: "development",
    devtool: "inline-source-map",
    entry: "./src/index.js",
    output: {
        filename: "app.js",
        path: path.resolve(__dirname, "../dist/public"),
    },
    devServer: {
        inline: false,
        hot: true,
        contentBase: path.resolve(__dirname, "../dist/public"),
        watchOptions: {
            poll: true
        },
        port: 9998
    }
};
