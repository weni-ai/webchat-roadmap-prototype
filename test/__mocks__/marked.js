module.exports = {
  marked: {
    lexer: () => [],
    use: () => {},  // No-op for configuration
    parse: (text) => text,  // Return text as-is for tests
  },
};
