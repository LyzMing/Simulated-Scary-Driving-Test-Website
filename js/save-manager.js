(function (global) {
    'use strict';

    const SAVE_KEY = 'scary-driving-save-v1';

    function createSaveManager(storage) {
        const target = storage || (() => {
            try {
                return global.localStorage;
            } catch (error) {
                return null;
            }
        })();

        function load() {
            if (!target) return null;
            try {
                const raw = target.getItem(SAVE_KEY);
                if (!raw) return null;
                const state = JSON.parse(raw);
                if (!state || state.version !== 1 || typeof state.currentNodeId !== 'string') {
                    clear();
                    return null;
                }
                return state;
            } catch (error) {
                clear();
                return null;
            }
        }

        function save(state) {
            if (!target || !state || state.status === 'idle') return false;
            try {
                target.setItem(SAVE_KEY, JSON.stringify(state));
                return true;
            } catch (error) {
                return false;
            }
        }

        function clear() {
            if (!target) return;
            try {
                target.removeItem(SAVE_KEY);
            } catch (error) {
                // 无可用存储时保持游戏可运行。
            }
        }

        return Object.freeze({ load, save, clear, key: SAVE_KEY });
    }

    global.ScaryDrivingSave = Object.freeze({ createSaveManager, SAVE_KEY });
})(typeof window !== 'undefined' ? window : globalThis);
