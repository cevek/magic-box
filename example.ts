import {make, LazyMap, Provider, rootToJson} from './index.js';

const state = make('filter', {
    activeFilterId: 1,
    price: {
        from: 0,
        to: 0,
    },
    date: new Date(),
    rangeFilters: new LazyMap({from: 0, to: 0}),
    rangeArrayFilters: new LazyMap([{from: 0, to: 0}]),
    booleanFilters: new LazyMap(false),
    radioFilters: new LazyMap([0]),
});

var json = {
    multi: {
        filter: {
            x: {
                activeFilterId: 300,
                price: {from: 1000, to: 2000},
                date: '2010-07-05T09:08:25.291Z',
                rangeFilters: {'123': {from: 100, to: 200}},
                rangeArrayFilters: {'12': [{from: 1, to: 2}]},
                booleanFilters: {'123': true},
                radioFilters: {'1324': [1, 2, 3, 4]},
            },
        },
    },
    single: {
        filter: {
            activeFilterId: 300,
            price: {from: 1000, to: 2000},
            date: '2010-07-05T09:08:25.291Z',
            rangeFilters: {'123': {from: 100, to: 200}},
            rangeArrayFilters: {'12': [{from: 1, to: 2}]},
            booleanFilters: {'123': true},
            radioFilters: {'1324': [1, 2, 3, 4]},
        },
    },
};

Provider(json);
function Foo() {
    const {radioFilters, date, rangeFilters, booleanFilters, rangeArrayFilters, activeFilterId, price} = state.multi(
        'x',
    );
    {
        const {
            radioFilters,
            date,
            rangeFilters,
            booleanFilters,
            rangeArrayFilters,
            activeFilterId,
            price,
        } = state.single();
        123;
    }
    // var arr = rangeArrayFilters.get('12');
    // arr.value[0].from.value += 1;
    // booleanFilters.get(123);
    // const x = radioFilters.get('1324');
    // rangeFilters.get('123').from;
    // x.value = [];
}

Foo();
console.log(rootToJson());
