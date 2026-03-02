import { initialState } from './dist/src/domain/state.js';
import { reducer } from './dist/src/domain/reducer.js';

let s = initialState();
for (let i = 0; i < 9; i += 1) {
  s = reducer(s, { type: 'PRESS_KEY', key: '++' });
}
console.log('after9', {
  total: s.calculator.total.kind === 'rational' ? s.calculator.total.value.num.toString() : s.calculator.total.kind,
  eq: s.unlocks.execution['='],
  completed: s.completedUnlockIds,
});

s = reducer(s, { type: 'PRESS_KEY', key: '++' });
console.log('after10', {
  total: s.calculator.total.kind === 'rational' ? s.calculator.total.value.num.toString() : s.calculator.total.kind,
  eq: s.unlocks.execution['='],
  completed: s.completedUnlockIds,
});
