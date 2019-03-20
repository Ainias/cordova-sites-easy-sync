const path = require("path");
const exec = require('child_process').exec;
const fs = require('fs');

const packageName = require("../package.json").name;

let pathsToProjects = [
    "/home/silas/Projekte/Web/project-echo",
    "/home/silas/Projekte/Web/cordova-sites-easy-sync"
];

async function execPromise(command) {
    return new Promise((resolve, reject) => {
        console.log("executing " + command + "...");
        exec(command, (err, stdout, stderr) => {
            console.log(stdout);
            console.log(stderr);
            if (err) {
                reject([err, stdout, stderr]);
            } else {
                resolve([stdout, stderr]);
            }
        });
    });
}

execPromise("npm pack").then(async (std) => {
    let thisPath = process.cwd();
    let name = std[0].trim();
    let pathToTar = path.resolve(thisPath, name);

    if (!fs.statSync("tmp").isDirectory()) {
        fs.mkdirSync("tmp");
    }
    process.chdir("tmp");
    await execPromise("tar -xvzf " + pathToTar + " -C ./");
    process.chdir("package");
    fs.unlinkSync("package.json");

    let promise = Promise.resolve();
    pathsToProjects.forEach((project) => {
        promise = promise.then(async () => {
            let resultDir = path.resolve(project, "node_modules", packageName);
            return execPromise("cp -r ./* "+resultDir);
        });
    });
    await promise;

    process.chdir(thisPath);
    fs.unlinkSync(name);
    // fs.unlinkSync("tmp");

    console.log("done!");
}).catch(e => {
    console.error(e);
});