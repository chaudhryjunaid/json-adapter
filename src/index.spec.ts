import JsonAdapter from './index';

describe('index', () => {
  it('should export JsonAdapter', () => {
    expect(JsonAdapter).toBeDefined();
  });
  it('should map first-level keys', function () {
    const schema = {
      foo: 'bar',
      baz: 'qux',
    };
    const adapter = new JsonAdapter(schema, {}, {}, {});
    const result = adapter.mapTransform({ foo: 1, baz: 2 });
    expect(result).toEqual({
      bar: 1,
      qux: 2,
    });
  });
});
