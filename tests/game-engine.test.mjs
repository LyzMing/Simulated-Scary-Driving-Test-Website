import assert from 'node:assert/strict';
import test from 'node:test';

await import('../js/game-data.js');
await import('../js/save-manager.js');
await import('../js/game-engine.js');

const { GameEngine } = globalThis.ScaryDrivingEngine;

function scheduledAction(result, type = null) {
    const schedule = result.effects.find((effect) => effect.type === 'schedule' && (!type || effect.action.type === type));
    assert.ok(schedule, `Expected a scheduled${type ? ` ${type}` : ''} action.`);
    return schedule.action;
}

function answerAndAdvance(engine, option) {
    const result = engine.dispatch({ type: 'SELECT_OPTION', optionId: option });
    engine.dispatch(scheduledAction(result));
}

test('normal answers score once and auto-advance', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'START_NEW' });
    const answer = engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    assert.equal(engine.getState().score, 1);
    assert.equal(engine.getState().answers['surface-0'].isCorrect, true);
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    assert.equal(engine.getState().score, 1);
    engine.dispatch(scheduledAction(answer));
    assert.equal(engine.getState().currentNodeId, 'surface-1');
});

test('surface sequence skips the hidden placeholders', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 15 });
    answerAndAdvance(engine, 'B');
    assert.equal(engine.getState().currentNodeId, 'surface-21');
});

test('strict hidden route reaches the temporary lock and left-only final', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_PREPARE_HIDDEN' });
    engine.dispatch({ type: 'SWIPE_RIGHT' });
    assert.equal(engine.getState().currentNodeId, 'inner-20');

    for (const expected of ['inner-19', 'inner-18', 'inner-17', 'inner-16']) {
        const result = engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
        engine.dispatch(scheduledAction(result));
        assert.equal(engine.getState().currentNodeId, expected);
    }

    const lockResult = engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    assert.equal(engine.getState().controlLock, true);
    engine.dispatch(scheduledAction(lockResult, 'UNLOCK_INNER_FINAL'));
    assert.equal(engine.getState().controlLock, false);
    assert.equal(engine.getState().swipeMode, 'left-only');
    engine.dispatch({ type: 'SWIPE_LEFT' });
    assert.equal(engine.getState().currentNodeId, 'inner-15');
});

test('hidden final supports both bad ending and successful return', () => {
    const badEngine = new GameEngine();
    badEngine.dispatch({ type: 'DEBUG_PREPARE_HIDDEN' });
    badEngine.dispatch({ type: 'SWIPE_RIGHT' });
    badEngine.state.currentNodeId = 'inner-15';
    badEngine.state.route = 'inner';
    badEngine.dispatch({ type: 'SELECT_OPTION', optionId: 'B' });
    assert.equal(badEngine.getState().status, 'be');

    const goodEngine = new GameEngine();
    goodEngine.dispatch({ type: 'DEBUG_PREPARE_HIDDEN' });
    goodEngine.dispatch({ type: 'SWIPE_RIGHT' });
    goodEngine.state.currentNodeId = 'inner-15';
    goodEngine.state.route = 'inner';
    const result = goodEngine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    goodEngine.dispatch(scheduledAction(result, 'RETURN_FROM_INNER'));
    assert.equal(goodEngine.getState().currentNodeId, 'surface-21');
    assert.equal(goodEngine.getState().flags.hiddenRouteComplete, true);
});

test('multi-select and impossible questions use different policies', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 41 });
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'B' });
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'C' });
    engine.dispatch({ type: 'SUBMIT' });
    assert.equal(engine.getState().answers['surface-41'].isCorrect, true);
    engine.dispatch({ type: 'NEXT' });
    assert.equal(engine.getState().currentNodeId, 'surface-42');

    engine.dispatch({ type: 'DEBUG_JUMP', question: 43 });
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    assert.equal(engine.getState().answers['surface-43'].isCorrect, false);
    engine.dispatch({ type: 'NEXT' });
    assert.equal(engine.getState().currentNodeId, 'surface-44');
});

test('question 49 reveals resentment after four inert clicks', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 49 });
    for (let count = 1; count <= 4; count += 1) {
        engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
        assert.equal(engine.getState().flags.q49RevealCount, count);
    }
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'E' });
    engine.dispatch({ type: 'SUBMIT' });
    assert.equal(engine.getState().answers['surface-49'].isCorrect, true);
    engine.dispatch({ type: 'NEXT' });
    assert.equal(engine.getState().currentNodeId, 'surface-50');
});

test('question 50 requires confirmation and night mode before rewind', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 50 });
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    const submit = engine.dispatch({ type: 'SUBMIT' });
    assert.ok(submit.effects.some((effect) => effect.type === 'confirm-q50'));
    assert.equal(engine.getState().flags.q50Submitted, false);
    engine.dispatch({ type: 'CONFIRM_Q50' });
    assert.equal(engine.getState().flags.q50Submitted, true);
    engine.dispatch({ type: 'TRIGGER_REWIND' });
    assert.equal(engine.getState().status, 'rewind_started');
    assert.equal(engine.getState().flags.rewindStarted, true);
});

test('save manager rejects corrupt or incompatible state', () => {
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key)
    };
    const manager = globalThis.ScaryDrivingSave.createSaveManager(storage);
    const engine = new GameEngine();
    engine.dispatch({ type: 'START_NEW' });
    assert.equal(manager.save(engine.getState()), true);
    assert.equal(manager.load().currentNodeId, 'surface-0');
    values.set(manager.key, '{broken');
    assert.equal(manager.load(), null);
    values.set(manager.key, JSON.stringify({ version: 99, currentNodeId: 'surface-0' }));
    assert.equal(manager.load(), null);
});
