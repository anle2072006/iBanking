const Module = require("module");

/**
 * Nạp một module với các dependency bị thay bằng stub (không cần Mongo/axios...).
 * stubs: { "<đường dẫn tuyệt đối hoặc tên package>": exportsGiả }
 */
module.exports = function loadWithStubs(target, stubs) {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (stubs[request]) return stubs[request];
    try {
      const resolved = Module._resolveFilename(request, parent);
      if (stubs[resolved]) return stubs[resolved];
    } catch (_) {
      /* package không cài sẵn: để Module._load gốc báo lỗi nếu cần */
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    const resolvedTarget = require.resolve(target);
    delete require.cache[resolvedTarget];
    return require(resolvedTarget);
  } finally {
    Module._load = originalLoad;
  }
};
