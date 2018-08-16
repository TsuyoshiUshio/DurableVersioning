var path = require('path'), fs=require('fs');
var util = require('util')

var readline = require('readline');

function findTargetFiles(startPath, filter, result = []) {
    if (!fs.existsSync(startPath)) {
        console.log("File not found: ", startPath);
        return;
    }

    var files = fs.readdirSync(startPath);
    for (var i=0; i < files.length; i++) {
        var filename=path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {

            if(!(filename.startsWith("..\\bin") || (filename.startsWith("..\\obj")) || (filename.startsWith("..\\migration")) || (filename.startsWith("..\\command"))) ) {
                console.log("dir:" + filename);
                result = findTargetFiles(filename,filter, result);
            }
        } else if (filename.endsWith(filter)) {
            var contents = fs.readFileSync(filename, 'utf8');
            if (contents.includes("[OrchestrationTrigger]") ||
                contents.includes("[ActivityTrigger]") ||
                contents.includes("[OrchestrationClient]")) {
                    result.push(filename);
                }
        }
    }
    return result;
}

function findTargetFunctionNames(targetFileNames) {
    var startRegx = /\[FunctionName\(\"/g;
    var endRegx = /\"\)/;

    var functionNames = new Set(); 
    for (let targetFileName of targetFileNames) {
        var contents = fs.readFileSync(targetFileName, 'utf8');
        var lines = contents.split('\n');
        for (var j = 0; j < lines.length; j++ ) {
            if (lines[j].includes("[FunctionName(")){
                var functionName = lines[j].slice(lines[j].search(startRegx) + 15,lines[j].search(endRegx));
                functionNames.add(functionName);
            } 
        }    
    }
    return functionNames;
}

function convertSemanticVersionString(semanticVersion) {
    var version = semanticVersion.split('.');
    return util.format('_%s_%s_%s', version[0], version[1], version[2]);
}

function replaceVersionNumber(fileName, functionNames, semanticVersion) {
    var versionString = convertSemanticVersionString(semanticVersion);
    var contents = fs.readFileSync(fileName, 'utf8');
    for (var functionName of functionNames) {
        var index = functionName.search(/_\d_\d_\d/g);
        var functionBaseName = functionName.substring(0, index);
        contents = contents.replace(new RegExp(functionName, 'g'), functionBaseName + versionString);
    }
    return contents;
}


function deleteFolderRecursive (path) {
    if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.statSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };

function generateNewFolderIfNotExists(semanticVersion) {
    var dir = '../migration/' + semanticVersion;
    if (fs.existsSync(dir)) {
        deleteFolderRecursive(dir);
    } 
    if (!fs.existsSync('../migration')) {
        fs.mkdirSync('../migration');
    }
    fs.mkdirSync(dir);
    return dir;
}

function replaceNameSpaceWithVersion(contents, semanticVersion) {
    var newContents = "";
    for (var line of contents.split('\r\n')) {
        if (line.includes("namespace")) {
            newContents = newContents.concat(line + convertSemanticVersionString(semanticVersion) + '\r\n');
        } else {
            newContents = newContents.concat(line + '\r\n');
        }
    }
    return newContents;
}


function copyFiles(fileNames, semanticVersion) {
    var dir = generateNewFolderIfNotExists(semanticVersion);
    for (var fileName of fileNames) {
        // readfile 
        var contents = fs.readFileSync(fileName, 'utf8');
        // replace the namespace with version 
        var newContents = replaceNameSpaceWithVersion(contents, semanticVersion);
        // write on the taget directory
        var trimedFileName = fileName.slice(3); // remove ../
        // TODO may consider the subdirectory with file.
        fs.writeFileSync(dir + '/' + trimedFileName, newContents);
    }
}

function updateVersionNumber(fileName, functionNames, semanticVersion) {
    var contents = replaceVersionNumber(fileName, functionNames, semanticVersion);
    var footer = ".bak"
    // create a bak file
    fs.writeFileSync(fileName + footer, contents);
    // delete the original file 
    fs.unlink(fileName, (err) => {
        if(err) {
            console.log("failed to delete file: " + fileName + "\n" + err);
        } else {
            console.log('succesfully removed file: ' + fileName);
            // mv back to original
            fs.renameSync(fileName + footer, fileName);
        }
    });

}

function detectCurrentVersion(functionNames) {
    for (var functionName of functionNames) {
        var index = functionName.search(/_\d_\d_\d/g);
        var semanticVersionUnderscore = functionName.slice(index + 1, functionName.length);
        return semanticVersionUnderscore.replace(new RegExp("_", 'g'), ".");
    }
}

console.log("--------------target fileNames");
var fileNames = findTargetFiles('..', '.cs');
fileNames.forEach((fileName) => {
    console.log(fileName);
});

console.log("--------------target functionNames");

var functionNames = findTargetFunctionNames(fileNames);
functionNames.forEach((functionName) => {
    console.log(functionName);
})

console.log("------------- exec");
var semanticVersion = process.argv[2];
if (semanticVersion == null || !semanticVersion.match(/\d\.\d\.\d/)) {
    console.log("SemanticVersion is invalid: " + semanticVersion);
    return;
}
var currentSemanticVersion = detectCurrentVersion(functionNames);
// create a directory with the current version
copyFiles(fileNames, currentSemanticVersion);

// update the current version 
for(var fileName of fileNames) {
    updateVersionNumber(fileName, functionNames, semanticVersion)
}

console.log("Successfurlly migrated from " + currentSemanticVersion + " into " + semanticVersion)
