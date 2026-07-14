// Class bắt lỗi chung để ném ra thông báo chuẩn xác
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Phân biệt lỗi do mình ném ra (true) hay do vỡ code (false)

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware bắt lỗi để gắn vào cuối các API
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // In ra log để dev nhìn thấy
  console.error(`[ERROR 💥]`, err);

  // Trả về cho Frontend dạng JSON chuẩn
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  AppError,
  globalErrorHandler
};
