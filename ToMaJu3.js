class ToMaJu3 extends Agent {
    constructor() { 
        super();
        this.board = new Board();
        this.turnCount = 0;
    }

    countLines(cellValue) {
        if (cellValue < 0) return 4;
        let c = 0;
        if (cellValue & 1) c++;
        if (cellValue & 2) c++;
        if (cellValue & 4) c++;
        if (cellValue & 8) c++;
        return c;
    }

    evaluateBoard(board) {
        let score = 0;
        let myColor = (this.color === 'R') ? -1 : -2;
        let oppColor = (this.color === 'R') ? -2 : -1;
        let threeLinesCells = 0;

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                let v = board[i][j];
                
                if (v === myColor) score += 50;
                else if (v === oppColor) score -= 50;
                
                if (v >= 0) {
                    let lines = this.countLines(v);
                    if (lines === 3) threeLinesCells++;
                    if (lines === 2) score += 5;
                    if (lines === 0) score += 1;
                }
            }
        }
        
        score -= threeLinesCells * 15;
        return score;
    }

    detectCycleOpportunity(board) {
        let count = 0;
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (this.countLines(board[i][j]) === 3) {
                    count++;
                }
            }
        }
        return count;
    }

    findChainsLite(board, maxTime) {
        let startTime = Date.now();
        let chains = [];
        let visited = new Set();
        let dirs = [
            {bit: 1, dx: -1, dy: 0},
            {bit: 2, dx: 0, dy: 1},
            {bit: 4, dx: 1, dy: 0},
            {bit: 8, dx: 0, dy: -1}
        ];

        const dfs = (r, c, chain) => {
            if (Date.now() - startTime > maxTime) return false;
            
            let key = r + "," + c;
            visited.add(key);
            chain.push([r, c]);
            
            for (let d of dirs) {
                if (!(board[r][c] & d.bit)) {
                    let nr = r + d.dx;
                    let nc = c + d.dy;
                    if (nr >= 0 && nr < board.length &&
                        nc >= 0 && nc < board.length &&
                        this.countLines(board[nr][nc]) === 2 &&
                        !visited.has(nr + "," + nc)) {
                        if (!dfs(nr, nc, chain)) return false;
                    }
                }
            }
            return true;
        };

        for (let i = 0; i < board.length; i++) {
            if (Date.now() - startTime > maxTime) break;
            
            for (let j = 0; j < board.length; j++) {
                if (this.countLines(board[i][j]) === 2 &&
                    !visited.has(i + "," + j)) {
                    let ch = [];
                    if (dfs(i, j, ch) && ch.length >= 3) {
                        chains.push(ch);
                    }
                }
            }
        }
        return chains;
    }

    isCycle(chain, board) {
        return chain.every(pos => this.countLines(board[pos[0]][pos[1]]) === 3);
    }

    closeCycle(board, chain) {
        for (let [r, c] of chain) {
            let cell = board[r][c];
            for (let d = 0; d < 4; d++) {
                if (!(cell & (1 << d))) return [r, c, d];
            }
        }
        return null;
    }

    minimax(board, depth, isMaximizing, alpha, beta, startTime, timeLimit) {
        if (Date.now() - startTime > timeLimit) {
            return this.evaluateBoard(board);
        }

        let moves = this.board.valid_moves(board);
        
        if (depth === 0 || moves.length === 0) {
            return this.evaluateBoard(board);
        }

        let myColor = (this.color === 'R') ? -1 : -2;
        let oppColor = (this.color === 'R') ? -2 : -1;

        if (isMaximizing) {
            let maxScore = -Infinity;
            
            for (let move of moves) {
                let newBoard = this.board.clone(board);
                this.board.move(newBoard, move[0], move[1], move[2], myColor);
                
                let score = this.minimax(newBoard, depth - 1, false, alpha, beta, startTime, timeLimit);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            
            for (let move of moves) {
                let newBoard = this.board.clone(board);
                this.board.move(newBoard, move[0], move[1], move[2], oppColor);
                
                let score = this.minimax(newBoard, depth - 1, true, alpha, beta, startTime, timeLimit);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    findBestMove(board, depth, startTime, timeLimit) {
        let moves = this.board.valid_moves(board);
        let bestMove = moves[0];
        let bestScore = -Infinity;
        let myColor = (this.color === 'R') ? -1 : -2;

        for (let move of moves) {
            if (Date.now() - startTime > timeLimit) {
                break;
            }

            let newBoard = this.board.clone(board);
            this.board.move(newBoard, move[0], move[1], move[2], myColor);
            
            let score = this.minimax(newBoard, depth - 1, false, -Infinity, Infinity, startTime, timeLimit);
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    simpleStrategy(board, moves) {
        let myColor = (this.color === 'R') ? -1 : -2;
        let safeMoves = [];
        let riskyMoves = [];

        for (let move of moves) {
            let cellValue = board[move[0]][move[1]];
            if (this.countLines(cellValue) === 3) {
                return move;
            }
        }

        for (let move of moves) {
            let [i, j, s] = move;
            let testBoard = this.board.clone(board);
            this.board.move(testBoard, i, j, s, myColor);
            
            let creates3Sides = false;
            for (let ti = 0; ti < testBoard.length; ti++) {
                for (let tj = 0; tj < testBoard.length; tj++) {
                    if (this.countLines(testBoard[ti][tj]) === 3) {
                        creates3Sides = true;
                        break;
                    }
                }
                if (creates3Sides) break;
            }
            
            if (!creates3Sides) {
                safeMoves.push(move);
            } else {
                riskyMoves.push(move);
            }
        }

        if (safeMoves.length > 0) {
            for (let move of safeMoves) {
                let cellValue = board[move[0]][move[1]];
                if (this.countLines(cellValue) === 0) {
                    return move;
                }
            }
            
            for (let move of safeMoves) {
                let cellValue = board[move[0]][move[1]];
                if (this.countLines(cellValue) === 1) {
                    return move;
                }
            }
            
            return safeMoves[0];
        }

        return riskyMoves[0];
    }

    compute(board, time) {
        let startTime = Date.now();
        this.turnCount++;
        
        let moves = this.board.valid_moves(board);
        if (moves.length === 0) {
            return [0, 0, 0];
        }

        let totalCells = board.length * board.length;
        let gameProgress = this.turnCount / (totalCells * 2);
        
        let cycleOpportunity = this.detectCycleOpportunity(board);

        if (cycleOpportunity >= 2 && time > 3000 && gameProgress > 0.3) {
            let maxChainTime = Math.min(time * 0.02, 100);
            let chains = this.findChainsLite(board, maxChainTime);
            
            if (chains.length > 0) {
                let cycles = chains.filter(c => this.isCycle(c, board));
                
                if (cycles.length > 0) {
                    let move = this.closeCycle(board, cycles[0]);
                    if (move) return move;
                }
            }
        }

        let timeForThisMove = Math.min(time * 0.04, 400);
        let depth = 3;
        
        if (time < 3000) depth = 2;
        if (time < 1000) depth = 1;
        if (cycleOpportunity >= 6 && time > 5000) depth = 4;
        
        if (time > 2000 && cycleOpportunity >= 3 && moves.length < 50 && gameProgress > 0.2) {
            return this.findBestMove(board, depth, startTime, timeForThisMove);
        } else {
            return this.simpleStrategy(board, moves);
        }
    }
}