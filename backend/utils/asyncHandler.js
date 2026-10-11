// Lets us write async routes without try/catch in every one.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);