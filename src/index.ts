import dot from 'dot-object';
import _ from 'lodash';

export type primitive = string | number | boolean | null | undefined | bigint;

export default class JsonAdapter {
  constructor(
    private schema: object,
    private transformers: object,
    private filters: object,
    private dictionaries: object,
  ) {}
  getDict(dict: string): [primitive, primitive][] {
    return this.dictionaries[dict];
  }
  getTransformer(name: string): (primitive) => primitive {
    return this.transformers[name];
  }
  getFilter(name: string): () => boolean {
    return this.filters[name];
  }
  lookupValue(dictionary: string, value: primitive) {
    const dict = this.getDict(dictionary);
    let defaultValue = value;
    for (const [key, mappedValue] of dict) {
      if (key === '*') {
        defaultValue = mappedValue;
      }
      if (key === value) {
        return mappedValue;
      }
    }
    return defaultValue === '*' ? value : undefined;
  }

  mapField(
    targetPath: string,
    srcPath: string,
    src: object,
    target: object,
    mods?: any,
  ) {
    dot.str(targetPath, dot.pick(srcPath, src), target, mods);
  }

  mapKey(key: string, formula: any, src: object, target: object) {
    if (_.isString(formula)) {
      this.mapField(key, formula, src, target);
    } else if (_.isObject(formula)) {
      for (const op in formula) {
        if (op.startsWith('$')) {
          continue;
        }
        if (op === '$value') {
          dot.str(key, formula[op], target);
        } else if (op === '$transform') {
          if (formula[op] === 'map') {
            this.mapField(key, key, src, target, this.lookupValue.bind(this));
          }
          this.mapField(
            key,
            key,
            src,
            target,
            this.getTransformer(formula[op]).bind(target),
          );
        } else if (op === '$concat') {
          const concatenatedValue = formula[op].reduce((acc, curr) => {
            return acc.push(dot.pick(curr, src));
          }, []);
          dot.str(key, concatenatedValue, target);
        } else if (op === '$alt') {
          const altValue = _.map(formula[op], (alt) => {
            return alt.reduce((acc, curr) => {
              if (acc) {
                return acc;
              }
              const currValue = dot.pick(curr, src);
              if (currValue) {
                return currValue;
              }
              return null;
            }, null);
          });
          dot.str(key, altValue, target);
        } else if (op === '$filter') {
          const shouldKeep = this.getFilter(formula[op]).bind(src)(
            dot.pick(key, src),
          );
          if (shouldKeep) {
            this.mapField(key, key, src, target);
          }
        }
        break;
      }
    } else if (_.isArray(formula)) {
      for (const pipeline of formula) {
        if (!_.isString(pipeline) || !_.isPlainObject(pipeline)) {
          throw new Error(
            'Invalid pipeline! Only strings and objects are allowed',
          );
        }
        this.mapKey(key, pipeline, src, target);
      }
    }
  }
  freezeObj(obj: any) {
    return Object.freeze(obj);
  }
  mapTransform(src: any): object {
    const _src = this.freezeObj(src);
    const target = {};
    for (const key in this.schema) {
      const formula = dot.pick(key, this.schema);
      this.mapKey(key, formula, _src, target);
    }
    return target;
  }
}
