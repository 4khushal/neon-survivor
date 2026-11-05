import { createGame } from './game.js';

const canvas = document.getElementById('game-canvas');
const game = createGame(canvas);

window.game = game;

console.log('Neon Survivor initialized');
console.log('Controls: WASD/Arrows to move, Mouse to aim, Click to shoot, Esc to pause, M to mute');