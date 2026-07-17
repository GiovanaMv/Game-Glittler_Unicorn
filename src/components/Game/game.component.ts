import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true
})
export class GameComponent implements OnInit, AfterViewInit {

  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  private cols = 10;
  private rows = 10;
  private cellSize!: number;
  private grid: Cell[] = [];
  private stack: Cell[] = [];
  private current!: Cell;
  private goal = { x: 0, y: 0 };

  private readonly SENSITIVITY = 0.12; // Quanto menor, mais sensível
  private readonly DEAD_ZONE = 3; // Zona morta para evitar tremores
  private readonly MAX_SPEED = 3.5; // Velocidade máxima

  private ball = {
    realX: 0,
    realY: 0,
    radius: 0,
    vx: 0,
    vy: 0,
    speed: 0.4,
    friction: 0.9,
  };

  private directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  private pressedKeys: { [key: string]: boolean } = {};
  private isMobile = /Mobi|Android/i.test(navigator.userAgent);
  private animationId: any;
  private isLevelComplete: boolean = false;
  private timerStarted: boolean = false;

  currentLevel: number = 0;
  maxLevels: number = 10;

  timerPercentage: number = 100;
  timerDisplay: string = '30s';
  private maxTime: number = 30;
  private currentTime: number = 30;
  private timerInterval: any;

  gameOver: boolean = false;
  gameOverMessage: string = '';

  private levelConfigs = [
    { cols: 8, rows: 8, time: 30 },
    { cols: 9, rows: 9, time: 30 },
    { cols: 10, rows: 10, time: 30 },
    { cols: 11, rows: 11, time: 25 },
    { cols: 12, rows: 12, time: 25 },
    { cols: 13, rows: 13, time: 25 },
    { cols: 14, rows: 14, time: 20 },
    { cols: 15, rows: 15, time: 20 },
    { cols: 16, rows: 16, time: 20 },
    { cols: 18, rows: 18, time: 15 }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    document.addEventListener("keydown", (e) => this.pressedKeys[e.key] = true);
    document.addEventListener("keyup", (e) => this.pressedKeys[e.key] = false);
    this.loopMovement();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext("2d")!;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.startLevel();
    this.gameLoop();

    if (this.isMobile) {
      window.addEventListener("deviceorientation", this.handleOrientation.bind(this));
    }
  }

  private startLevel(): void {
    const config = this.levelConfigs[this.currentLevel];
    this.cols = config.cols;
    this.rows = config.rows;
    this.maxTime = config.time;
    this.currentTime = this.maxTime;
    this.gameOver = false;
    this.isLevelComplete = false;
    this.timerStarted = false;
    this.timerPercentage = 100;
    this.timerDisplay = `${this.maxTime}s`;

    this.goal = { x: this.cols - 1, y: this.rows - 1 };
    this.resizeCanvas();
    this.setupMaze();

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.cdr.detectChanges();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const isMobile = window.innerWidth <= 768;

    let maxWidth = isMobile ? window.innerWidth * 0.95 : window.innerWidth * 0.85;
    let maxHeight = isMobile ? window.innerHeight * 0.7 : window.innerHeight * 0.8;

    if (isMobile) {
      canvas.width = Math.min(maxWidth, maxHeight * (this.cols / this.rows));
      canvas.height = Math.min(maxHeight, maxWidth * (this.rows / this.cols));
    } else {
      canvas.width = Math.min(maxWidth, maxHeight * (this.cols / this.rows));
      canvas.height = Math.min(maxHeight, maxWidth * (this.rows / this.cols));
    }

    this.cellSize = Math.min(canvas.width / this.cols, canvas.height / this.rows);
    this.ball.radius = this.cellSize / 4;
    this.ball.realX = this.cellSize / 2;
    this.ball.realY = this.cellSize / 2;
  }

