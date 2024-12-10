# json-adapter
map, transform, filter, and validate json and javascript objects


## Quickstart

1. Install the package:
```shell
npm install node-json-adapter
```

2. Use in project:
```javascript
const JsonAdapter = require("node-json-adapter").default;

const vars = {
	isTest: 'is_test:true',
};

const genderDictionary = [
  ["male", "Male"],
  ["female", "Female"],
  ["*", ""], // map every other value to empty string
];
const stateNamesDictionary = [
  ["NY", "New York"],
  ["*", "*"], // map every other value to itself
];
const relationshipsDictionary = [
  ["son", "immediate family"],
  // map every other value to undefined
]
const dictionaries = {
  gender: genderDictionary,
  relationship: relationshipsDictionary,
  state: stateNamesDictionary,
};

const toLowerCase = (str) => (typeof str === "string" ? str.toLowerCase() : "");
const transformers = {
  toLowerCase: toLowerCase,
};

const userSchema = {
	id: "userId",
	name: "user.name",
    isActive: {$value: true},
	isTest: { $var: 'isTest' },
	gender: ["gender", { $transform: "toLowerCase" }, { $lookup: "gender" }],
};

const adapter = new JsonAdapter(
	patientSchema, 
    transformers, 
    {}, // supposed to contain filters / untested
    dictionaries,
    vars
);

const mappedObj = adapter.mapTransform({
  userId: 5,
  user: {
		name: 'john cena',
  },
  gender: 'FeMaLe',
});
console.log(mappedObj);
expect(mappedObj).toEqual({
  id: 5,
  name: 'john cena',
  gender: 'Female',
});
```
