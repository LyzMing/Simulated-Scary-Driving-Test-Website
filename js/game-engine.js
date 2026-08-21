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
                hiddenRouteComplete: false,
                inner16AwaitingSwipe: false,
                q49RevealCount: 0,
                q50Submitted: false,
                rewindStarted: false
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
            state.swipeMode = state.currentNodeId === 'inner-16' && state.flags.inner16AwaitingSwipe
                ? 'left-only'
                : 'normal';
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

            const alwaysAllowed = new Set(['RESTORE', 'START_NEW', 'RESET_IDLE', 'TOGGLE_MUTE', 'TOGGLE_MOTION', 'RETRY_HIDDEN', 'DEBUG_PREPARE_HIDDEN', 'DEBUG_JUMP']);
            if (this.state.controlLock && !alwaysAllowed.has(action.type) && !['UNLOCK_INNER_FINAL', 'ADVANCE_EXPECTED', 'RETURN_FROM_INNER'].includes(action.type)) {
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
                case 'UNLOCK_INNER_FINAL':
                    return this._unlockInnerFinal(action);
                case 'RETURN_FROM_INNER':
                    return this._returnFromInner(action);
                case 'TRIGGER_REWIND':
                    return this._triggerRewind();
                case 'RETRY_HIDDEN':
                    return this._retryHidden();
                case 'DEBUG_PREPARE_HIDDEN':
                    return this._debugPrepareHidden();
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
            if (record.isCorrect) {
                this.state.score += 1;
                return this._finish([{ type: 'answer-correct' }]);
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
            return this._finish([{ type: 'q50-submitted' }, { type: 'answer-wrong' }]);
        }

        _evaluate(node, selected) {
            if (node.behavior === 'impossible' || node.behavior === 'forced-submit') return false;
            if (['always', 'sacrifice', 'forced'].includes(node.behavior)) return true;
            return sameSet(selected, node.answer);
        }

        _handleInnerAnswer(node, record) {
            if (!record.isCorrect) {
                if (node.id === 'inner-15') {
                    this.state.status = 'be';
                    this.state.controlLock = false;
                    return this._finish([{ type: 'scream' }, { type: 'bad-ending' }]);
                }
                return this._collapseInnerRoute();
            }

            const guardPassed = this._innerGuardPassed(node.id);
            if (!guardPassed) return this._collapseInnerRoute();

            if (node.id === 'inner-16') {
                this.state.controlLock = true;
                this.state.swipeMode = 'none';
                this.state.flags.inner16AwaitingSwipe = true;
                return this._finish([
                    { type: 'freeze-interface' },
                    { type: 'schedule', delay: 1400, action: { type: 'UNLOCK_INNER_FINAL', expectedNodeId: node.id } }
                ]);
            }
            if (node.id === 'inner-15') {
                this.state.flags.hiddenRouteComplete = true;
                this.state.controlLock = true;
                this.state.swipeMode = 'none';
                this.state.bloodLevel = Math.max(this.state.bloodLevel, 2);
                return this._finish([
                    { type: 'accident-sequence' },
                    { type: 'schedule', delay: 2400, action: { type: 'RETURN_FROM_INNER', expectedNodeId: node.id } }
                ]);
            }

            const nextByNode = {
                'inner-20': 'inner-19',
                'inner-19': 'inner-18',
                'inner-18': 'inner-17',
                'inner-17': 'inner-16'
            };
            const effects = [{ type: 'answer-correct' }];
            if (node.id === 'inner-17') effects.push({ type: 'word-corruption' });
            effects.push({ type: 'schedule', delay: node.id === 'inner-17' ? 1800 : 900, action: { type: 'ADVANCE_EXPECTED', expectedNodeId: node.id, targetNodeId: nextByNode[node.id] } });
            return this._finish(effects);
        }

        _innerGuardPassed(nodeId) {
            const correct = (id) => this.state.answers[id] && this.state.answers[id].isCorrect === true;
            const wrong = (id) => this.state.answers[id] && this.state.answers[id].isCorrect === false;
            if (nodeId === 'inner-20') return wrong('surface-14');
            if (nodeId === 'inner-19') return wrong('surface-13');
            if (nodeId === 'inner-18') {
                return Array.from({ length: 16 }, (_, index) => index)
                    .filter((index) => ![13, 14].includes(index))
                    .every((index) => correct(`surface-${index}`));
            }
            if (nodeId === 'inner-17') {
                return correct('inner-18') && ['surface-6', 'surface-7', 'surface-10'].every(correct);
            }
            return true;
        }

        _collapseInnerRoute() {
            this.state.controlLock = true;
            this.state.swipeMode = 'none';
            return this._finish([
                { type: 'hidden-route-collapsed' },
                { type: 'schedule', delay: 1200, action: { type: 'RETURN_FROM_INNER', expectedNodeId: this.state.currentNodeId } }
            ]);
        }

        _advanceExpected(action) {
            if (this.state.currentNodeId !== action.expectedNodeId || this.state.status !== 'playing') return this._noop();
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';
            if (action.targetNodeId) return this._enterNode(action.targetNodeId);
            return this._goNext();
        }

        _unlockInnerFinal(action) {
            if (this.state.currentNodeId !== action.expectedNodeId || this.state.currentNodeId !== 'inner-16') return this._noop();
            this.state.controlLock = false;
            this.state.swipeMode = 'left-only';
            return this._finish([{ type: 'inner-left-only' }]);
        }

        _returnFromInner(action) {
            if (action.expectedNodeId && this.state.currentNodeId !== action.expectedNodeId) return this._noop();
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';
            this.state.flags.inner16AwaitingSwipe = false;
            return this._enterNode('surface-21', [{ type: 'surface-restored' }]);
        }

        _goNext() {
            if (this.state.status !== 'playing' || this.state.controlLock || this.state.route !== 'surface') return this._noop();
            const node = this.getCurrentNode();
            const record = this.state.answers[node.id];
            if (!record || !record.submitted || node.id === 'surface-50') return this._noop();
            const index = data.surfaceOrder.indexOf(node.id);
            const next = data.surfaceOrder[index + 1];
            return next ? this._enterNode(next) : this._noop();
        }

        _goPrevious() {
            if (this.state.status !== 'playing' || this.state.controlLock || this.state.route !== 'surface' || this.state.flags.q50Submitted) return this._noop();
            const index = data.surfaceOrder.indexOf(this.state.currentNodeId);
            if (index <= 0) return this._noop();
            return this._enterNode(data.surfaceOrder[index - 1], [{ type: 'navigated-back' }]);
        }

        _swipeLeft() {
            if (this.state.status !== 'playing' || this.state.controlLock) return this._noop();
            if (this.state.swipeMode === 'left-only' && this.state.currentNodeId === 'inner-16') {
                this.state.swipeMode = 'normal';
                this.state.flags.inner16AwaitingSwipe = false;
                return this._enterNode('inner-15', [{ type: 'entered-inner-final' }]);
            }
            if (this.state.swipeMode !== 'normal') return this._noop();
            return this._goNext();
        }

        _swipeRight() {
            if (this.state.status !== 'playing' || this.state.controlLock || this.state.swipeMode !== 'normal') return this._noop();
            if (this.state.currentNodeId === 'surface-21' && !this.state.flags.hiddenRouteComplete && this._canEnterInner()) {
                return this._enterNode('inner-20', [{ type: 'hidden-route-entered' }]);
            }
            return this._goPrevious();
        }

        _canEnterInner() {
            const correct = (id) => this.state.answers[id] && this.state.answers[id].isCorrect === true;
            return this.state.nightMode && correct('surface-0') && correct('surface-15');
        }

        _triggerRewind() {
            if (this.state.currentNodeId !== 'surface-50' || !this.state.flags.q50Submitted) return this._noop();
            if (!this.state.nightMode) return this._finish([{ type: 'night-prompt', promptKey: 'rewind', forced: true }]);
            this.state.status = 'rewind_started';
            this.state.flags.rewindStarted = true;
            this.state.controlLock = true;
            return this._finish([{ type: 'rewind-started' }]);
        }

        _retryHidden() {
            Object.keys(this.state.answers).filter((id) => id.startsWith('inner-')).forEach((id) => delete this.state.answers[id]);
            this.state.status = 'playing';
            this.state.route = 'inner';
            this.state.currentNodeId = 'inner-20';
            this.state.controlLock = false;
            this.state.swipeMode = 'normal';
            this.state.flags.inner16AwaitingSwipe = false;
            this.state.flags.hiddenRouteComplete = false;
            return this._enterNode('inner-20', [{ type: 'hidden-route-retried' }]);
        }

        _debugPrepareHidden() {
            this.state = createInitialState(this.state.settings);
            this.state.status = 'playing';
            this.state.nightMode = true;
            this.state.nightPromptsSeen = { 'surface-0': true, 'surface-21': true };
            for (let index = 0; index <= 15; index += 1) {
                const node = data.nodes[`surface-${index}`];
                const useWrong = [13, 14].includes(index);
                const selected = useWrong
                    ? [node.options.find((option) => option.charAt(0) !== node.answer[0]).charAt(0)]
                    : [...node.answer];
                this.state.answers[node.id] = { selected, submitted: true, isCorrect: !useWrong };
                if (!useWrong) this.state.score += 1;
            }
            return this._enterNode('surface-21', [{ type: 'debug-jump' }]);
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
