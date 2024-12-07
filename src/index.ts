import * as dot from 'dot-object';
import * as _ from 'lodash';
import * as debug from 'debug';

const d = debug('json-adapter');
const log = (obj: any, msg: string = '') => d('%o / %s', obj, msg);

export type primitive = string | number | boolean | null | undefined | bigint;

export default class JsonAdapter {
  constructor(
    private schema: object,
    private transformers: object = {},
    private filters: object = {},
    private dictionaries: object = {},
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
    dot.str(targetPath, dot.pick(srcPath, src, false), target, mods);
  }

  mapKey(key: string, formula: any, src: object, target: object) {
    if (_.isString(formula)) {
      log({ key, formula, src, target });
      this.mapField(key, formula, src, target);
    } else if (_.isObject(formula)) {
      let isPipeline = false;
      for (const op in formula) {
        if (!op.startsWith('$')) {
          continue;
        }
        isPipeline = true;
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
      if (!isPipeline) {
        target[key] = formula;
        log({ target });
        const miniJsonAdapter = new JsonAdapter(
          formula,
          this.transformers,
          this.filters,
          this.dictionaries,
        );
        const miniTarget = miniJsonAdapter.mapTransform(formula);
        target[key] = miniTarget;
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
    log({ src });
    const _src = this.freezeObj(src);
    log({ _src });
    const target = {};
    for (const key in this.schema) {
      const formula = this.schema[key];
      log({ key, formula });
      this.mapKey(key, formula, _src, target);
      log({ target });
    }
    log({ target }, '***result***');
    return target;
  }
}
