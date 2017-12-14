function createRepo() {

    var isInstall = false;
    //moduły zewnętrzne
    var modulesExt = createModulesExt();
    //moduły lokalne
    var modules = {};

    return {
        getDefine: getDefine,
        install: install
    };

    function getDefine(path, name) {

        return function(deps, def) {

            if (isInstall === false) {

                modules[path + '/' + name] = createEvalModule(path, deps, def);

            } else {

                throw Error('You cannot define module after configuration process');
            }
        };
    }

    function createEvalModule(path, deps, def) {

        var moduleObject = null;

        addToExt(deps);

        return {
            'get': get
        };

        function get(extModuleObj) {

            if (moduleObject === null) {
                moduleObject = createModuleObject(extModuleObj);
            }

            return moduleObject;
        }

        function createModuleObject(extModuleObj) {

            var depsResolve = [];

            for (var i = 0; i < deps.length; i++) {
                depsResolve.push(resolve(deps[i]));
            }

            return def.apply(null, depsResolve);

            function resolve(moduleName) {

                if (isModuleLocal(moduleName)) {

                    return getLocal(moduleName);

                } else {

                    return getExtends(moduleName);
                }
            }

            function getExtends(moduleName) {

                if (moduleName in extModuleObj) {
                    return extModuleObj[moduleName];
                } else {
                    throw Error('There is no definition for external module: ' + moduleName);
                }
            }

            function getLocal(moduleName) {

                var modulePath = path + '/' + moduleName;
                var out;

                var modulePathNormalize = normalizePath(modulePath);

                if (typeof(modulePathNormalize) === 'string' && modulePathNormalize !== '') {

                    out = getFromModules(modulePathNormalize);

                    if (out !== null) {
                        return out;
                    } else {
                        throw Error('There is no definition for module: ' + modulePathNormalize);
                    }

                } else {

                    throw Error('There is a problem with path normalization: ' + modulePath);
                }

                function getFromModules(moduleFullName) {

                    var value = modules[moduleFullName];

                    if (typeof(value) !== 'undefined') {
                        return value.get(extModuleObj);
                    } else {
                        return null;
                    }
                }
            }
        }
    }

    function normalizePath(path) {

        var chunks = path.split('/');

        var newChunks = [];

        for (var i = 0; i < chunks.length; i++) {

            var value = chunks[i];

            if (value === '.') {

                if (newChunks.length === 0) {

                    newChunks.push(value);

                } else {

                    //ignoruj znak
                }

            } else if (value === '..') {

                if (newChunks.length >= 2) {

                    newChunks.pop();

                } else {

                    return null;
                }

            } else {

                newChunks.push(value);
            }
        }

        return newChunks.join('/');
    }

    function addToExt(deps) {

        for (var i = 0; i < deps.length; i++) {
            add(deps[i]);
        }

        function add(moduleName) {

            if (isModuleLocal(moduleName)) {

            } else {

                modulesExt.addName(moduleName);
            }
        }
    }

    function isModuleLocal(moduleName) {

        if (typeof(moduleName) === 'string') {

            if (moduleName.length >= 2 && moduleName.substr(0, 2) === './') {
                return true;
            } else if (moduleName.length >= 3 && moduleName.substr(0, 3) === '../') {
                return true;
            } else {
                return false;
            }

        } else {

            throw Error('Module name should be string');
        }
    }

    function getModule(name, extModuleObj) {

        if (typeof(modules[name]) !== 'undefined') {
            return modules[name].get(extModuleObj);
        } else {
            throw Error('Module not defined: ' + name);
        }
    }

    //instalowanie zewnętrznej końcówki odnoszącej się do requirejs (która pobierze zewnętrzne moduły)
    function install(mainModule) {

        if (isInstall === false) {

            isInstall = true;

            define(modulesExt.getModulesName(), function() {

                //konwersja "arguments" na tablicę
                var copyParams = Array.prototype.slice.call(arguments, 0);

                //potrzebne do evaluowania ...
                var moduleObj = modulesExt.getExtendsModulesObject(copyParams);

                //ewaluowanie głównego modułu - z podmodułami jeśli trzeba
                return getModule(mainModule, moduleObj);
            });

        } else {

            throw Error('Unsupported state');
        }
    }

    function createModulesExt() {

        var isSet = false;

        var modulesName = [];
        var modulesExtValue = {};

        return {
            'addName': addName,
            'getExtendsModulesObject': getExtendsModulesObject,
            'getModulesName': getModulesName
        };

        function getExtendsModulesObject(modules) {

            if (modulesName.length === modules.length) {

                return getObj();

            } else {

                throw Error('Unsupported state');
            }

            function getObj() {

                var out = {};

                for (var i = 0; i < modulesName.length; i++) {
                    setOut(modulesName[i], modules[i]);
                }

                return out;

                function setOut(name, value) {
                    out[name] = value;
                }
            }
        }

        function getModulesName() {

            return modulesName;
        }

        function addName(name) {

            if (isSet === false) {

                if (isNoEmptyString(name)) {

                    if (typeof(modulesExtValue[name]) !== 'string') {

                        modulesExtValue[name] = name;
                        modulesName.push(name);
                    }

                } else {

                    throw Error('Unsupported parameter type');
                }

            } else {

                throw Error('Unsupported state');
            }
        }
    }

    function isNoEmptyString(value) {

        return (typeof(value) === 'string' && value !== '');
    }
}
