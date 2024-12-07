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
  it('should not pass keys when $filter is false', function () {
    const schema = {
      foo: {
        $filter: 'returnFalse',
      },
      'bar.bell': {
        $filter: 'returnFalse',
      },
      baz: {
        qux: {
          $filter: 'returnFalse',
        },
      },
    };
    const adapter = new JsonAdapter(
      schema,
      {},
      {
        returnFalse: () => false,
      },
    );
    const result = adapter.mapTransform({
      foo: 'abc',
      bar: {
        bell: 'def',
      },
      baz: {
        qux: 'ghi',
      },
    });
    expect(result).toEqual({ baz: {} });
  });
  it('test $transform: $lookup', function () {
    const schema = {
      gender1: { $transform: '$lookup', dictionary: 'gender' },
      gender2: { $transform: '$lookup', dictionary: 'gender' },
      Area: {
        Country: {
          $transform: '$lookup',
          dictionary: 'country',
        },
      },
    };
    const adapter = new JsonAdapter(
      schema,
      {},
      {},
      {
        gender: [
          ['Male', 'M'],
          ['Female', 'F'],
        ],
        country: [
          ['Pakistan', 'PK'],
          ['USA', 'US'],
        ],
      },
    );
    const result = adapter.mapTransform({
      gender1: 'Male',
      gender2: 'Female',
      Area: {
        Country: 'USA',
      },
    });
    expect(result).toEqual({
      gender1: 'M',
      gender2: 'F',
      Area: {
        Country: 'US',
      },
    });
  });
  it('test $iterate', function () {
    const schema = {
      foo: 'bar',
      baz: {
        $iterate: true,
        qux: 'quux',
        tux: 'pack',
      },
    };
    const adapter = new JsonAdapter(schema);
    const result = adapter.mapTransform({
      bar: 1,
      baz: [
        { quux: 2, pack: 3 },
        { quux: 4, pack: 5 },
      ],
    });
    expect(result).toEqual({
      foo: 1,
      baz: [
        {
          qux: 2,
          tux: 3,
        },
        {
          qux: 4,
          tux: 5,
        },
      ],
    });
  });
});
