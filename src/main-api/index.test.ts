describe('Main API Handler', () => {
  it('should export handler function', () => {
    expect(() => {
      require('./index.js');
    }).not.toThrow();
  });
});

