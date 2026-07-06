export function notFound(req, res, next) {
  const error = new Error(`Not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const razorpayMessage = error.error?.description || error.error?.reason || error.error?.field;

  res.status(statusCode).json({
    message: razorpayMessage || error.message || 'Server error',
    code: error.error?.code,
    field: error.error?.field,
    issues: error.issues
  });
}
