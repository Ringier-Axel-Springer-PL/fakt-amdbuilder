
/* global exports, __dirname */


//main();

exports.processFile = processFile;


function processFile(file_in, callback) {

    console.log('AMD BUILDER', file_in);

    showLog("");
    showLog("process file : " + file_in);


    createMap(file_in, function(mainModule, map) {

        var lista = getListModules(map);

        getOutTemplate(function(configOutTemplate){
            var outStr = makeStringOut(configOutTemplate, mainModule, map, lista);
            callback(outStr);

        });
    });
}


function showLog(message) {
    console.info("AMDBuilder: " + message);
}


function getGreenColor(message) {
    return "\x1B[32m" + message + "\x1B[39m";
}


function getRedColor(message) {
    return "\x1B[31m" + message + "\x1B[39m"
}


function createMap(file_in, callback) {

    var isExec      = false;

    var pathModule  = require("path");
    var rootPath    = pathModule.dirname(file_in);
    var rootNameArr = ["."].concat(pathModule.basename(file_in, ".js").split("/"));



    var rootModule      = createModule(rootPath, rootNameArr);
    var mainModuleName  = rootNameArr.join("/");                     //"./" +
    //mapa - ĹcieĹźka do moduĹu odwzorowana na obiekt reprezentujÄcy ten moduĹ
    var map = {};
    map[mainModuleName] = rootModule;


    rootModule.getDeps(loadDeps);


    function loadDeps(deps){

        for (var i=0; i < deps.length; i++) {
            processModuleList(deps[i]);
        }

        //inicjuj wczytywanie zaleĹźnych moduĹĂłw, ktĂłre nie zostaĹy zainicjowane

        refreshState();

        function processModuleList(depsName){

            if (isDepsInternal(depsName) === false) {
                return;
            }

            if (typeof(map[depsName]) !== "undefined") {
                return;
            }

            var mod = createModule(rootPath, depsName.split("/"));
            map[depsName] = mod;
            mod.getDeps(loadDeps);
        }
    }


    function refreshState() {

        for (var prop in map) {
            if (map[prop].isExec() === false) {
                return;
            }
        }

        if (isExec === false) {
            isExec = true;
            callback(mainModuleName, map);
        }
    }
}



/*
    root - gĹĂłwny katalog wzglÄdem ktĂłrego okreĹlane sÄ zaleĹźnoĹci
    path - tablica ze stringami - okreĹlajÄca poĹoĹźenie moduĹu
    callback - funkcja zwrotna uruchamiana w momencie gdy moduĹ zostaĹ zainicjowany
*/

function createModule(root, path) {

    var depsSave    = null;
    var contentSave = null;
    var query       = queryCallback();

    readContent(root, path, function(content){
        //zawiera tablicÄ z zaleĹźnoĹciami
        //zaleĹźnoĹc ["ccc/sdas/dsada", "./asdasda"]
        var deps = readDeps(path, content);

        //testuje poprawnoĹÄ zdefiniowanych zaleĹźnoĹci
        testDeps(deps);

        depsSave    = deps;
        contentSave = content;

        //wyĹlij informacjÄ o zaleĹźnoĹciach do oczekujÄcych callbackĂłw
        query.exec({
            deps    : deps,
            content : content
        });

    });

    return {
        getDeps             : getDeps,
        getContent          : getContent,
        isExec              : query.isExec,
        getDepInnerSync     : getDepInnerSync,
        getDepExtSync       : getDepExtSync,
        getPathBasenameSync : getPathBasenameSync,
        getPathDirSync      : getPathDirSync,
        getContentSync      : getContentSync
    };

    function getDeps(callback) {

        query.add(function(detail){

            callback(makeCopyArray(detail.deps));
        });
    }

    function getContent(callback) {

        query.add(function(detail){

            callback(detail.content);
        });
    }

    function getDepInnerSync() {

        if (Array.isArray(depsSave) === false) {
            throw Error("expected Array");
        }

        var out = {};

        for (var i=0; i<depsSave.length; i++) {

            if (isDepsInternal(depsSave[i])) {
                out[depsSave[i]] = true;
            }
        }

        return out;
    }


    function getDepExtSync() {

        if (Array.isArray(depsSave) === false) {
            throw Error("expected Array");
        }

        var out = {};

        for (var i=0; i<depsSave.length; i++) {

            if (isDepsInternal(depsSave[i]) === false) {
                out[depsSave[i]] = true;
            }
        }

        return out;
    }


    function getPathBasenameSync(){

        var out = makeCopyArray(path);

        if (out.length < 2) {
            throw Error("expected two arguments");
        }

        return out.pop();
    }

    function getPathDirSync() {

        var out = makeCopyArray(path);

        if (out.length < 2) {
            throw Error("expected two arguments");
        }

        out.pop();

        return out.join("/");
    }

    function getContentSync() {

        if (contentSave === null) {
            throw Error("expected data");
        } else {
            return contentSave;
        }
    }

}


