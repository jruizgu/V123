class ToMaJu extends Agent {

    constructor(){
        super()
        this.board = new Board()
    }

    countLines(cellValue){
        var c = 0
        if (cellValue & 1) c++
        if (cellValue & 2) c++
        if (cellValue & 4) c++
        if (cellValue & 8) c++
        return c
    }

    highLineCellsEnough(board){
        let count = 0
        let total = 0
        for (let i = 0; i < board.length; i++){
            for (let j = 0; j < board.length; j++){
                if (board[i][j] >= 0){
                    total++
                    if (this.countLines(board[i][j]) >= 2) count++
                }
            }
        }
        return count >= total / 2
    }

    evaluateBoard(board){
        let score = 0
        let myColor = (this.color == 'R') ? -1 : -2
        let oppColor = (this.color == 'R') ? -2 : -1

        for (let i = 0; i < board.length; i++){
            for (let j = 0; j < board.length; j++){
                let v = board[i][j]
                if (v == myColor) score += 50
                if (v == oppColor) score -= 50

                let lines = this.countLines(v)
                if (lines == 2) score += 5
                if (lines == 0) score += 1
            }
        }
        return score
    }

    minimax(board, depth, isMax, alpha, beta){
        let moves = this.board.valid_moves(board)
        if (depth == 0 || moves.length == 0) return this.evaluateBoard(board)

        if (isMax){
            let max = -Infinity
            for (let m of moves){
                let b2 = this.board.clone(board)
                let myColor = (this.color == 'R') ? -1 : -2
                this.board.move(b2, m[0], m[1], m[2], myColor)
                let s = this.minimax(b2, depth-1, false, alpha, beta)
                if (s > max) max = s
                if (s > alpha) alpha = s
                if (beta <= alpha) break
            }
            return max
        } else {
            let min = Infinity
            for (let m of moves){
                let b2 = this.board.clone(board)
                let oppColor = (this.color == 'R') ? -2 : -1
                this.board.move(b2, m[0], m[1], m[2], oppColor)
                let s = this.minimax(b2, depth-1, true, alpha, beta)
                if (s < min) min = s
                if (s < beta) beta = s
                if (beta <= alpha) break
            }
            return min
        }
    }

    findBestMove(board, depth){
        let moves = this.board.valid_moves(board)
        let best = moves[0]
        let bestScore = -Infinity
        let myColor = (this.color == 'R') ? -1 : -2

        for (let m of moves){
            let b2 = this.board.clone(board)
            this.board.move(b2, m[0], m[1], m[2], myColor)
            let s = this.minimax(b2, depth-1, false, -Infinity, Infinity)
            if (s > bestScore){
                bestScore = s
                best = m
            }
        }
        return best
    }

    findChains(board){
        let visited = new Set()
        let chains = []
        let dirs = [
            {bit: 1, dx: -1, dy: 0},
            {bit: 2, dx: 0, dy: 1},
            {bit: 4, dx: 1, dy: 0},
            {bit: 8, dx: 0, dy: -1}
        ]

        const dfs = (r, c, chain) => {
            let key = r + "," + c
            visited.add(key)
            chain.push([r, c])
            for (let d of dirs){
                if (!(board[r][c] & d.bit)){
                    let nr = r + d.dx
                    let nc = c + d.dy
                    if (nr >= 0 && nr < board.length &&
                        nc >= 0 && nc < board.length &&
                        this.countLines(board[nr][nc]) == 2 &&
                        !visited.has(nr + "," + nc)){
                        dfs(nr, nc, chain)
                    }
                }
            }
        }

        for (let i = 0; i < board.length; i++){
            for (let j = 0; j < board.length; j++){
                if (this.countLines(board[i][j]) == 2 &&
                    !visited.has(i + "," + j)){
                    let ch = []
                    dfs(i, j, ch)
                    if (ch.length >= 3) chains.push(ch)
                }
            }
        }
        return chains
    }

    isCycle(chain, board){
        return chain.every(pos => this.countLines(board[pos[0]][pos[1]]) == 3)
    }

    closeCycle(board, chain){
        for (let [r,c] of chain){
            let cell = board[r][c]
            for (let d = 0; d < 4; d++){
                if (!(cell & (1<<d))) return [r,c,d]
            }
        }
        return null
    }

    extendChain(board, chains){
        let valid = this.board.valid_moves(board)
        for (let ch of chains){
            for (let [r,c] of ch){
                let cell = board[r][c]
                for (let d = 0; d < 4; d++){
                    if (!(cell & (1<<d))){
                        let nr = r + [-1,0,1,0][d]
                        let nc = c + [0,1,0,-1][d]
                        if (nr >= 0 && nr < board.length &&
                            nc >= 0 && nc < board.length){
                            if (this.countLines(board[nr][nc]) < 2){
                                return [r,c,d]
                            }
                        }
                    }
                }
            }
        }
        return null
    }

    simpleMove(board){
        let m = this.board.valid_moves(board)
        return m[0]
    }

    compute(board, time){
        let moves = this.board.valid_moves(board)
        if (moves.length == 0) return [0,0,0]

        let chains = this.findChains(board)
        let cycles = chains.filter(c => this.isCycle(c, board))

        if (cycles.length > 0){
            let m = this.closeCycle(board, cycles[0])
            if (m) return m
        }

        if (chains.length > 0){
            let m = this.extendChain(board, chains)
            if (m) return m
        }

        if (this.highLineCellsEnough(board)){
            let depth = 4
            if (time < 5000) depth = 2
            if (time < 2000) depth = 1
            console.log("MINIMAX", depth)
            return this.findBestMove(board, depth)
        }

        return this.simpleMove(board)
    }
}
