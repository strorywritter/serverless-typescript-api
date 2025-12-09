import { config, validateConfig } from './env.js';

describe('Config', () => {
  it('should have default values', () => {
    expect(config.environment).toBeDefined();
    expect(config.awsRegion).toBeDefined();
  });

  it('should throw error when required config is missing', () => {
    const originalEnv = process.env;
    process.env = {};

    expect(() => validateConfig()).toThrow();

    process.env = originalEnv;
  });
});

