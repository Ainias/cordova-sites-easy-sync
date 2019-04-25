const rollup = require("rollup");
const path = require("path");
const fs = require('fs');
const jsonRollup = require("rollup-plugin-json");
const commonjs = require('rollup-plugin-commonjs');
const importFilePath = require("rollup-plugin-import-file-path");
const htmlImportFilePath = require("rollup-plugin-html-import-file-path");

const tmpFile = "./tmp/script.js";

const fileOptions = [{
    input: [
        path.resolve(process.cwd(), "src/client/"),
        // path.resolve(process.cwd(), "src/shared/"),
    ],
    output: {
        format: 'es',
        file: path.resolve(process.cwd(), 'client.js'),
        nameFile: path.resolve(process.cwd(), 'client.names.json'),
    },
},
//     {
//     input: [
//         path.resolve(process.cwd(), "src/server/"),
//         // path.resolve(process.cwd(), "src/shared/"),
//     ],
//     output: {
//         format: 'es',
//         file: path.resolve(process.cwd(), 'server.mjs'),
//         nameFile: path.resolve(process.cwd(), 'server.names.json'),
//     }
// },
    {
    input: [
        path.resolve(process.cwd(), "src/shared/"),
    ],
    output: {
        format: 'es',
        file: path.resolve(process.cwd(), 'model.mjs'),
        nameFile: path.resolve(process.cwd(), 'model.names.json'),
    }
}];

const options = {
    input: path.resolve(process.cwd(), tmpFile),
    plugins:
        [
            commonjs({
                // non-CommonJS modules will be ignored, but you can also
                // specifically include/exclude files
                include: 'node_modules/**',  // Default: undefined
            }),
            htmlImportFilePath({
                include: "**/*.html",
                importAttributes: {
                    "[data-view]": "data-view",
                    "img[src]": "src"
                },
                relative: true,
                asImport: true,
            }),
            importFilePath({
                include: "**/*.jpg"
            }),
            importFilePath({
                include: "**/*.png"
            }),
            jsonRollup({compact: true})
        ]
};

function findNames(dir, excluded) {
    let names = {};
    if (excluded.includes(dir)) {
        return names;
    }

    let files = fs.readdirSync(dir);
    files.forEach(file => {
        let stats = fs.statSync(dir + file);
        if (stats.isDirectory()) {
            let nameObject = findNames(dir + file + '/', excluded);
            names = Object.assign(names, nameObject);
        } else if ((file.endsWith(".js") ) && !excluded.includes(dir + file)) {
            names[file.substring(0, file.length - 3)] = dir + file.substring(0, file.length - 3);
        }
        else if ((file.endsWith(".mjs") ) && !excluded.includes(dir + file)) {
            names[file.substring(0, file.length - 4)] = dir + file.substring(0, file.length - 4);
        }
    });
    return names;
}

async function buildEntryPoints(fileOption, target) {
    const cutLengthFront = 0;

    target = target || tmpFile;

    const resultDir = path.resolve(process.cwd(), path.dirname(target));

    let names = {};
    fileOption.input.forEach(dir => {
        Object.assign(names, findNames(dir + "/", []));
    });

    let imports = '';
    for (let k in names) {
        imports += "export * from './" + path.relative(resultDir, path.resolve(process.cwd(), names[k].substring(cutLengthFront))) + "';\n";
    }

    if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir);
    }
    fs.writeFileSync(target, imports);
}

// async function build() {
//     let buildPromise = Promise.resolve();
//     fileOptions.forEach(async (fileOption, i) => {
//         buildPromise = buildPromise.then(async () => {
//             await buildEntryPoints(fileOption);
//             console.log("doing ", i, "...");
//             let currentOptions = Object.assign({}, options, fileOption.options);
//             const bundle = await rollup.rollup(currentOptions);
//
//             // or write the bundle to disk
//             await bundle.write(fileOption.output);
//             fs.unlinkSync(tmpFile);
//         });
//     });
// }

// build();
buildEntryPoints({
    input: [
        path.resolve(process.cwd(), "src/server/"),
    ],
}, "./server.mjs");
buildEntryPoints({
    input: [
        path.resolve(process.cwd(), "src/client/"),
    ],
}, "./client.mjs");
buildEntryPoints({
    input: [
        path.resolve(process.cwd(), "src/shared/"),
    ],
}, "./model.mjs");