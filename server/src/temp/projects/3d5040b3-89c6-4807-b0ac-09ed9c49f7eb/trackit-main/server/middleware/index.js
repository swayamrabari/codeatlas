// export all middleware from this directory
module.exports = {
  protect: require('./protect'),
  errorHandler: require('./errorHandler'),
  setupProcessErrorHandlers: require('./processErrorHandlers'),
  asyncHandler: require('./asyncHandler'),
};
