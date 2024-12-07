import * as _ from 'lodash';
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
    const adapter = new JsonAdapter(schema);
    const result = adapter.mapTransform({ bar: 1, qux: 2 });
    expect(result).toEqual({
      foo: 1,
      baz: 2,
    });
  });
  it('should map nested keys', function () {
    const schema = {
      'foo.bar.baz': 'bar.baz.foo',
      'baz.qux.bar': 'foo.bar.qux',
    };
    const adapter = new JsonAdapter(schema);
    const result = adapter.mapTransform({
      bar: {
        baz: {
          foo: 1,
        },
      },
      foo: {
        bar: {
          qux: 2,
        },
      },
    });
    expect(result).toEqual({
      foo: {
        bar: {
          baz: 1,
        },
      },
      baz: {
        qux: {
          bar: 2,
        },
      },
    });
  });
  it('should transform $value', function () {
    const schema = {
      foo: { $value: 'toss' },
      'bar.bell': { $value: 'bat' },
      baz: {
        qux: { $value: 'bun' },
      },
    };
    const adapter = new JsonAdapter(schema);
    const result = adapter.mapTransform({ bar: 1, qux: 2 });
    expect(result).toEqual({
      foo: 'toss',
      bar: {
        bell: 'bat',
      },
      baz: {
        qux: 'bun',
      },
    });
  });
  it('should transform $transform', function () {
    const schema = {
      foo: { $transform: 'isString' },
      'bar.bell': { $transform: 'toUppercase' },
      baz: {
        qux: { $transform: 'toLowercase' },
      },
    };
    const adapter = new JsonAdapter(schema, {
      isString: _.isString,
      toUppercase: _.toUpper,
      toLowercase: _.toLower,
    });
    const result = adapter.mapTransform({
      foo: 'abc',
      bar: { bell: 'dEf' },
      baz: { qux: 'GhI' },
    });
    expect(result).toEqual({
      foo: true,
      bar: {
        bell: 'DEF',
      },
      baz: {
        qux: 'ghi',
      },
    });
  });
  it('should transform $concat', function () {
    const schema = {
      foo: {
        $concat: [
          'foo',
          'bar.bell',
          'baz.qux',
          { $transform: 'toUppercase' },
          { $transform: 'toLowercase' },
        ],
      },
      'bar.bell': {
        $concat: [
          'foo',
          'bar.bell',
          'baz.qux',
          { $transform: 'toUppercase' },
          { $transform: 'toLowercase' },
        ],
      },
      baz: {
        qux: {
          $concat: [
            'foo',
            'bar.bell',
            'baz.qux',
            { $transform: 'toUppercase' },
            { $transform: 'toLowercase' },
          ],
        },
      },
    };
    const adapter = new JsonAdapter(schema, {
      isString: _.isString,
      toUppercase: _.toUpper,
      toLowercase: _.toLower,
    });
    const result = adapter.mapTransform({
      foo: 'abc',
      bar: {
        bell: 'dEf',
      },
      baz: {
        qux: 'GhI',
      },
    });
    expect(result).toEqual({
      foo: ['abc', 'dEf', 'GhI', 'ABC', 'abc'],
      bar: { bell: ['abc', 'dEf', 'GhI', 'DEF', 'def'] },
      baz: { qux: ['abc', 'dEf', 'GhI', 'GHI', 'ghi'] },
    });
  });
  it('should transform $alt', function () {
    const schema = {
      foo: {
        $alt: [
          { $value: null },
          { $transform: 'returnUndefined' },
          'foo',
          'bar.bell',
          'baz.qux',
        ],
      },
      'bar.bell': {
        $alt: [
          { $value: null },
          { $transform: 'returnUndefined' },
          'foo',
          'bar.bell',
          'baz.qux',
        ],
      },
      baz: {
        qux: {
          $alt: [
            { $value: null },
            { $transform: 'returnUndefined' },
            'foo',
            'bar.bell',
            'baz.qux',
          ],
        },
      },
    };
    const adapter = new JsonAdapter(schema, {
      returnUndefined: () => undefined,
    });
    const result = adapter.mapTransform({
      foo: undefined,
      bar: {
        bell: undefined,
      },
      baz: {
        qux: 'yay!',
      },
    });
    expect(result).toEqual({
      foo: 'yay!',
      bar: {
        bell: 'yay!',
      },
      baz: {
        qux: 'yay!',
      },
    });
  });
});
