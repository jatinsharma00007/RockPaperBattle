/**
 * Speed Mode module for Rock Paper Battle
 * Handles time-limited gameplay mechanics
 */

import { getData, setData } from '../settings/storage.js';
import * as sound from './sound.js';
import { getRandomMove } from './aiModes.js';

// Configuration
const DEFAULT_TIME_LIMIT = 3000; // 3 seconds in milliseconds
const TIMER_UPDATE_INTERVAL = 50; // Update timer bar every 50ms
const WARNING_THRESHOLD = 1000; // Start warning (red color, sound) at 1 second left

// State
let isSpeedModeEnabled = false;
let currentTimer = null;
let timerUpdateInterval = null;
let currentTimeLeft = 0;
let timerCallback = null;
let timerElement = null;
let isTimerRunning = false;
let currentGameMode = null;

/**
 * Initialize the speed mode system
 */
export function init() {
    // Load speed mode setting from localStorage
    const speedModeEnabled = getData('speedMode');
    if (speedModeEnabled !== undefined) {
        isSpeedModeEnabled = speedModeEnabled;
    } else {
        // Default to disabled
        setData('speedMode', false);
        isSpeedModeEnabled = false;
    }
    
    // Create timer element if it doesn't exist
    createTimerElement();
}

/**
 * Set the current game mode
 * @param {string} mode - The current game mode ('endless', 'bestOf5', etc.)
 */
export function setGameMode(mode) {
    currentGameMode = mode;
    // Always update the UI based on the new game mode
    updateSpeedModeUI();
    // Stop timer if not endless
    if (mode !== 'endless' && isTimerRunning) {
        stopTimer();
    }
}

/**
 * Check if speed mode should be active based on settings and game mode
 * @returns {boolean} Whether speed mode should be active
 */
export function shouldBeActive() {
    return isSpeedModeEnabled && currentGameMode === 'endless';
}

/**
 * Create the timer UI element
 */
function createTimerElement() {
    // Check if element already exists
    if (document.getElementById('speed-timer')) {
        timerElement = document.getElementById('speed-timer');
        return;
    }
    
    // Create timer container
    const timerContainer = document.createElement('div');
    timerContainer.id = 'speed-timer-container';
    timerContainer.className = 'speed-timer-container hidden';
    
    // Create timer bar
    timerElement = document.createElement('div');
    timerElement.id = 'speed-timer';
    timerElement.className = 'speed-timer';
    
    // Add to container
    timerContainer.appendChild(timerElement);
    
    // Add to game screen
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        // Insert after game header
        const gameHeader = gameScreen.querySelector('.game-header');
        if (gameHeader) {
            gameHeader.insertAdjacentElement('afterend', timerContainer);
        } else {
            // Fallback: insert at beginning
            gameScreen.insertAdjacentElement('afterbegin', timerContainer);
        }
    } else {
        // Fallback: add to body
        document.body.appendChild(timerContainer);
    }
}

/**
 * Check if speed mode is enabled
 * @returns {boolean} Whether speed mode is enabled
 */
export function isEnabled() {
    return isSpeedModeEnabled;
}

/**
 * Set whether speed mode is enabled
 * @param {boolean} enabled - Whether to enable speed mode
 */
export function setEnabled(enabled) {
    isSpeedModeEnabled = enabled;
    setData('speedMode', enabled);
    
    // Update UI based on the new setting
    updateSpeedModeUI();
}

/**
 * Update the speed mode UI elements
 */
function updateSpeedModeUI() {
    const banner = document.getElementById('game-info-banner');
    const bannerText = document.getElementById('game-info-text');
    const bannerIcon = document.querySelector('.game-info-banner-icon');

    if (!banner || !bannerText || !bannerIcon) return;

    if (shouldBeActive()) {
        banner.classList.remove('hidden');
        banner.classList.add('speed-mode');
        bannerText.textContent = 'Speed Mode Active';
        bannerIcon.textContent = '⚡';
        // (Optional: blinking cursor logic)
    } else {
        banner.classList.add('hidden');
        // (Optional: clear blinking cursor interval)
    }
}

/**
 * Toggle speed mode on/off
 * @returns {boolean} The new speed mode state
 */
export function toggle() {
    isSpeedModeEnabled = !isSpeedModeEnabled;
    setData('speedMode', isSpeedModeEnabled);
    
    // Update UI based on the new setting
    updateSpeedModeUI();
    
    return isSpeedModeEnabled;
}

