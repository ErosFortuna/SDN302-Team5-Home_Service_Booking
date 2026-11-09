const MAX_NODES = 10000;
const MAX_DEPTH = 40;

function containsUnsafeMongoKey(value) {
  const stack = [{ value, depth: 0 }];
  let visited = 0;

  while (stack.length) {
    const current = stack.pop();
    if (++visited > MAX_NODES || current.depth > MAX_DEPTH) return true;
    if (!current.value || typeof current.value !== 'object') continue;

    for (const key of Object.keys(current.value)) {
      if (key.startsWith('$') || key.includes('.') || key.includes('$')) return true;
      stack.push({ value: current.value[key], depth: current.depth + 1 });
    }
  }
  return false;
}

function rejectUnsafeMongoKeys(req, res, next) {
  if ([req.body, req.query, req.params].some(containsUnsafeMongoKey)) {
    return res.status(400).json({
      success: false,
      message: 'Request contains an unsupported field name',
    });
  }
  return next();
}

module.exports = { containsUnsafeMongoKey, rejectUnsafeMongoKeys };