function makeCopyArray(list) {

    var out = [];

    for (var i=0; i < list.length; i++) {
        out.push(list[i]);
    }

    return out;
}


function testDeps(deps) {

    //TODO - testuje zaleĹźnoĹci
    //czy siÄ nie dublujÄ
    //czy nie sÄ jakoĹ dziwnie okreĹlone ...

    //pierwszy wzorzec
    //nazwa[/nazwa]{1,}

    //drugi wzorzec
    // ./
    // ../

    //console.info("deps ...", deps);

    //throw Error("TODO");
}


function isDepsInternal(depName) {

    return (getDepsInternal(depName) !== null);
}


//sprawdza czy zaleĹźnoĹc jest lokalna
function getDepsInternal(depName) {

    if (depName.length >= 2 && depName.substr(0, 2) === "./") {
        return depName.split("/");
    }

    if (depName.length >= 3 && depName.substr(0, 3) === "../") {
        return depName.split("/");
    }

    return null;
}


function readContent(root, pathArr, callback) {

    require("fs").readFile(root + "/" + pathArr.join("/") + ".js", function (err, data) {

        if (err) {
            console.info(err);
            throw err;
        }

        callback(data.toString());
    });
}


/*
    Czyta tablicÄ z zaleĹźnoĹciami z "treĹci" moduĹu
    root - string ze ĹcieĹźkÄ do katalogu root poza ktĂłrego nie moĹźemy wyjĹÄ przy czytaniu z dysku
    pathArr - ĹcieĹźka do tego moduĹu okreĹlona w formie niepustej tablicy

    wynikowe lokalne moduĹy mogÄ siÄ zaczynaÄ tylko od "./"
*/
function readDeps(pathArr, content) {
    return resolveDeps(pathArr, getDeps(content));
}


function getDeps(content) {

    var reg = RegExp("^define\\(\\[([^\\]]*)\\]");

    var match = reg.exec(content);

    if (match && typeof(match[1]) === "string") {

        return getDepsList(match[1]);

    } else {

        throw Error("The problem with regular expression matching");
    }

    function getDepsList(str) {

        var list = str.split(",");
        var out  = [];

        for (var i=0; i<list.length; i++) {
            processItem(list[i]);
        }

        return out;

        function processItem(listItem) {

            var trimValue = trim(listItem);

            if (trimValue !== "") {
                out.push(getDepName(trimValue));
            }
        }
    }

    function trim(strItem) {
        return strItem.trim();
    }

    function getDepName(value) {

        if (value.length > 2) {

            if (testChar(value, "'") || testChar(value, '"')) {
                return value.substr(1, value.length - 2);
            } else {
                throw Error("Invalid module name (1): " + value);
            }

        } else {
            throw Error("Invalid module name (2):" + value);
        }
    }

    function testChar(value, charStr) {
        return (value[0] === charStr && value[value.length - 1] === charStr);
    }
}


function resolveDeps(pathArr, depsList) {

    var out = [];

    for (var i=0; i<depsList.length; i++) {
        out.push(resolveDepsOne(pathArr, depsList[i]));
    }

    return out;
}


