import { runEngineTests } from "./engine.test.js";
import { runReducerUnlockTests } from "./reducer.unlocks.test.js";
import { runPersistenceTests } from "./persistence.test.js";
const tests = [
    ["engine", runEngineTests],
    ["reducer/unlocks", runReducerUnlockTests],
    ["persistence", runPersistenceTests],
];
let passed = 0;
for (const [name, fn] of tests) {
    try {
        fn();
        console.log(`PASS ${name}`);
        passed += 1;
    }
    catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error instanceof Error ? error.stack : error);
        process.exitCode = 1;
    }
}
if (passed === tests.length) {
    console.log(`All ${passed} test groups passed.`);
}
//# sourceMappingURL=run-tests.js.map