/**
 * Start the speed mode timer
 * @param {number} timeLimit - Optional time limit in milliseconds
 * @param {Function} onTimeUp - Callback to execute when time runs out
 * @returns {boolean} Whether the timer was successfully started
 */
export function startTimer(timeLimit = DEFAULT_TIME_LIMIT, onTimeUp = null) {
    if (!shouldBeActive() || isTimerRunning) {
        return false;
    }
    timerCallback = onTimeUp;
    currentTimeLeft = timeLimit;
    isTimerRunning = true;
    const timerContainer = document.getElementById('speed-timer-container');
    if (timerContainer) {
        timerContainer.classList.remove('hidden');
    }
    timerElement = document.getElementById('speed-timer');
    if (timerElement) {
        timerElement.classList.remove('warning');
        timerElement.style.transition = 'none';
        timerElement.style.width = '100%';
        timerElement.style.display = 'block';
        void timerElement.offsetWidth; // force reflow
        
        // Clear any existing timer update interval
        if (timerUpdateInterval) {
            clearInterval(timerUpdateInterval);
        }
        
        // Start a timer update interval to smoothly update the timer width
        timerUpdateInterval = setInterval(() => {
            if (!isTimerRunning || !timerElement) {
                clearInterval(timerUpdateInterval);
                return;
            }
            
            currentTimeLeft -= TIMER_UPDATE_INTERVAL;
            if (currentTimeLeft <= 0) {
                clearInterval(timerUpdateInterval);
                return;
            }
            
            // Calculate remaining percentage
            const remainingPercentage = (currentTimeLeft / timeLimit) * 100;
            timerElement.style.width = `${remainingPercentage}%`;
            
            // Add warning class when time is running low
            if (currentTimeLeft <= WARNING_THRESHOLD && !timerElement.classList.contains('warning')) {
                timerElement.classList.add('warning');
                sound.play('tick');
            }
        }, TIMER_UPDATE_INTERVAL);
    }
    
    stopTimer(false);
    currentTimer = setTimeout(() => {
        timeUp();
    }, timeLimit);
    sound.play('countdown');
    return true;
}

/**
 * Stop the speed mode timer
 * @param {boolean} hideContainer - Whether to hide the timer container
 */
export function stopTimer(hideContainer = true) {
    // Clear countdown timer
    if (currentTimer) {
        clearTimeout(currentTimer);
        currentTimer = null;
    }
    
    // Clear timer update interval
    if (timerUpdateInterval) {
        clearInterval(timerUpdateInterval);
        timerUpdateInterval = null;
    }
    
    // Reset state
    isTimerRunning = false;
    
    // Hide timer container if requested
    if (hideContainer) {
        const timerContainer = document.getElementById('speed-timer-container');
        if (timerContainer) {
            timerContainer.classList.add('hidden');
        }
    }
}

/**
 * Handle time running out
 */
function timeUp() {
    // Play time up sound
    sound.play('timeUp');
    
    // Execute callback if provided
    if (timerCallback && typeof timerCallback === 'function') {
        timerCallback();
    }
    
    // Stop the timer
    stopTimer();
}

/**
 * Get a random move for when time runs out
 * @param {Array} availableMoves - List of available moves
 * @returns {string} A randomly selected move
 */
export function getTimeoutMove(availableMoves) {
    return getRandomMove(availableMoves);
}

/**
 * Get the appropriate delay time based on current game mode and speed mode settings
 * @param {number} standardDelay - The standard delay time in milliseconds
 * @param {number} speedDelay - The speed mode delay time in milliseconds
 * @returns {number} The appropriate delay time based on current settings
 */
export function getAppropriateDelay(standardDelay = 1000, speedDelay = 300) {
    return shouldBeActive() ? speedDelay : standardDelay;
}

/**
 * Clean up any resources used by the speed mode module
 */
export function cleanup() {
    // Clear any active timers
    stopTimer();
    
    // Clear the text animation interval
    if (window.speedModeTextInterval) {
        clearInterval(window.speedModeTextInterval);
        window.speedModeTextInterval = null;
    }
}

export default {
    init,
    isEnabled,
    setEnabled,
    toggle,
    startTimer,
    stopTimer,
    getTimeoutMove,
    setGameMode,
    shouldBeActive,
    getAppropriateDelay,
    cleanup
}; 