  private setupMaze(): void {
    this.grid = [];
    this.stack = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid.push(new Cell(x, y));
      }
    }
    this.current = this.grid[0];
    this.current.visited = true;
    this.stack.push(this.current);

    this.ball.realX = this.cellSize / 2;
    this.ball.realY = this.cellSize / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (!this.gameOver) {
        this.currentTime -= 0.1;
        this.timerPercentage = (this.currentTime / this.maxTime) * 100;

        if (this.timerPercentage < 0) {
          this.timerPercentage = 0;
        }

        this.timerDisplay = `${Math.ceil(this.currentTime)}s`;
        this.cdr.detectChanges();

        if (this.currentTime <= 0) {
          this.gameOver = true;
          this.gameOverMessage = 'Tempo Esgotado!';
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.cdr.detectChanges();
        }
      }
    }, 100);
  }

  private getNeighbors(cell: Cell): { neighbor: Cell, index: number }[] {
    const neighbors: { neighbor: Cell, index: number }[] = [];
    this.directions.forEach((dir, i) => {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      const neighbor = this.grid.find(c => c.x === nx && c.y === ny);
      if (neighbor && !neighbor.visited) {
        neighbors.push({ neighbor, index: i });
      }
    });
    return neighbors;
  }

  private generateMaze(): void {
    if (this.stack.length > 0 && !this.gameOver) {
      const neighbors = this.getNeighbors(this.current);
      if (neighbors.length > 0) {
        const { neighbor, index } = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.current.walls[index] = false;
        neighbor.walls[(index + 2) % 4] = false;
        neighbor.visited = true;
        this.stack.push(neighbor);
        this.current = neighbor;
      } else {
        this.current = this.stack.pop()!;
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.grid.forEach(cell => cell.draw(ctx, this.cellSize));

    ctx.fillStyle = "white";
    ctx.shadowColor = "white";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      this.goal.x * this.cellSize + this.cellSize / 2,
      this.goal.y * this.cellSize + this.cellSize / 2,
      this.cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#000000";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.ball.realX, this.ball.realY, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(this.ball.realX - this.ball.radius/3, this.ball.realY - this.ball.radius/3, this.ball.radius/3, 0, Math.PI * 2);
    ctx.fill();
  }

  private updateBall(): void {
    if (this.gameOver) return;

    const isMoving = Math.abs(this.ball.vx) > 0.01 || Math.abs(this.ball.vy) > 0.01;

    if (isMoving && !this.timerStarted && !this.gameOver) {
      this.timerStarted = true;
      this.startTimer();
    }

    this.ball.realX += this.ball.vx;
    this.ball.realY += this.ball.vy;
    this.ball.vx *= this.ball.friction;
    this.ball.vy *= this.ball.friction;

    const maxSpeed = 4;
    this.ball.vx = Math.max(-maxSpeed, Math.min(this.ball.vx, maxSpeed));
    this.ball.vy = Math.max(-maxSpeed, Math.min(this.ball.vy, maxSpeed));

    const r = this.ball.radius;
    const cellX = Math.floor(this.ball.realX / this.cellSize);
    const cellY = Math.floor(this.ball.realY / this.cellSize);
    const cell = this.grid.find(c => c.x === cellX && c.y === cellY);
    if (!cell) return;

    const px = this.ball.realX % this.cellSize;
    const py = this.ball.realY % this.cellSize;

    if (cell.walls[0] && py - r < 0) this.ball.realY = cellY * this.cellSize + r;
    if (cell.walls[2] && py + r > this.cellSize) this.ball.realY = (cellY + 1) * this.cellSize - r;
    if (cell.walls[3] && px - r < 0) this.ball.realX = cellX * this.cellSize + r;
    if (cell.walls[1] && px + r > this.cellSize) this.ball.realX = (cellX + 1) * this.cellSize - r;

    const rightCell = this.grid.find(c => c.x === cellX + 1 && c.y === cellY);
    if (rightCell?.walls[3] && px + r > this.cellSize) {
      this.ball.realX = (cellX + 1) * this.cellSize - r;
    }

    const bottomCell = this.grid.find(c => c.x === cellX && c.y === cellY + 1);
    if (bottomCell?.walls[0] && py + r > this.cellSize) {
      this.ball.realY = (cellY + 1) * this.cellSize - r;
    }

    if (
      !this.isLevelComplete &&
      Math.floor(this.ball.realX / this.cellSize) === this.goal.x &&
      Math.floor(this.ball.realY / this.cellSize) === this.goal.y
    ) {
      this.isLevelComplete = true;
      this.levelComplete();
    }
  }

  private levelComplete(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.currentLevel < this.maxLevels - 1) {
      this.gameOverMessage = `Fase ${this.currentLevel + 1}/${this.maxLevels} Completa!`;
      this.gameOver = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.currentLevel++;
        this.startLevel();
        this.gameOver = false;
        this.cdr.detectChanges();
      }, 1200);
    } else {
      this.gameOverMessage = 'Você VENCEU o Jogo!';
      this.gameOver = true;
      this.cdr.detectChanges();
    }
  }

  resetGame(): void {
    this.currentLevel = 0;
    this.gameOver = false;
    this.isLevelComplete = false;
    this.timerStarted = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.startLevel();
    this.cdr.detectChanges();
  }

   private handleOrientation(event: DeviceOrientationEvent): void {
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    if (Math.abs(gamma) > this.DEAD_ZONE) {
      this.ball.vx += gamma * this.SENSITIVITY;
    }

    if (Math.abs(beta) > this.DEAD_ZONE) {
      this.ball.vy += beta * this.SENSITIVITY;
    }

    this.ball.vx = Math.max(-this.MAX_SPEED, Math.min(this.ball.vx, this.MAX_SPEED));
    this.ball.vy = Math.max(-this.MAX_SPEED, Math.min(this.ball.vy, this.MAX_SPEED));
  }

  private loopMovement(): void {
    if (this.pressedKeys["ArrowUp"]) this.ball.vy -= this.ball.speed;
    if (this.pressedKeys["ArrowDown"]) this.ball.vy += this.ball.speed;
    if (this.pressedKeys["ArrowLeft"]) this.ball.vx -= this.ball.speed;
    if (this.pressedKeys["ArrowRight"]) this.ball.vx += this.ball.speed;

    requestAnimationFrame(() => this.loopMovement());
  }

  private gameLoop(): void {
    if (!this.gameOver) {
      this.generateMaze();
      this.updateBall();
    }
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

class Cell {
  x: number;
  y: number;
  visited: boolean = false;
  walls: boolean[] = [true, true, true, true];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D, size: number): void {
    const x = this.x * size;
    const y = this.y * size;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(255,255,255,0.2)";
    ctx.shadowBlur = 5;

    if (this.walls[0]) this.drawLine(ctx, x, y, x + size, y);
    if (this.walls[1]) this.drawLine(ctx, x + size, y, x + size, y + size);
    if (this.walls[2]) this.drawLine(ctx, x, y + size, x + size, y + size);
    if (this.walls[3]) this.drawLine(ctx, x, y, x, y + size);

    ctx.shadowBlur = 0;
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
