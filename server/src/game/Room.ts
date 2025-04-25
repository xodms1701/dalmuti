import { GameManager } from './GameManager';
import { Player, WaitingPlayer, RolePlayer, ExchangePlayer, PlayingPlayer, GamePhase } from '../types';

export class Room {
    private gameManager: GameManager;
    private players: Map<string, Player> = new Map();
    private inviteCode: string;
    private roomName: string;
    private maxPlayers: number;
    private minPlayers: number;

    constructor(inviteCode: string, roomName: string) {
        this.inviteCode = inviteCode;
        this.roomName = roomName;
        this.gameManager = new GameManager();
        this.maxPlayers = 8;
        this.minPlayers = 4;
    }

    public getInviteCode(): string {
        return this.inviteCode;
    }

    public getRoomName(): string {
        return this.roomName;
    }

    public addPlayer(player: WaitingPlayer): void {
        if (this.players.size >= this.maxPlayers) {
            throw new Error('Room is full');
        }
        this.players.set(player.id, player);
        this.gameManager.addPlayer(player);
    }

    public removePlayer(playerId: string): void {
        this.players.delete(playerId);
        this.gameManager.removePlayer(playerId);
    }

    public getPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    public getGame(): GameManager {
        return this.gameManager;
    }

    public startGame(): void {
        this.gameManager.startGame();
        const gameState = this.gameManager.getGameState();
        gameState.players.forEach(player => {
            this.players.set(player.id, player);
        });
    }

    public assignRoles(): void {
        this.gameManager.assignRoles();
        const gameState = this.gameManager.getGameState();
        gameState.players.forEach(player => {
            this.players.set(player.id, player);
        });
    }

    public startPlaying(): void {
        this.gameManager.startPlaying();
        const gameState = this.gameManager.getGameState();
        gameState.players.forEach(player => {
            this.players.set(player.id, player);
        });
    }

    public playCards(playerId: string, cards: any[]): boolean {
        return this.gameManager.playCards(playerId, cards);
    }

    public exchangeCards(fromPlayerId: string, toPlayerId: string, cards: any[]): void {
        this.gameManager.exchangeCards(fromPlayerId, toPlayerId, cards);
        const gameState = this.gameManager.getGameState();
        gameState.players.forEach(player => {
            this.players.set(player.id, player);
        });
    }

    public pass(playerId: string): void {
        this.gameManager.pass(playerId);
    }

    public getCurrentTurn(): string | null {
        return this.gameManager.getGameState().currentTurn;
    }

    public getGameState() {
        return this.gameManager.getGameState();
    }

    private canStartGame(): boolean {
        return this.players.size >= this.minPlayers && 
               this.players.size <= this.maxPlayers &&
               Array.from(this.players.values()).every(player => 
                 player.phase === 'waiting' && (player as WaitingPlayer).isReady
               );
    }

    public getRoomState() {
        return {
            inviteCode: this.inviteCode,
            roomName: this.roomName,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            minPlayers: this.minPlayers,
            canStartGame: this.canStartGame(),
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                nickname: player.nickname,
                isReady: player.phase === 'waiting' ? (player as WaitingPlayer).isReady : false
            }))
        };
    }

    public hasPlayer(playerId: string): boolean {
        return this.players.has(playerId);
    }
} 