const notFound = (res) => res.status(404).json({ message: "Không tìm thấy endpoint" });
const forbidden = (res) => res.status(403).json({ message: "Bạn không có quyền truy cập tài nguyên này" });

exports.authGuard = (req, res, next) => {
    if (req.method === "POST" && req.path === "/login") return next();
    return notFound(res);
};

exports.usersGuard = (req, res, next) => {
    const match = req.path.match(/^\/([^/]+)\/?$/);
    if (req.method !== "GET" || !match) return notFound(res);
    if (match[1] !== String(req.userId)) return forbidden(res);

    next();
};

exports.feesGuard = (req, res, next) => {
    if (req.method === "GET" && /^\/[^/]+\/?$/.test(req.path)) return next();
    return notFound(res);
};

exports.transactionsGuard = (req, res, next) => {
    if (req.method === "POST" && req.path === "/") return next();
    if (req.method === "POST" && /^\/[^/]+\/verify-otp\/?$/.test(req.path)) return next();

    const history = req.path.match(/^\/user\/([^/]+)\/?$/);

    if (req.method === "GET" && history) {
        return history[1] === String(req.userId) ? next() : forbidden(res);
    }

    return notFound(res);
};
