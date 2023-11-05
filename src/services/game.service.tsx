import axios from "axios";
import { getAuthToken } from "../utils/auth-token";

export type Generator<T> = { next: () => T };

export type Position = {
  row: number;
  col: number;
};

export type Match<T> = {
  matched: T;
  positions: Position[];
};

// BoardEvent describes the events that can occur on the board
export type BoardEvent<T> =
  | { kind: "Match"; match: Match<T> }
  | { kind: "Refill" };

const API_URL = "http://localhost:9090/";

// API Communication

export function getGames() {
  return axios.get(API_URL + "games", {
    params: {
      ...getAuthToken(),
    },
  });
}

export async function createGame(userId: number) {
  return axios
    .post(
      API_URL + "games",
      {
        user: {
          id: userId,
        },
      },
      {
        params: {
          ...getAuthToken(),
        },
      }
    )
    .then((response: any) => {
      if (response.data.id) {
        localStorage.setItem(`currentGameId`, response.data.id);
      }
      return response.data;
    });
}

export function updateGame(id: number, body: any) {
  axios.patch(
    API_URL + `games/${id}`,
    {
      ...body,
    },
    {
      params: {
        ...getAuthToken(),
      },
    }
  );
}

export function clearCurrent() {
  localStorage.removeItem("currentGameId");
}

export async function getGame(id: number) {
  return axios
    .get(API_URL + `games/${id}`, {
      params: {
        ...getAuthToken(),
      },
    })
    .then((response) => {
      return response.data;
    });
}

// Logic

// BoardListener is a callback that responds to BoardEvent
export type BoardListener<T> = (event: BoardEvent<T>) => void;

export class Board<T> {
  readonly width: number;
  readonly height: number;
  private grid: (T | null)[][];
  private listeners: BoardListener<T>[] = [];
  private generator: Generator<T>;

  constructor(generator: Generator<T>, width: number, height: number) {
    this.generator = generator;
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => generator.next())
    );
  }

  addListener(listener: BoardListener<T>) {
    this.listeners.push(listener);
  }

  private notifyListeners(event: BoardEvent<T>) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  positions(): Position[] {
    const pos: Position[] = [];
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        pos.push({ row: i, col: j });
      }
    }
    return pos;
  }

  // Get the item at a particular position.
  piece(p: Position): T | undefined {
    if (p.row >= 0 && p.row < this.height && p.col >= 0 && p.col < this.width) {
      return this.grid[p.row][p.col]!;
    }
    return undefined;
  }

  // Checks if two positions can be swapped.
  public canMove(first: Position, second: Position): boolean {
    // Inner function to check if a position is out of bounds.
    const outOfBounds = (p: Position) =>
      p.col < 0 || p.col >= this.width || p.row < 0 || p.row >= this.height;

    // Computes the horizontal and vertical distance between two positions.
    const distance = (a: Position, b: Position) => ({
      dx: Math.abs(a.col - b.col),
      dy: Math.abs(a.row - b.row),
    });

    const { dx, dy } = distance(first, second);

    // Check bounds and if swapping the two tiles would result in a match.
    if (outOfBounds(first) || outOfBounds(second) || (dx !== 0 && dy !== 0))
      return false;

    // Temporarily swap the tiles to check for matches.
    [this.grid[first.row][first.col], this.grid[second.row][second.col]] = [
      this.grid[second.row][second.col],
      this.grid[first.row][first.col],
    ];

    const hasMatch = this.checkMatches().length > 0;

    // Swap back the tiles to their original positions.
    [this.grid[first.row][first.col], this.grid[second.row][second.col]] = [
      this.grid[second.row][second.col],
      this.grid[first.row][first.col],
    ];

    return hasMatch;
  }

  // Checks for horizontal and vertical matches on the board.
  private checkMatches(): Match<T>[] {
    const horizontalMatches: Match<T>[] = this.positions()
      .filter(
        (p) =>
          p.col < this.width - 2 &&
          this.grid[p.row][p.col] === this.grid[p.row][p.col + 1] &&
          this.grid[p.row][p.col] === this.grid[p.row][p.col + 2]
      )
      .map((p) => {
        const matchedPiece = this.piece(p);
        if (matchedPiece === undefined) {
          // Handle the undefined case here. You could throw an error, skip the iteration, or provide a fallback value.
          throw new Error("No piece found at the expected position.");
        }
        return {
          matched: matchedPiece,
          positions: [
            p,
            { row: p.row, col: p.col + 1 },
            { row: p.row, col: p.col + 2 },
          ],
        };
      });

    const verticalMatches: Match<T>[] = this.positions()
      .filter(
        (p) =>
          p.row < this.height - 2 &&
          this.grid[p.row][p.col] === this.grid[p.row + 1][p.col] &&
          this.grid[p.row][p.col] === this.grid[p.row + 2][p.col]
      )
      .map((p) => {
        const matchedPiece = this.piece(p);
        if (matchedPiece === undefined) {
          // Handle the undefined case here. You could throw an error, skip the iteration, or provide a fallback value.
          throw new Error("No piece found at the expected position.");
        }
        return {
          matched: matchedPiece,
          positions: [
            p,
            { row: p.row + 1, col: p.col },
            { row: p.row + 2, col: p.col },
          ],
        };
      });

    return [...horizontalMatches, ...verticalMatches];
  }
  // Perform a move by swapping two positions and then checking for matches.
  public move(first: Position, second: Position): void {
    if (!this.canMove(first, second)) return;

    // Swap the tiles
    [this.grid[first.row][first.col], this.grid[second.row][second.col]] = [
      this.grid[second.row][second.col],
      this.grid[first.row][first.col],
    ];

    let matches = this.checkMatches();

    // Process matches until there are none left.
    while (matches.length !== 0) {
      for (const match of matches) {
        this.notifyListeners({ kind: "Match", match });

        for (const position of match.positions) {
          this.grid[position.row][position.col] = null;
        }
      }

      this.fillInEmptyCells();
      this.notifyListeners({ kind: "Refill" });

      matches = this.checkMatches();
    }
  }

  // Fills the empty cells on the board.
  private fillInEmptyCells() {
    // Fill in empty cells with pieces from above
    for (let h = this.height - 1; h >= 0; h--) {
      for (let w = 0; w < this.width; w++) {
        if (!this.piece({ row: h, col: w })) {
          const topPiece = this.getNearestPieceAbove({ row: h, col: w });
          if (topPiece) {
            this.grid[h][w] = topPiece.value;
            this.grid[topPiece.pos.row][topPiece.pos.col] = null as any;
          }
        }
      }
    }

    // Fill in remaining empty cells using the generator
    for (let h = this.height - 1; h >= 0; h--) {
      for (let w = 0; w < this.width; w++) {
        if (!this.piece({ row: h, col: w })) {
          this.grid[h][w] = this.generator.next();
        }
      }
    }
  }

  // Get the nearest piece above a given position.
  private getNearestPieceAbove(
    position: Position,
    r = position.row - 1
  ): { value: T; pos: Position } | null {
    if (r < 0) return null;

    const value = this.grid[r][position.col];
    if (value) {
      return {
        value,
        pos: { row: r, col: position.col },
      };
    }

    return this.getNearestPieceAbove(position, r - 1);
  }
}
