export function requestLogger(req, res, next) {
  console.log(`\n📨 ${new Date().toISOString()}`);
  console.log(`   ${req.method} ${req.url}`);
  console.log(`   Content-Type: ${req.headers['content-type']}`);
  next();
}
