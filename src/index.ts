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
    private dictionaries: Record<string, [primitive, primitive][]> = {},
  ) {}

  getDict(dict: string): [primitive, primitive][] {
    return this.dictionaries[dict] || [];
  }

  getTransformer(name: string): (primitive) => primitive {
    return this.transformers[name];
  }

  getFilter(name: string): () => boolean {
    return this.filters[name];
  }

  isPipeline(pipeline: string): boolean {
    return (
      _.isString(pipeline) ||
      _.some(_.keys(pipeline), (key) => key.startsWith('$'))
    );
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
          if (!_.isString(formula[op])) {
            throw new Error(
              'Invalid $transform! $transform key does not contain a string identifier',
            );
          }
          if (formula[op] === '$lookup') {
            log({ key, formula, src, target });
            this.mapField(
              key,
              key,
              src,
              target,
              this.lookupValue.bind(this, formula['dictionary']),
            );
          } else {
            this.mapField(
              key,
              key,
              src,
              target,
              this.getTransformer(formula[op]).bind(src),
            );
          }
        } else if (op === '$concat') {
          if (!_.isArray(formula[op])) {
            throw new Error('Invalid $concat! Expected array of pipelines');
          }
          const concatenatedValue = _.reduce(
            formula[op],
            (acc: any[], pipeline: any) => {
              if (!this.isPipeline(pipeline)) {
                throw new Error(
                  'Invalid $concat! non-pipeline encountered in $concat array',
                );
              }
              const tempTarget = {};
              this.mapKey(key, pipeline, src, tempTarget);
              acc = [...acc, dot.pick(key, tempTarget)];
              return acc;
            },
            [],
          );
          dot.str(key, concatenatedValue, target);
        } else if (op === '$alt') {
          if (!_.isArray(formula[op])) {
            throw new Error('Invalid $alt! Expected array of pipelines');
          }
          const altValue = _.reduce(
            formula[op],
            (acc, alt) => {
              if (!this.isPipeline(alt)) {
                throw new Error(
                  'Invalid $alt! non-pipeline encountered in $alt array',
                );
              }
              if (!!acc) {
                return acc;
              }
              const tempTarget = {};
              this.mapKey(key, alt, src, tempTarget);
              const currValue = dot.pick(key, tempTarget);
              if (currValue) {
                return currValue;
              }
              return undefined;
            },
            undefined,
          );
          dot.str(key, altValue, target);
        } else if (op === '$filter') {
          if (!_.isString(formula[op])) {
            throw new Error(
              'Invalid $filter! $filter key does not contain a string identifier',
            );
          }
          const shouldKeep = this.getFilter(formula[op]).bind(src)(
            dot.pick(key, src),
          );
          if (shouldKeep) {
            this.mapField(key, key, src, target);
          }
        } else if (op === '$iterate' && !!formula[op]) {
          const subSchema = _.omit(formula, '$iterate');
          const subAdapter = new JsonAdapter(
            subSchema,
            this.transformers,
            this.filters,
            this.dictionaries,
          );
          dot.str(
            key,
            _.map(dot.pick(key, src), (item) => subAdapter.mapTransform(item)),
            target,
          );
        }
        break;
      }
      if (!isPipeline) {
        const miniJsonAdapter = new JsonAdapter(
          formula,
          this.transformers,
          this.filters,
          this.dictionaries,
        );
        const miniTarget = miniJsonAdapter.mapTransform(src[key]);
        const srcTarget = miniJsonAdapter.mapTransform(src);
        log({ miniTarget, formula, srcTarget }, '***miniTarget***');
        target[key] = _.defaultsDeep({}, miniTarget, srcTarget);
      }
    } else if (_.isArray(formula)) {
      for (const pipeline of formula) {
        if (!this.isPipeline(pipeline)) {
          throw new Error(
            'Invalid syntax! Encountered non-pipeline in array formula!',
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
    if (_.isPlainObject(this.schema)) {
      for (const key in this.schema) {
        const formula = this.schema[key];
        log({ key, formula });
        this.mapKey(key, formula, _src, target);
        log({ target });
      }
    }
    log({ target }, '***result***');
    return target;
  }
}
