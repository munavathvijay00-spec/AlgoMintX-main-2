const path = require("path");

module.exports = {
  mode: "production", // Change to 'development' for debugging and 'production' for deployment
  entry: "./src/algomintx.js", // Entry point
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "algomintx.js",
    library: "AlgoMintX",
    libraryTarget: "window",
    libraryExport: "default",
    globalObject: "this",
    chunkFormat: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              compilerOptions: {
                module: "esnext",
              },
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
    alias: {
      "@algorandfoundation/algokit-utils": path.resolve(
        __dirname,
        "node_modules/@algorandfoundation/algokit-utils"
      ),
    },
  },
};
