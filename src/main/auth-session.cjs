function createAuthSession() {
  let current = 0;
  return {
    begin() { current += 1; return current; },
    invalidate() { current += 1; },
    isActive(token) { return token === current; }
  };
}

module.exports = { createAuthSession };
