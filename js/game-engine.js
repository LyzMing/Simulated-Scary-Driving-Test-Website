(function (global) {
    'use strict';

    const data = global.ScaryDrivingGameData;
    if (!data) throw new Error('ScaryDrivingGameData must load before GameEngine.');

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const sameSet = (left, right) => {
        if (left.length !== right.length) return false;
        const a = [...left].sort();
        const b = [...right].sort();
        return a.every((value, index) => value === b[index]);
    };

    function createInitialState(settings = {}) {
        return {
            version: data.version,
            status: 'idle',
            route: 'surface',
            currentNodeId: 'surface-0',
            nightMode: false,
            nightPromptsSeen: {},
            answers: {},
            score: 0,
            bloodLevel: 0,
            controlLock: false,
            swipeMode: 'normal',
            flags: {
                innerRouteUnlocked: false,
                q49RevealCount: 0,
                q50Submitted: false,
                q50RewindClicked: false
            },
            visited: {},
            effectsLog: [],
            pendingAction: null,
            settings: {
                muted: Boolean(settings.muted),
                reduceMotion: Boolean(settings.reduceMotion)
            },
            updatedAt: Date.now()
        };
    }

    function normalizeState(saved) {
        const base = createInitialState(saved && saved.settings);
        if (!saved || saved.version !== data.version || !data.nodes[saved.currentNodeId]) return base;
        const state = {
            ...base,
            ...clone(saved),
            nightPromptsSeen: { ...base.nightPromptsSeen, ...(saved.nightPromptsSeen || {}) },
            answers: { ...(saved.answers || {}) },
            flags: { ...base.flags, ...(saved.flags || {}) },
            visited: { ...(saved.visited || {}) },
            settings: { ...base.settings, ...(saved.settings || {}) },
            effectsLog: Array.isArray(saved.effectsLog) ? saved.effectsLog.slice(-40) : []
        };
        state.route = data.nodes[state.currentNodeId].route;
        if (state.controlLock && !state.pendingAction) {
            state.controlLock = false;
            state.swipeMode = 'normal';
        }
        return state;
    }

    class GameEngine {
        constructor() {
            this.state = createInitialState();
            this.listeners = new Set();
        }

        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        getState() {
            return this.state;
        }

        getCurrentNode() {
            return data.nodes[this.state.currentNodeId];
        }

        dispatch(action) {
            if (!action || typeof action.type !== 'string') return { state: this.state, effects: [] };

            if (this.state.pendingAction && this._actionsMatch(this.state.pendingAction.action, action)) {
                this.state.pendingAction = null;
            }

            const alwaysAllowed = new Set(['RESTORE', 'START_NEW', 'RESET_IDLE', 'TOGGLE_MUTE', 'TOGGLE_MOTION', 'DEBUG_JUMP']);
            if (this.state.controlLock && !alwaysAllowed.has(action.type) && action.type !== 'ADVANCE_EXPECTED') {
                return { state: this.state, effects: [] };
            }

            switch (action.type) {
                case 'START_NEW':
                    this.state = createInitialState(this.state.settings);
                    this.state.status = 'playing';
                    return this._enterNode('surface-0', [{ type: 'game-started' }]);
                case 'RESTORE':
                    this.state = normalizeState(action.state);
                    return this._restoreEffects();
                case 'RESET_IDLE':
                    this.state = createInitialState(this.state.settings);
                    return this._finish([{ type: 'game-reset' }]);
                case 'SET_NIGHT_MODE':
                    this.state.nightMode = Boolean(action.enabled);
                    if (action.promptKey) this.state.nightPromptsSeen[action.promptKey] = true;

                    // 日间模式时关闭里线（但保留unlock状态）
                    if (!action.enabled) {
                        if (this.state.route === 'inner') {
                            return this._enterNode('surface-50', [{ type: 'inner-route-closed', night: false }]);
                        }
                    }

                    // 夜间模式时：如果在50题且里线已解锁，恢复里线访问
                    if (action.enabled && this.state.currentNodeId === 'surface-50' && this.state.flags.innerRouteUnlocked) {
                        return this._enterNode('inner-49', [{ type: 'inner-route-restored' }]);
                    }

                    return this._finish([{ type: 'mode-changed', night: this.state.nightMode }]);
                case 'TOGGLE_MUTE':
                    this.state.settings.muted = !this.state.settings.muted;
                    return this._finish([{ type: 'settings-changed' }]);
                case 'TOGGLE_MOTION':
                    this.state.settings.reduceMotion = !this.state.settings.reduceMotion;
                    return this._finish([{ type: 'settings-changed' }]);
                case 'SELECT_OPTION':
                    return this._selectOption(action.optionId);
                case 'SUBMIT':
                    return this._submitAnswer();
                case 'CONFIRM_Q50':
                    return this._confirmQ50();
                case 'NEXT':
                    return this._goNext();
                case 'PREVIOUS':
                    return this._goPrevious();
                case 'SWIPE_LEFT':
                    return this._swipeLeft();
                case 'SWIPE_RIGHT':
                    return this._swipeRight();
                case 'ADVANCE_EXPECTED':
                    return this._advanceExpected(action);
                case 'TRIGGER_REWIND':
                    return this._triggerRewind();
                case 'DEBUG_JUMP':
                    return this._debugJump(action.question);
                default:
                    return { state: this.state, effects: [] };
            }
        }

        _selectOption(optionId) {
            if (this.state.status !== 'playing') return this._noop();
            const node = this.getCurrentNode();
            const optionIds = node.options.map((option) => option.charAt(0));
            const record = this.state.answers[node.id] || { selected: [], submitted: false, isCorrect: null };
            if (record.submitted) return this._noop();

            if (node.type === 'delayed') {
                if (optionId === 'E' && this.state.flags.q49RevealCount >= node.revealAfter) {
                    record.selected = ['E'];
                    this.state.answers[node.id] = record;
                    return this._finish([{ type: 'option-selected' }]);
                }
                if (!optionIds.includes(optionId)) return this._noop();
                this.state.flags.q49RevealCount = Math.min(node.revealAfter, this.state.flags.q49RevealCount + 1);
                const effects = [{ type: 'dull-click' }];
                if (this.state.flags.q49RevealCount === node.revealAfter) effects.push({ type: 'reveal-option' });
                return this._finish(effects);
            }

            if (!optionIds.includes(optionId)) return this._noop();
            if (node.type === 'multi') {
                const selected = new Set(record.selected);
                selected.has(optionId) ? selected.delete(optionId) : selected.add(optionId);
                record.selected = [...selected];
                this.state.answers[node.id] = record;
                return this._finish([{ type: 'option-selected' }]);
            }

            record.selected = [optionId];
            this.state.answers[node.id] = record;

            if (node.behavior === 'forced-submit') {
                return this._finish([{ type: 'option-selected' }]);
            }

            record.submitted = true;
            record.isCorrect = this._evaluate(node, record.selected);

            if (node.route === 'inner') return this._handleInnerAnswer(node, record);
            if (node.behavior === 'sacrifice') {
                record.resultLabel = '放弃';
                this.state.controlLock = true;
                this.state.swipeMode = 'none';
                return this._finish([
                    { type: 'sacrifice' },
                    { type: 'schedule', delay: 1300, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } }
                ]);
            }
            if (node.behavior === 'forced') {
                return this._finish([
                    { type: 'forced-choice' },
                    { type: 'schedule', delay: 900, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } }
                ]);
            }
            if (node.behavior === 'always') {
                record.isCorrect = null;
                return this._finish([{ type: 'blood-pulse' }]);
            }

            if (record.isCorrect) {
                this.state.score += 1;
                const effects = [{ type: 'answer-correct' }];
                if (node.autoAdvance) effects.push({ type: 'schedule', delay: 1000, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } });
                return this._finish(effects);
            }
            return this._finish([{ type: 'answer-wrong' }]);
        }

        _submitAnswer() {
            if (this.state.status !== 'playing') return this._noop();
            const node = this.getCurrentNode();
            const record = this.state.answers[node.id] || { selected: [], submitted: false, isCorrect: null };
            if (record.submitted || record.selected.length === 0) return this._noop();

            if (node.behavior === 'forced-submit') {
                return this._finish([{ type: 'confirm-q50' }]);
            }
            if (!['multi', 'delayed'].includes(node.type)) return this._noop();

            record.submitted = true;
            record.isCorrect = this._evaluate(node, record.selected);
            this.state.answers[node.id] = record;

            // q50特殊处理
            if (node.id === 'surface-50') {
                this.state.flags.q50Submitted = true;
                return this._finish([{ type: 'q50-submitted' }, { type: 'answer-wrong' }]);
            }

            // 里线题目调用 _handleInnerAnswer
            if (node.route === 'inner') {
                return this._handleInnerAnswer(node, record);
            }

            if (record.isCorrect) {
                this.state.score += 1;
                if (node.behavior === 'sacrifice') {
                    record.resultLabel = '放弃';
                    this.state.controlLock = true;
                    this.state.swipeMode = 'none';
                    return this._finish([
                        { type: 'sacrifice' },
                        { type: 'schedule', delay: 1300, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } }
                    ]);
                }
                if (node.behavior === 'forced') {
                    return this._finish([
                        { type: 'forced-choice' },
                        { type: 'schedule', delay: 900, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } }
                    ]);
                }
                if (node.behavior === 'always') {
                    record.isCorrect = null;
                    return this._finish([{ type: 'blood-pulse' }]);
                }
                const effects = [{ type: 'answer-correct' }];
                if (node.autoAdvance) effects.push({ type: 'schedule', delay: 1000, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id } });
                return this._finish(effects);
            }
            return this._finish([{ type: 'answer-wrong' }]);
        }

        _confirmQ50() {
            const node = this.getCurrentNode();
            if (!node || node.id !== 'surface-50') return this._noop();
            const record = this.state.answers[node.id];
            if (!record || record.selected.length === 0 || record.submitted) return this._noop();
            record.submitted = true;
            record.isCorrect = false;
            this.state.flags.q50Submitted = true;
            return this._finish([{ type: 'q50-submitted' }]);
        }

        _evaluate(node, selected) {
            if (node.behavior === 'impossible' || node.behavior === 'forced-submit') return false;
            if (['always', 'sacrifice', 'forced'].includes(node.behavior)) return true;
            return sameSet(selected, node.answer);
        }

        _handleInnerAnswer(node, record) {
            if (!record.isCorrect) {
                return this._finish([{ type: 'answer-wrong' }]);
            }

            const guardPassed = this._innerGuardPassed(node.id);
            if (!guardPassed) return this._finish([{ type: 'answer-wrong' }]);

            return this._finish([{ type: 'answer-correct' }]);
        }

        _innerGuardPassed(nodeId) {
            const correct = (id) => this.state.answers[id] && this.state.answers[id].isCorrect === true;
            const wrong = (id) => this.state.answers[id] && this.state.answers[id].isCorrect === false;

            // 20里：选对0和15
            if (nodeId === 'inner-20') return correct('surface-0') && correct('surface-15');

            // 19里：选对20里，且14选错
            if (nodeId === 'inner-19') return correct('inner-20') && wrong('surface-14');

            // 18里：选对19里，且13选错
            if (nodeId === 'inner-18') return correct('inner-19') && wrong('surface-13');

            // 17里：选对18里，及选对除去13，14的所有题（0到15）
            if (nodeId === 'inner-17') {
                if (!correct('inner-18')) return false;
                return Array.from({ length: 16 }, (_, index) => index)
                    .filter((index) => ![13, 14].includes(index))
                    .every((index) => correct(`surface-${index}`));
            }

            // 16里：选对17里，且6，7，10，18里均选对时
            if (nodeId === 'inner-16') {
                return correct('inner-17') && ['surface-6', 'surface-7', 'surface-10', 'inner-18'].every(correct);
            }

            // 其他里线题目：始终可用
            return true;
        }

        _advanceExpected(action) {
            if (this.state.currentNodeId !== action.expectedNodeId || this.state.status !== 'playing') return this._noop();
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';

            // 里线题目不自动跳转
            if (this.state.route === 'inner') return this._noop();

            // 表线题目自动跳转
            if (action.targetNodeId) return this._enterNode(action.targetNodeId);
            return this._goNext();
        }

        _goNext() {
            if (this.state.status !== 'playing' || this.state.controlLock) return this._noop();

            // 里线导航
            if (this.state.route === 'inner') {
                return this._innerGoNext();
            }

            // 表线导航
            if (this.state.route !== 'surface') return this._noop();
            const node = this.getCurrentNode();
            const record = this.state.answers[node.id];
            if (!record || !record.submitted || node.id === 'surface-50') return this._noop();
            const index = data.surfaceOrder.indexOf(node.id);
            const next = data.surfaceOrder[index + 1];
            return next ? this._enterNode(next) : this._noop();
        }

        _innerGoNext() {
            // 下一题 = 大序号（已经答过的题），inner-49的下一题回表线50
            const currentNodeId = this.state.currentNodeId;
            if (currentNodeId === 'inner-49') {
                return this._enterNode('surface-50', [{ type: 'inner-to-surface' }]);
            }
            const innerOrder = data.innerOrder;
            const currentIndex = innerOrder.indexOf(currentNodeId);
            if (currentIndex < 0) return this._noop();
            // index-1 = 大序号 = 下一题
            const nextNodeId = innerOrder[currentIndex - 1];
            if (nextNodeId && data.nodes[nextNodeId]) {
                return this._enterNode(nextNodeId, [{ type: 'navigated-forward' }]);
            }
            return this._noop();
        }

        _goPrevious() {
            if (this.state.status !== 'playing' || this.state.controlLock) return this._noop();

            // 里线导航
            if (this.state.route === 'inner') {
                return this._innerGoPrevious();
            }

            // 表线导航
            if (this.state.route !== 'surface') return this._noop();

            // 50题夜间模式+里线已解锁：上一题直接进里线49
            if (this.state.currentNodeId === 'surface-50' && this.state.nightMode && this.state.flags.innerRouteUnlocked) {
                return this._enterNode('inner-49', [{ type: 'navigated-back' }]);
            }

            const index = data.surfaceOrder.indexOf(this.state.currentNodeId);
            if (index <= 0) return this._noop();
            return this._enterNode(data.surfaceOrder[index - 1], [{ type: 'navigated-back' }]);
        }

        _innerGoPrevious() {
            // 上一题 = 小序号（49→48→47→...→16）
            const currentNodeId = this.state.currentNodeId;
            const innerOrder = data.innerOrder;
            const currentIndex = innerOrder.indexOf(currentNodeId);
            if (currentIndex < 0) return this._noop();

            // 向后找（index大 = 序号小）
            for (let i = currentIndex + 1; i < innerOrder.length; i++) {
                if (this._isInnerNodeUnlocked(innerOrder[i])) {
                    return this._enterNode(innerOrder[i], [{ type: 'navigated-back' }]);
                }
            }
            return this._noop();
        }

        _isInnerNodeUnlocked(nodeId) {
            // 检查里线题目是否已解锁
            // 1. 题目存在
            if (!data.nodes[nodeId]) return false;

            // 2. inner-49 始终可用（里线入口）
            if (nodeId === 'inner-49') return true;

            // 3. 必须答完前一道（大序号）才能解锁
            const innerOrder = data.innerOrder;
            const index = innerOrder.indexOf(nodeId);
            if (index < 0) return false;
            const prevNodeId = innerOrder[index - 1]; // index-1 = 大序号
            const prevRecord = this.state.answers[prevNodeId];
            if (!prevRecord || !prevRecord.submitted) return false;

            // 4. 检查额外解锁条件
            return this._innerGuardPassed(nodeId);
        }

        _swipeLeft() {
            if (this.state.status !== 'playing' || this.state.controlLock) return this._noop();
            if (this.state.swipeMode !== 'normal') return this._noop();
            return this._goNext();
        }

        _swipeRight() {
            if (this.state.status !== 'playing' || this.state.controlLock || this.state.swipeMode !== 'normal') return this._noop();
            return this._goPrevious();
        }

        _triggerRewind() {
            if (this.state.currentNodeId !== 'surface-50' || !this.state.flags.q50Submitted) return this._noop();
            if (!this.state.nightMode) return this._noop();

            // 夜间模式下点击"回到过去"，解锁里线
            this.state.flags.innerRouteUnlocked = true;
            this.state.flags.q50RewindClicked = true;
            return this._finish([{ type: 'inner-route-unlocked' }]);
        }

        _debugJump(question) {
            const nodeId = `surface-${question}`;
            if (!data.nodes[nodeId]) return this._noop();
            this.state = createInitialState(this.state.settings);
            this.state.status = 'playing';
            this.state.nightMode = question >= 38;
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';
            return this._enterNode(nodeId, [{ type: 'debug-jump' }]);
        }

        _enterNode(nodeId, initialEffects = []) {
            const node = data.nodes[nodeId];
            if (!node) return this._noop();
            if (this.state.pendingAction && this.state.pendingAction.action.expectedNodeId === this.state.currentNodeId && nodeId !== this.state.currentNodeId) {
                this.state.pendingAction = null;
            }
            this.state.currentNodeId = nodeId;
            this.state.route = node.route;
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';
            const effects = [...initialEffects, { type: 'node-entered', nodeId }];

            if (!this.state.visited[nodeId]) {
                this.state.visited[nodeId] = true;
                if (node.bloodOnEnter) {
                    this.state.bloodLevel = Math.max(this.state.bloodLevel, node.bloodOnEnter);
                    effects.push({ type: 'blood-pulse' });
                }
            }
            if (node.nightPrompt && !this.state.nightMode) {
                // 只要当前是日间模式就显示提示，不管之前是否看过
                effects.push({ type: 'night-prompt', promptKey: nodeId });
            }
            return this._finish(effects);
        }

        _restoreEffects() {
            const effects = [{ type: 'game-restored' }];
            const node = this.getCurrentNode();
            if (this.state.pendingAction) {
                effects.push({
                    type: 'schedule',
                    delay: Math.max(0, this.state.pendingAction.dueAt - Date.now()),
                    action: this.state.pendingAction.action
                });
            } else if (this.state.status === 'playing' && node.nightPrompt && !this.state.nightMode) {
                effects.push({ type: 'night-prompt', promptKey: node.id });
            }
            return this._finish(effects);
        }

        _actionsMatch(left, right) {
            if (!left || !right || left.type !== right.type) return false;
            if (left.expectedNodeId && left.expectedNodeId !== right.expectedNodeId) return false;
            return true;
        }

        _finish(effects = []) {
            this.state.updatedAt = Date.now();
            const scheduled = [...effects].reverse().find((effect) => effect.type === 'schedule');
            if (scheduled) {
                this.state.pendingAction = {
                    action: clone(scheduled.action),
                    dueAt: this.state.updatedAt + scheduled.delay
                };
            }
            for (const effect of effects) {
                this.state.effectsLog.push({ type: effect.type, nodeId: this.state.currentNodeId, at: this.state.updatedAt });
            }
            this.state.effectsLog = this.state.effectsLog.slice(-40);
            const payload = { state: this.state, effects };
            this.listeners.forEach((listener) => listener(payload));
            return payload;
        }

        _noop() {
            return { state: this.state, effects: [] };
        }
    }

    global.ScaryDrivingEngine = Object.freeze({ GameEngine, createInitialState, normalizeState });
})(typeof window !== 'undefined' ? window : globalThis);
