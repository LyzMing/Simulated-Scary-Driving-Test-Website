import assert from 'node:assert/strict';
import test from 'node:test';

await import('../js/game-data.js');
await import('../js/save-manager.js');
await import('../js/game-engine.js');

const { GameEngine } = globalThis.ScaryDrivingEngine;
const data = globalThis.ScaryDrivingGameData;

function scheduledAction(result, type = null) {
    const schedule = result.effects.find((effect) => effect.type === 'schedule' && (!type || effect.action.type === type));
    assert.ok(schedule, `Expected a scheduled${type ? ` ${type}` : ''} action.`);
    return schedule.action;
}

function seedAnswer(engine, nodeId, selected, isCorrect) {
    engine.state.answers[nodeId] = { selected, submitted: true, isCorrect };
}

// 按题目数据正确作答当前节点（多选题需要提交）
function answerNode(engine, nodeId) {
    const node = data.nodes[nodeId];
    assert.ok(node, `Unknown node: ${nodeId}`);
    for (const option of node.answer) {
        engine.dispatch({ type: 'SELECT_OPTION', optionId: option });
    }
    if (node.type === 'multi') engine.dispatch({ type: 'SUBMIT' });
}

// 从第50题直达里线入口 inner-49：
// 预置表线记录（13、14 故意答错是剧情守卫要求）→ 交卷 → 回溯 → 退入里线。
// 注意 DEBUG_JUMP 会重置状态且 >=38 题自动进入夜间模式。
function enterInnerRoute(engine) {
    engine.dispatch({ type: 'DEBUG_JUMP', question: 50 });
    for (let index = 0; index <= 15; index += 1) {
        const node = data.nodes[`surface-${index}`];
        if ([13, 14].includes(index)) {
            seedAnswer(engine, node.id, ['B'], false);
        } else {
            seedAnswer(engine, node.id, [...node.answer], true);
        }
    }
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    engine.dispatch({ type: 'SUBMIT' });
    engine.dispatch({ type: 'CONFIRM_Q50' });
    engine.dispatch({ type: 'TRIGGER_REWIND' });
    engine.dispatch({ type: 'PREVIOUS' });
    assert.equal(engine.getState().currentNodeId, 'inner-49');
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
    const answer = engine.dispatch({ type: 'SELECT_OPTION', optionId: 'B' });
    engine.dispatch(scheduledAction(answer));
    assert.equal(engine.getState().currentNodeId, 'surface-21');
});

test('multi-select requires submit and impossible questions always fail', () => {
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
    engine.dispatch({ type: 'SUBMIT' });
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

test('question 50 unlocks the inner route only after submit and night mode', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 50 });
    engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: false });
    engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });

    // 未交卷时无法触发回溯
    engine.dispatch({ type: 'TRIGGER_REWIND' });
    assert.equal(engine.getState().flags.innerRouteUnlocked, false);

    const submit = engine.dispatch({ type: 'SUBMIT' });
    assert.ok(submit.effects.some((effect) => effect.type === 'confirm-q50'));
    assert.equal(engine.getState().flags.q50Submitted, false);
    engine.dispatch({ type: 'CONFIRM_Q50' });
    assert.equal(engine.getState().flags.q50Submitted, true);

    // 日间模式下无法触发回溯
    engine.dispatch({ type: 'TRIGGER_REWIND' });
    assert.equal(engine.getState().flags.innerRouteUnlocked, false);

    engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: true });
    const result = engine.dispatch({ type: 'TRIGGER_REWIND' });
    assert.ok(result.effects.some((effect) => effect.type === 'inner-route-unlocked'));
    assert.equal(engine.getState().flags.innerRouteUnlocked, true);
    assert.equal(engine.getState().flags.q50RewindClicked, true);
    assert.equal(engine.getState().status, 'playing');
    assert.equal(engine.getState().currentNodeId, 'surface-50');
});

test('inner route walks backwards from 49里 to 16里 behind unlock guards', () => {
    const engine = new GameEngine();
    enterInnerRoute(engine);

    // 里线入口未作答前无法深入
    engine.dispatch({ type: 'PREVIOUS' });
    assert.equal(engine.getState().currentNodeId, 'inner-49');

    // 49里作答后，“下一题”（大序号方向）回到表线50
    answerNode(engine, 'inner-49');
    engine.dispatch({ type: 'NEXT' });
    assert.equal(engine.getState().currentNodeId, 'surface-50');

    // 表线50可以再次退入里线入口
    engine.dispatch({ type: 'PREVIOUS' });
    assert.equal(engine.getState().currentNodeId, 'inner-49');

    // 从 48里 一路倒退至 16里：先退入更小序号，再作答，如此往复
    for (let index = 1; index < data.innerOrder.length; index += 1) {
        const targetNodeId = data.innerOrder[index];
        engine.dispatch({ type: 'PREVIOUS' });
        assert.equal(engine.getState().currentNodeId, targetNodeId, `应可退入 ${targetNodeId}`);
        answerNode(engine, targetNodeId);
    }

    // 终点 16里 之后没有更小序号
    engine.dispatch({ type: 'PREVIOUS' });
    assert.equal(engine.getState().currentNodeId, 'inner-16');

    // 全部17道里线题均已提交
    assert.ok(data.innerOrder.every((id) => engine.getState().answers[id]?.submitted));
});

test('inner guards reject correct answers when surface conditions are unmet', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'DEBUG_JUMP', question: 50 });

    // 20里 的守卫要求 surface-0 与 surface-15 都答对，此处故意让 15 答错
    seedAnswer(engine, 'surface-0', ['A'], true);
    seedAnswer(engine, 'surface-15', ['B'], false);

    // 直接铺好 49里 到 21里 的提交记录并站上 20里
    for (const nodeId of data.innerOrder.slice(0, 12)) {
        seedAnswer(engine, nodeId, [...data.nodes[nodeId].answer], true);
    }
    engine.state.currentNodeId = 'inner-20';
    engine.state.route = 'inner';

    const result = engine.dispatch({ type: 'SELECT_OPTION', optionId: 'A' });
    assert.ok(result.effects.some((effect) => effect.type === 'answer-wrong'));

    // 守卫未通过时无法退入更小序号
    engine.dispatch({ type: 'PREVIOUS' });
    assert.equal(engine.getState().currentNodeId, 'inner-20');
});

test('switching back to day mode collapses the inner route onto question 50', () => {
    const engine = new GameEngine();
    enterInnerRoute(engine);

    const collapse = engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: false });
    assert.ok(collapse.effects.some((effect) => effect.type === 'inner-route-closed'));
    assert.equal(engine.getState().route, 'surface');
    assert.equal(engine.getState().currentNodeId, 'surface-50');
    assert.equal(engine.getState().flags.innerRouteUnlocked, true);

    // 夜间模式下从表线50可直接恢复里线
    const restore = engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: true });
    assert.ok(restore.effects.some((effect) => effect.type === 'inner-route-restored'));
    assert.equal(engine.getState().currentNodeId, 'inner-49');
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