function resolveDepsOne(pathArr, depName) {

    var depInternel = getDepsInternal(depName);

    //zaleÅ¼noÅ›Ä‡ zewnÄ™trzna, zostawiamy
    if (depInternel === null) {
        return depName;
    }


    if (pathArr.length < 1) {
        throw Error("Expected to be non-empty Array");
    }


    var out = [];

    mapList(pathArr, pushItem);
    mapList([".."], pushItem);
    mapList(depInternel, pushItem);

    return "./" + out.join("/");


    //zrÃ³b map na liÅ›cie
    function mapList(list, fnCallback) {
        for (var i=0; i<list.length; i++) {
            fnCallback(list[i]);
        }
    }


    function pushItem(item) {

        if (item === ".") {

            //brak modyfikacji

        } else if (item === "..") {

            if (out.length > 0) {
                out.pop();
            } else {
                throw Error("outside the main directory");
            }

        } else {
            out.push(item);
        }
    }
}


function queryCallback() {

    var isExec   = false;
    var waitList = [];
    var argsEmit = null;


    return {

        'exec'   : exec,
        'add'    : add,
        'isExec' : isExecFn
    };

    function isExecFn() {
        return isExec;
    }

    function exec(args) {

        if (isExec === false) {

            isExec   = true;
            argsEmit = args;
            refreshState();
        }
    }

    function refreshState() {

        if (isExec === true) {

            while (waitList.length > 0) {
                waitList.shift()(argsEmit);
            }
        }
    }

    function add(call) {

        waitList.push(call);
        refreshState();
    }
}


function getListModules(map) {


    var out    = [];
    var mapDep = getMapDep();

    var first;

    while (Object.keys(mapDep).length > 0) {

        first = getFirst();

        removeDependence(mapDep, first);

        out.push(first);
    }

    return out;

    function getMapDep() {

        var list = [];

        for (var prop in map) {
            list.push(prop);
        }

        list.sort();

        var mapDep = {};
        var name;

        for (var i=0; i<list.length; i++) {

            name = list[i];
            mapDep[name] = map[name].getDepInnerSync();
        }

        return mapDep;
    }


    function removeDependence(mapDep, depName) {

        for (var prop in mapDep) {
            if (typeof(mapDep[prop][depName]) !== "undefined") {
                delete mapDep[prop][depName];
            }
        }
    }


    function getFirst() {

        for (var prop in mapDep) {

            if (Object.keys(mapDep[prop]).length === 0) {

                delete mapDep[prop];

                return prop;
            }
        }

        showLog(getRedColor("Depending looped"));

        Object.keys(mapDep).forEach(function(resPath){

            showLog(getRedColor(resPath + ":"));

            Object.keys(mapDep[resPath]).forEach(function(depName){

                showLog(getRedColor("    " + depName));
            });
        });

        throw Error("Depending looped");
    }
}


function getOutTemplate(callback){

    var templatePath = __dirname + "/templateOut.js";

    require("fs").readFile(templatePath, function (err, data) {

        if (err) {
            console.info(err);
            throw err;
        }

        callback(data.toString());
    });
}


function makeStringOut(configOutTemplate, mainModule, map, lista) {


    var sep = "//.............................................................................";


    var out = [];


    out.push("(function(){");
    out.push("var repo = createRepo();");
    out.push(sep);


    for (var i=0; i<lista.length; i++) {
        out.push(getTemplateModule(lista[i]));
        out.push(sep);
    }


    out.push('repo.install("' + mainModule + '");');
    out.push(sep);


    out.push(configOutTemplate);
    out.push(sep);


    out.push("}());");


    return out.join("\n\n");


    function getTemplateModule(moduleName) {

        var moduleItem   = map[moduleName];

        var pathDir      = moduleItem.getPathDirSync();
        var pathBaseName = moduleItem.getPathBasenameSync();
        var content      = moduleItem.getContentSync();

        var out = [];

        out.push("\t\t\t\t" + '//module: ' + pathDir + '/' + pathBaseName);
        out.push("(function(define){");
        out.push(content);
        out.push('}(repo.getDefine("' + pathDir + '", "' + pathBaseName + '")));');



        showLog(getGreenColor("merge: " + pathDir + '/' + pathBaseName + ".js"));

        var depsExt = moduleItem.getDepExtSync();

        for (var prop in depsExt) {
            showLog(getRedColor("    block: " + prop));
        }

        return out.join("\n");
    }
}

/*
function saveFile(file_out, outStr, callback) {

    require("fs").writeFile(file_out, outStr, function (err) {

        if (err) {
            global.console.info(err);
            throw err;
        }

        callback();
    });
}
*/
