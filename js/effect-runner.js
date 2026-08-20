(function (global) {
    'use strict';

    class EffectRunner {
        constructor(handlers = {}) {
            this.handlers = handlers;
            this.audioContext = null;
            this.overlay = global.document && document.getElementById('effect-overlay');
            this.wordStorm = global.document && document.getElementById('word-storm');
        }

        unlockAudio() {
            if (this.audioContext) {
                if (this.audioContext.state === 'suspended') this.audioContext.resume().catch(() => {});
                return;
            }
            const AudioContext = global.AudioContext || global.webkitAudioContext;
            if (!AudioContext) return;
            try {
                this.audioContext = new AudioContext();
            } catch (error) {
                this.audioContext = null;
            }
        }

        run(effects, engine) {
            for (const effect of effects) {
                switch (effect.type) {
                    case 'schedule':
                        global.setTimeout(() => engine.dispatch(effect.action), effect.delay);
                        break;
                    case 'night-prompt':
                        this.handlers.showNightModal && this.handlers.showNightModal(effect.promptKey, effect.forced);
                        break;
                    case 'confirm-q50':
                        this.handlers.showQ50Confirmation && this.handlers.showQ50Confirmation();
                        break;
                    case 'answer-wrong':
                        this._pulse('wrong-pulse', 420);
                        this._playCue('wrong', engine);
                        break;
                    case 'answer-correct':
                        this._playCue('correct', engine);
                        break;
                    case 'word-corruption':
                        this._wordCorruption(engine);
                        break;
                    case 'freeze-interface':
                        this._pulse('freeze-flash', 1300);
                        this._playCue('low', engine);
                        break;
                    case 'hidden-route-entered':
                        this._pulse('blackout', 650);
                        this._playCue('low', engine);
                        break;
                    case 'hidden-route-collapsed':
                        this._pulse('blackout', 1100);
                        this._playCue('wrong', engine);
                        break;
                    case 'accident-sequence':
                        this._accident(engine);
                        break;
                    case 'scream':
                        this._playCue('scream', engine);
                        this._pulse('scream-flash', 900);
                        break;
                    case 'sacrifice':
                        this._playCue('crack', engine);
                        this._pulse('sacrifice-flash', 1100);
                        break;
                    case 'forced-choice':
                        this._pulse('forced-face', 900);
                        this._playCue('crack', engine);
                        break;
                    case 'blood-pulse':
                        this._pulse('blood-pulse', 700);
                        break;
                    case 'dull-click':
                        this._playCue('dull', engine);
                        break;
                    case 'reveal-option':
                        this._pulse('reveal-flash', 700);
                        this._playCue('low', engine);
                        break;
                    case 'rewind-started':
                        this._pulse('rewind-flash', 1800);
                        this._playCue('rewind', engine);
                        break;
                    default:
                        break;
                }
            }
        }

        _pulse(className, duration) {
            if (!this.overlay) return;
            this.overlay.className = className;
            global.setTimeout(() => {
                if (this.overlay.className === className) this.overlay.className = '';
            }, duration);
        }

        _wordCorruption(engine) {
            if (!this.wordStorm) return;
            const reduceMotion = engine.getState().settings.reduceMotion;
            const words = ['必须', '保证', '生命', '安全'];
            this.wordStorm.replaceChildren();
            const count = reduceMotion ? 12 : 48;
            for (let index = 0; index < count; index += 1) {
                const span = document.createElement('span');
                span.textContent = words[index % words.length];
                span.style.setProperty('--x', `${(index * 37) % 100}%`);
                span.style.setProperty('--y', `${(index * 61) % 100}%`);
                span.style.setProperty('--delay', `${(index % 8) * 70}ms`);
                this.wordStorm.appendChild(span);
            }
            this.wordStorm.classList.add('active');
            global.setTimeout(() => {
                this.wordStorm.classList.remove('active');
                this.wordStorm.replaceChildren();
            }, reduceMotion ? 800 : 1800);
        }

        _accident(engine) {
            this._pulse('accident-flash', 2300);
            this._playCue('brake', engine);
            global.setTimeout(() => this._playCue('crash', engine), 650);
        }

        _playCue(name, engine) {
            if (engine.getState().settings.muted) return;
            this.unlockAudio();
            const context = this.audioContext;
            if (!context) return;
            const now = context.currentTime;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain).connect(context.destination);

            const profiles = {
                correct: [660, 880, 0.12, 'sine', 0.055],
                wrong: [180, 95, 0.24, 'square', 0.045],
                low: [90, 45, 0.6, 'sine', 0.06],
                dull: [115, 80, 0.12, 'triangle', 0.035],
                crack: [130, 38, 0.45, 'sawtooth', 0.08],
                brake: [1200, 190, 0.75, 'sawtooth', 0.045],
                crash: [120, 28, 0.7, 'square', 0.11],
                scream: [460, 1280, 0.75, 'sawtooth', 0.055],
                rewind: [150, 820, 1.2, 'sine', 0.06]
            };
            const [start, end, duration, type, volume] = profiles[name] || profiles.dull;
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(start, now);
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.start(now);
            oscillator.stop(now + duration + 0.03);
        }
    }

    global.ScaryDrivingEffects = Object.freeze({ EffectRunner });
})(typeof window !== 'undefined' ? window : globalThis);
