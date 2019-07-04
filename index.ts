class Value<T = unknown> {
    constructor(public value: T, public name: string) {}
}

type Primitive = null | undefined | boolean | number | string | Date;
type ToValue<T> = [T] extends [Primitive]
    ? Value<T>
    : T extends any[]
    ? Value<{readonly [P in keyof T]: ToValue<T[P]>}>
    : T extends HashMap<unknown>
    ? T
    : T extends LazyMap<unknown>
    ? T
    : {readonly [P in keyof T]: ToValue<T[P]>};

function isObj<T extends object>(val: unknown): val is T {
    return typeof val === 'object' && val !== null;
}
function fromDefaultValue(obj: unknown, json: unknown, path: string): unknown {
    if (isObj(obj)) {
        if (Array.isArray(obj)) {
            const defaultChild = obj[0];
            if (defaultChild === undefined) {
                throw new Error(`defaultValue of the array should be present: ${path}`);
            }
            if (Array.isArray(json)) {
                return new Value(json.map((val, i) => fromDefaultValue(defaultChild, val, path + '[' + i + ']')), path);
            } else {
                return new Value([], path);
            }
        }
        if (obj instanceof Date) {
            if (typeof json !== 'string') {
                throw new Error(`json value is not a date string: ${json}, ${path}`);
            }
            return new Value(json !== undefined ? new Date(json) : new Date(obj.getTime()), path);
        }
        if (json !== undefined && !isObj(json)) {
            throw new Error(`json value should be an object: ${json}, ${path}`);
        }
        if (obj instanceof LazyMap) {
            return new LazyMap(obj.defaultValue, path, json as object);
        }
        if (obj instanceof HashMap) {
            return new HashMap(obj.defaultValue, path, json as object);
        }
        const newObj: {[key: string]: unknown} = {};
        for (const key in obj) {
            newObj[key] = fromDefaultValue(
                obj[key as never],
                json === undefined ? undefined : (json as object)[key as never],
                path === '' ? key : path + '.' + key,
            );
        }
        return newObj;
    }
    if (json !== undefined) {
        if (typeof obj !== typeof json) {
            throw new Error(`Expected json type "${typeof obj}", given: "${typeof json}", ${path}`);
        }
        return new Value(json, path);
    }
    return new Value(obj, path);
}
function toJson(obj: unknown): unknown {
    if (isObj(obj)) {
        if (obj instanceof Value) return toJson(obj.value);
        if (obj instanceof Date) return obj;
        if (Array.isArray(obj)) {
            return obj.map(toJson);
        }
        const newObj: {[key: string]: unknown} = {};
        if (obj instanceof LazyMap || obj instanceof HashMap) {
            const newObj: {[key: string]: unknown} = {};
            for (const [key, value] of ((obj as unknown) as {map: Map<string, unknown>}).map) {
                newObj[key] = toJson(value);
            }
            return newObj;
        }
        for (const key in obj) {
            newObj[key] = toJson(obj[key as never]);
        }
        return newObj;
    }
    return obj;
}
const rootJsonMap = new Map<
    string,
    {
        json?: {single: {[name: string]: unknown}; multi: {[name: string]: {[key: string]: unknown}}};
        multi: Map<string, Map<string | number, unknown>>;
        single: Map<string, unknown>;
    }
>();

function getRootMap() {
    // const component = getCurrentComponent();
    return rootJsonMap.get({} as never)!;
}

function make<T>(stateName: string, defaultValue: T) {
    type Result = ToValue<T>;
    return {
        single(): ToValue<T> {
            const rootMap = getRootMap();
            const existsValue = rootMap.single.get(stateName) as Result;
            if (existsValue === undefined) {
                const json = rootMap.json !== undefined ? rootMap.json.single[stateName] : undefined;
                const value = fromDefaultValue(defaultValue, json, stateName) as Result;
                rootMap.single.set(stateName, value);
                return value;
            }
            return existsValue;
        },
        multi(key: string | number): Result {
            const rootMap = getRootMap();
            let multiMap = rootMap.multi.get(stateName);
            if (multiMap === undefined) {
                multiMap = new Map();
                if (rootMap.json !== undefined) {
                    const json = rootMap.json.multi[stateName];
                    if (json !== undefined) {
                        for (const k in json) {
                            multiMap.set(k, fromDefaultValue(defaultValue, json[k], stateName + '[' + k + ']'));
                        }
                    }
                }
                rootMap.multi.set(stateName, multiMap);
            }
            const existValue = multiMap.get(key) as Result;
            if (existValue === undefined) {
                const value = fromDefaultValue(defaultValue, undefined, stateName) as Result;
                multiMap.set(key, value);
                return value;
            }
            return existValue;
        },
    };
}

class HashMap<T> {
    protected map = new Map<string | number, ToValue<T>>();
    protected version: Value<number>;
    constructor(public defaultValue: T, protected path?: string, json?: object) {
        this.version = new Value(0, path!);
        if (json !== undefined) {
            for (const key in json) {
                this.map.set(key, json[key as never]);
            }
        }
    }
    get(key: string | number): ToValue<T> {
        this.version.value;
        const existsValue = this.map.get(key);
        if (existsValue === undefined) {
            const value = fromDefaultValue(this.defaultValue, undefined, this.path!) as ToValue<T>;
            this.map.set(key, value);
            return value;
        }
        return existsValue;
    }
    set(key: string | number, value: ToValue<T>) {
        this.map.set(key, value);
        this.version.value++;
        return this;
    }
    has(key: string | number) {
        this.version.value;
        return this.map.has(key);
    }
    delete(key: string | number) {
        this.version.value++;
        return this.map.delete(key);
    }
}
interface ValueMap {
    path: string;
}
class LazyMap<T> {
    protected map = new Map<string | number, ToValue<T>>();
    constructor(public defaultValue: T, protected path?: string, json?: object) {
        if (json !== undefined) {
            for (const key in json) {
                this.map.set(key, json[key as never]);
            }
        }
    }
    get(key: string | number): ToValue<T> {
        const existsValue = this.map.get(key);
        if (existsValue === undefined) {
            const value = fromDefaultValue(this.defaultValue, undefined, this.path!) as ToValue<T>;
            this.map.set(key, value);
            return value;
        }
        return existsValue;
    }
}

// class BoxedHashMap<T> extends BaseHashMap<ToValue<T>> {
//     protected brand!: BoxedHashMap<T>;
//     constructor(protected defaultValue: T) {
//         super();
//     }
// }

const state = make('filter', {
    activeFilterId: 1,
    price: {
        from: 0,
        to: 0,
    },
    rangeFilters: new LazyMap({from: 0, to: 0}),
    rangeArrayFilters: new LazyMap([{from: 0, to: 0}]),
    booleanFilters: new LazyMap(false),
    radioFilters: new LazyMap([0]),
});

function Foo() {
    const {radioFilters, rangeFilters, booleanFilters, rangeArrayFilters} = state.single();
    var arr = rangeArrayFilters.get('12');
    arr.value[0].from.value += 1;
    booleanFilters.get(123);
    const x = radioFilters.get('1324');
    rangeFilters.get('123').from;
    x.value = [];
}
