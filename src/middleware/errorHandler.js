// eslint-disable-next-line no-unused-vars
export const notFound = (req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    message: err.message || 'Server error',
  });
};
