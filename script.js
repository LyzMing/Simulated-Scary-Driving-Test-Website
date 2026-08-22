(function () {
    'use strict';

    const data = window.ScaryDrivingGameData;
    const { GameEngine } = window.ScaryDrivingEngine;
    const saveManager = window.ScaryDrivingSave.createSaveManager();
    const engine = new GameEngine();

    const elements = {
        pages: {
            start: document.getElementById('start-page'),
            quiz: document.getElementById('quiz-page')
        },
        body: document.body,
        toolbar: document.getElementById('game-toolbar'),
        startBtn: document.getElementById('start-btn'),
        continueBtn: document.getElementById('continue-btn'),
        saveSummary: document.getElementById('save-summary'),
        nightModeBtn: document.getElementById('night-mode-btn'),
        muteBtn: document.getElementById('mute-btn'),
        motionBtn: document.getElementById('motion-btn'),
        toolbarRestartBtn: document.getElementById('toolbar-restart-btn'),
        currentQuestion: document.getElementById('current-question'),
        totalQuestions: document.getElementById('total-questions'),
        modeIndicator: document.getElementById('mode-indicator'),
        quizCard: document.getElementById('quiz-card'),
        questionText: document.getElementById('question-text'),
        questionImage: document.getElementById('question-image'),
        imagePlaceholder: document.getElementById('image-placeholder'),
        options: document.getElementById('options'),
        result: document.getElementById('result-message'),
        analysis: document.getElementById('answer-analysis'),
        prevBtn: document.getElementById('prev-btn'),
        submitBtn: document.getElementById('submit-btn'),
        nextBtn: document.getElementById('next-btn'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalButtons: document.getElementById('modal-buttons'),
        debugPanel: document.getElementById('debug-panel')
    };

    let availableSave = saveManager.load();
    let modalOpen = false;
    let modalClosable = true;
    let previousFocus = null;

    const effects = new window.ScaryDrivingEffects.EffectRunner({
        showNightModal,
        showQ50Confirmation
    });

    engine.subscribe(({ state, effects: emittedEffects }) => {
        if (state.status !== 'idle') saveManager.save(state);
        render(state);
        // 只执行schedule effect（用于自动跳转），禁用视觉/音效
        emittedEffects.forEach(effect => {
            if (effect.type === 'schedule' && effect.action && effect.delay) {
                setTimeout(() => engine.dispatch(effect.action), effect.delay);
            } else if (effect.type === 'night-prompt') {
                showNightModal(effect.promptKey, effect.forced);
            } else if (effect.type === 'confirm-q50') {
                showQ50Confirmation();
            } else if (effect.type === 'inner-route-unlocked') {
                showInnerRouteUnlockedMessage();
            }
        });
    });

    function showPage(name) {
        Object.entries(elements.pages).forEach(([key, page]) => {
            page.classList.toggle('active', key === name);
        });
    }

    function render(state) {
        elements.body.classList.toggle('night-mode', state.nightMode);
        elements.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
        elements.body.classList.toggle('controls-locked', state.controlLock);
        elements.body.classList.toggle('inner-route', state.route === 'inner');
        for (let level = 1; level <= 4; level += 1) {
            elements.body.classList.toggle(`blood-level-${level}`, state.bloodLevel === level);
        }

        elements.nightModeBtn.textContent = state.nightMode ? '夜间模式' : '日间模式';
        elements.nightModeBtn.disabled = state.route === 'inner'; // 里线中不能切换
        elements.muteBtn.textContent = state.settings.muted ? '声音：关' : '声音：开';
        elements.muteBtn.setAttribute('aria-pressed', String(state.settings.muted));
        elements.motionBtn.textContent = state.settings.reduceMotion ? '动态：减弱' : '动态：开';
        elements.motionBtn.setAttribute('aria-pressed', String(state.settings.reduceMotion));

        if (state.status === 'idle') {
            showPage('start');
            elements.toolbar.classList.remove('visible');
            refreshStartPage();
            return;
        }

        elements.toolbar.classList.add('visible');
        showPage('quiz');
        renderQuestion(state);
    }

    function renderQuestion(state) {
        const node = data.nodes[state.currentNodeId];
        const record = state.answers[node.id];

        // 里线显示里线题号，表线显示表线题号
        if (node.route === 'inner') {
            elements.currentQuestion.textContent = String(node.displayNumber) + '里';
        } else {
            elements.currentQuestion.textContent = String(node.displayNumber);
        }

        elements.totalQuestions.textContent = String(data.totalDisplayQuestions);
        elements.modeIndicator.textContent = state.nightMode ? '夜间' : '日间';
        elements.modeIndicator.classList.toggle('night', state.nightMode);
        elements.quizCard.dataset.node = node.id;

        renderQuestionText(node, state);
        renderImage(node, record);
        renderOptions(node, state, record);
        renderResult(node, state, record);
        renderActions(node, state, record);
    }

    function renderQuestionText(node, state) {
        elements.questionText.replaceChildren();

        // 50题：已提交且夜间模式时显示"回到过去"按钮
        if (node.id === 'surface-50' && state.flags.q50Submitted && state.nightMode && !state.flags.q50RewindClicked) {
            elements.questionText.append('你看到了全家福，真想');
            const rewindButton = document.createElement('button');
            rewindButton.type = 'button';
            rewindButton.className = 'rewind-trigger';
            rewindButton.textContent = '回到过去';
            rewindButton.addEventListener('click', () => engine.dispatch({ type: 'TRIGGER_REWIND' }));
            elements.questionText.append(rewindButton, '。');
            return;
        }

        // 里线题目显示里线序号
        if (node.route === 'inner') {
            const innerNumber = node.displayNumber;
            elements.questionText.append(`${innerNumber}里 `, node.text);
            return;
        }

        elements.questionText.textContent = node.text;
    }

    function renderImage(node, record) {
        elements.questionImage.replaceChildren();
        elements.questionImage.hidden = true;
        elements.imagePlaceholder.hidden = true;

        const imageSource = record && record.submitted && node.imageAfterAnswer ? node.imageAfterAnswer : node.image;
        const imageAlt = record && record.submitted && node.imageAltAfterAnswer ? node.imageAltAfterAnswer : node.imageAlt;
        if (imageSource) {
            const image = document.createElement('img');
            image.src = imageSource;
            image.alt = imageAlt || '题目配图';
            image.decoding = 'async';
            image.addEventListener('load', () => {
                elements.questionImage.hidden = false;
            });
            image.addEventListener('error', () => {
                elements.questionImage.hidden = true;
                showImagePlaceholder(node.imageNote || '题目配图暂时无法加载');
            });
            elements.questionImage.appendChild(image);
            elements.questionImage.hidden = false;
        } else if (node.imageNote) {
            showImagePlaceholder(node.imageNote);
        }
    }

    function showImagePlaceholder(message) {
        elements.imagePlaceholder.textContent = message;
        elements.imagePlaceholder.hidden = false;
    }

    function renderOptions(node, state, record) {
        elements.options.replaceChildren();
        const options = [...node.options];
        if (node.type === 'delayed' && state.flags.q49RevealCount >= node.revealAfter) options.push(node.revealOption);

        options.forEach((option) => {
            const optionId = option.charAt(0);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'option-btn';
            button.dataset.option = optionId;
            button.textContent = option;
            const isSelected = Boolean(record && record.selected.includes(optionId));
            button.classList.toggle('selected', isSelected);

            if (record && record.submitted) {
                if (node.behavior === 'sacrifice' && isSelected) {
                    button.classList.add('sacrifice');
                    button.textContent = `${optionId}、放弃`;
                } else if (node.behavior === 'forced' && isSelected) {
                    button.classList.add('corrupted');
                } else if (record.isCorrect && node.answer.includes(optionId)) {
                    button.classList.add('correct');
                } else if (!record.isCorrect && isSelected) {
                    button.classList.add('wrong');
                } else if (!record.isCorrect && node.behavior === 'exact' && node.answer.includes(optionId)) {
                    button.classList.add('correct');
                } else if (!record.isCorrect && node.type === 'multi' && node.answer.includes(optionId)) {
                    // 里线多选题：答错时也显示正确答案
                    button.classList.add('correct');
                }
            }

            const delayedLocked = node.type === 'delayed' && record && record.selected.includes('E');
            button.disabled = state.controlLock || Boolean(record && record.submitted) || delayedLocked;
            button.addEventListener('click', () => {
                effects.unlockAudio();
                engine.dispatch({ type: 'SELECT_OPTION', optionId });
            });
            elements.options.appendChild(button);
        });
    }

    function renderResult(node, state, record) {
        elements.result.textContent = '';
        elements.result.className = 'result-message';
        elements.analysis.hidden = true;
        elements.analysis.textContent = '';

        if (!record || !record.submitted) return;

        // 里线特殊结果显示
        if (node.route === 'inner') {
            if (record.isCorrect) {
                setResult('✓ 正确', 'correct');
            } else {
                setResult('✗ 错误', 'wrong');
            }
            return;
        }

        // 表线结果显示
        if (node.behavior === 'sacrifice') {
            setResult('放弃', 'wrong');
        } else if (node.behavior === 'forced') {
            setResult('离开', 'wrong');
        } else if (node.behavior === 'always') {
            setResult('……', 'wrong');
        } else if (record.isCorrect) {
            setResult('✓ 正确', 'correct');
        } else {
            setResult('✗ 错误', 'wrong');
        }

        if (node.analysis) {
            elements.analysis.textContent = `解析：${node.analysis}`;
            elements.analysis.hidden = false;
        }
    }

    function setResult(message, type) {
        elements.result.textContent = message;
        elements.result.classList.add(type);
    }

    function renderActions(node, state, record) {
        // 上一题按钮：里线和表线都显示
        elements.prevBtn.hidden = false;
        if (node.route === 'inner') {
            // 里线上一题 = 小序号（index更大）
            const innerOrder = data.innerOrder;
            const currentIndex = innerOrder.indexOf(node.id);
            let hasPrev = false;
            for (let i = currentIndex + 1; i < innerOrder.length; i++) {
                if (engine._isInnerNodeUnlocked(innerOrder[i])) {
                    hasPrev = true;
                    break;
                }
            }
            elements.prevBtn.disabled = !hasPrev || state.controlLock;
        } else if (node.id === 'surface-50') {
            // 50题：已提交后可以回退
            elements.prevBtn.disabled = !state.flags.q50Submitted || state.controlLock;
        } else {
            // 表线
            const surfaceIndex = data.surfaceOrder.indexOf(node.id);
            elements.prevBtn.disabled = surfaceIndex <= 0 || state.controlLock;
        }

        // 确认答案按钮
        if (node.id === 'surface-50') {
            // 50题：未提交时显示提交按钮
            elements.submitBtn.hidden = state.flags.q50Submitted;
            elements.submitBtn.disabled = state.controlLock;
            elements.submitBtn.textContent = '提交答卷';
        } else {
            // 其他多选题
            const canSubmitMulti = ['multi', 'delayed'].includes(node.type) && record && record.selected.length > 0 && !record.submitted;
            elements.submitBtn.hidden = !canSubmitMulti;
            elements.submitBtn.disabled = state.controlLock;
            elements.submitBtn.textContent = '提交答案';
        }

        // 下一题按钮
        let showNext = false;
        let disableNext = false;
        if (node.route === 'inner') {
            // 里线：下一题=大序号（已答过的题），inner-49下一题回表线50
            showNext = true;
            disableNext = false;
        } else if (record && record.submitted) {
            if (node.route === 'surface' && node.id !== 'surface-50') {
                showNext = true;
            }
        }
        elements.nextBtn.hidden = !showNext;
        elements.nextBtn.disabled = state.controlLock || disableNext;
    }

    function refreshStartPage() {
        availableSave = saveManager.load();
        elements.continueBtn.hidden = !availableSave;
        elements.saveSummary.hidden = !availableSave;
        if (availableSave) {
            const node = data.nodes[availableSave.currentNodeId];
            elements.saveSummary.textContent = node
                ? `上次进度：第${node.displayNumber}题 · ${availableSave.nightMode ? '夜间模式' : '日间模式'}`
                : '检测到可继续的考试记录';
            elements.startBtn.textContent = '重新开始';
        } else {
            elements.startBtn.textContent = '开始新考试';
        }
    }

    function showNightModal(promptKey, forced = false) {
        showModal({
            title: '🌙 夜间模式',
            message: forced ? '此处似乎只在夜间才会回应。是否切换到夜间模式？' : '是否切换到夜间模式？',
            closable: false,
            buttons: [
                {
                    label: '切换夜间模式',
                    className: 'primary-btn',
                    onClick: () => engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: true, promptKey })
                },
                {
                    label: '保持日间模式',
                    className: 'secondary-btn',
                    onClick: () => engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: false, promptKey })
                }
            ]
        });
    }

    function showQ50Confirmation() {
        showModal({
            title: '答题结束',
            message: '是否交卷？',
            closable: false,
            buttons: [
                {
                    label: '结束答题',
                    className: 'primary-btn danger-btn',
                    onClick: () => engine.dispatch({ type: 'RESET_IDLE' })
                },
                {
                    label: '返回',
                    className: 'secondary-btn',
                    onClick: () => engine.dispatch({ type: 'CONFIRM_Q50' })
                }
            ]
        });
    }

    function showInnerRouteUnlockedMessage() {
        showModal({
            title: '🌙',
            message: '成功进入里线！',
            closable: true,
            buttons: [{
                label: '确定',
                className: 'primary-btn',
                onClick: () => {}
            }]
        });
    }

    function showRestartConfirmation(onConfirm) {
        showModal({
            title: '重新开始？',
            message: '当前答题记录和隐藏路线进度都会被清除。',
            buttons: [
                { label: '取消', className: 'secondary-btn' },
                { label: '清除并重新开始', className: 'primary-btn danger-btn', onClick: onConfirm }
            ]
        });
    }

    function showModal({ title, message, buttons, closable = true }) {
        modalOpen = true;
        modalClosable = closable;
        previousFocus = document.activeElement;
        elements.modalTitle.textContent = title;
        elements.modalMessage.textContent = message;
        elements.modalButtons.replaceChildren();
        buttons.forEach((config) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = config.className || 'secondary-btn';
            button.textContent = config.label;
            button.addEventListener('click', () => {
                hideModal();
                config.onClick && config.onClick();
            });
            elements.modalButtons.appendChild(button);
        });
        elements.modal.hidden = false;
        elements.modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => elements.modalButtons.querySelector('button')?.focus());
    }

    function hideModal() {
        modalOpen = false;
        elements.modal.hidden = true;
        elements.modal.setAttribute('aria-hidden', 'true');
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }

    function clearAndStart() {
        saveManager.clear();
        availableSave = null;
        engine.dispatch({ type: 'START_NEW' });
    }

    elements.startBtn.addEventListener('click', () => {
        effects.unlockAudio();
        availableSave ? showRestartConfirmation(clearAndStart) : clearAndStart();
    });
    elements.continueBtn.addEventListener('click', () => {
        effects.unlockAudio();
        const saved = saveManager.load();
        saved ? engine.dispatch({ type: 'RESTORE', state: saved }) : clearAndStart();
    });
    elements.nightModeBtn.addEventListener('click', () => {
        const state = engine.getState();
        // 里线中不能切换模式
        if (state.route === 'inner') return;
        engine.dispatch({ type: 'SET_NIGHT_MODE', enabled: !state.nightMode });
    });
    elements.muteBtn.addEventListener('click', () => engine.dispatch({ type: 'TOGGLE_MUTE' }));
    elements.motionBtn.addEventListener('click', () => engine.dispatch({ type: 'TOGGLE_MOTION' }));
    elements.toolbarRestartBtn.addEventListener('click', () => showRestartConfirmation(clearAndStart));
    elements.prevBtn.addEventListener('click', () => engine.dispatch({ type: 'PREVIOUS' }));
    elements.nextBtn.addEventListener('click', () => engine.dispatch({ type: 'NEXT' }));
    elements.submitBtn.addEventListener('click', () => engine.dispatch({ type: 'SUBMIT' }));

    let pointerStart = null;
    elements.pages.quiz.addEventListener('pointerdown', (event) => {
        pointerStart = { x: event.clientX, y: event.clientY, time: Date.now() };
        effects.unlockAudio();
    });
    elements.pages.quiz.addEventListener('pointerup', (event) => {
        if (!pointerStart || modalOpen) return;
        const diffX = event.clientX - pointerStart.x;
        const diffY = event.clientY - pointerStart.y;
        const elapsed = Date.now() - pointerStart.time;
        pointerStart = null;
        // 允许更宽松的判断：水平移动>50px 且 水平位移大于垂直位移，且在1秒内完成
        if (Math.abs(diffX) < 50 || Math.abs(diffY) > Math.abs(diffX) || elapsed > 1000) return;
        engine.dispatch({ type: diffX < 0 ? 'SWIPE_LEFT' : 'SWIPE_RIGHT' });
    });
    elements.pages.quiz.addEventListener('pointercancel', () => { pointerStart = null; });

    // 阻止默认拖拽行为（防止PC端拖拽文字）
    elements.pages.quiz.addEventListener('dragstart', (e) => e.preventDefault());

    document.addEventListener('keydown', (event) => {
        if (modalOpen) {
            if (event.key === 'Escape' && modalClosable) hideModal();
            return;
        }
        if (engine.getState().status !== 'playing') return;
        const key = event.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
            engine.dispatch({ type: 'SELECT_OPTION', optionId: key });
            return;
        }
        if (event.key === 'ArrowLeft') engine.dispatch({ type: 'SWIPE_RIGHT' });
        if (event.key === 'ArrowRight') engine.dispatch({ type: 'SWIPE_LEFT' });
        if (event.key === 'Enter') {
            if (!elements.submitBtn.hidden) engine.dispatch({ type: 'SUBMIT' });
            else if (!elements.nextBtn.hidden) engine.dispatch({ type: 'NEXT' });
        }
    });

    if (new URLSearchParams(window.location.search).get('debug') === '1') {
        elements.debugPanel.hidden = false;
        elements.debugPanel.addEventListener('click', (event) => {
            const action = event.target.dataset.debugAction;
            if (!action) return;
            engine.dispatch({ type: 'DEBUG_JUMP', question: Number(action) });
        });
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        engine.dispatch({ type: 'TOGGLE_MOTION' });
    } else {
        render(engine.getState());
    }
})();
