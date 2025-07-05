import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private cols = 15;
  private rows = 15;
  private cellSize!: number;
  private grid: Cell[] = [];
  private stack: Cell[] = [];
  private current!: Cell;
  private goal = { x: this.cols - 1, y: this.rows - 1 };
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
    { x: 0, y: -1 }, // cima
    { x: 1, y: 0 },  // direita
    { x: 0, y: 1 },  // baixo
    { x: -1, y: 0 }  // esquerda
  ];
  private pressedKeys: { [key: string]: boolean } = {};
  private isMobile = /Mobi|Android/i.test(navigator.userAgent);

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

    this.setupMaze();
    this.gameLoop();

    if (this.isMobile) {
      window.addEventListener("deviceorientation", this.handleOrientation.bind(this));
    }
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
    this.cellSize = Math.min(canvas.width / this.cols, canvas.height / this.rows);
    this.ball.radius = this.cellSize / 4;
    this.ball.realX = 0;
this.ball.realY = 0;

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
    if (this.stack.length > 0) {
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
  ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

  this.grid.forEach(cell => cell.draw(ctx, this.cellSize));

  // Goal
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(this.goal.x * this.cellSize + this.cellSize / 2, this.goal.y * this.cellSize + this.cellSize / 2, this.cellSize / 4, 0, Math.PI * 2);
  ctx.fill();

  // Ball
  ctx.fillStyle = "black";
  ctx.beginPath();
  // ctx.arc(this.ball.realX + this.cellSize / 2, this.ball.realY + this.cellSize / 2, this.ball.radius, 0, Math.PI * 2);
  ctx.arc(this.ball.realX, this.ball.realY, this.ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

private updateBall(): void {
  // Atualiza posição com velocidade
  this.ball.realX += this.ball.vx;
  this.ball.realY += this.ball.vy;

  // Aplica atrito
  this.ball.vx *= this.ball.friction;
  this.ball.vy *= this.ball.friction;

  const r = this.ball.radius;
  const cellX = Math.floor(this.ball.realX / this.cellSize);
  const cellY = Math.floor(this.ball.realY / this.cellSize);
  const cell = this.grid.find(c => c.x === cellX && c.y === cellY);
  if (!cell) return;

  const px = this.ball.realX % this.cellSize;
  const py = this.ball.realY % this.cellSize;

  // Colisão com paredes
  if (cell.walls[0] && py - r < 0) this.ball.realY = cellY * this.cellSize + r;
  if (cell.walls[2] && py + r > this.cellSize) this.ball.realY = (cellY + 1) * this.cellSize - r;
  if (cell.walls[3] && px - r < 0) this.ball.realX = cellX * this.cellSize + r;
  if (cell.walls[1] && px + r > this.cellSize) this.ball.realX = (cellX + 1) * this.cellSize - r;

  // Verifica colisão com célula da direita
  const rightCell = this.grid.find(c => c.x === cellX + 1 && c.y === cellY);
  if (rightCell?.walls[3] && px + r > this.cellSize) {
    this.ball.realX = (cellX + 1) * this.cellSize - r;
  }

  // Colisão com célula abaixo
  const bottomCell = this.grid.find(c => c.x === cellX && c.y === cellY + 1);
  if (bottomCell?.walls[0] && py + r > this.cellSize) {
    this.ball.realY = (cellY + 1) * this.cellSize - r;
  }

  // Chegou na meta
  if (
    Math.floor(this.ball.realX / this.cellSize) === this.goal.x &&
    Math.floor(this.ball.realY / this.cellSize) === this.goal.y
  ) {
    this.setupMaze();
    this.ball.realX = 0;
    this.ball.realY = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }
}



  private handleOrientation(event: DeviceOrientationEvent): void {
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;

  if (gamma > 5) this.ball.vx += this.ball.speed;
  if (gamma < -5) this.ball.vx -= this.ball.speed;

  if (beta > 15) this.ball.vy += this.ball.speed;
  if (beta < 5) this.ball.vy -= this.ball.speed;
}


  private loopMovement(): void {
  if (this.pressedKeys["ArrowUp"]) this.ball.vy -= this.ball.speed;
  if (this.pressedKeys["ArrowDown"]) this.ball.vy += this.ball.speed;
  if (this.pressedKeys["ArrowLeft"]) this.ball.vx -= this.ball.speed;
  if (this.pressedKeys["ArrowRight"]) this.ball.vx += this.ball.speed;

  requestAnimationFrame(() => this.loopMovement());
}


  private gameLoop(): void {
    this.generateMaze();
    this.updateBall();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
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
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    if (this.walls[0]) this.drawLine(ctx, x, y, x + size, y);
    if (this.walls[1]) this.drawLine(ctx, x + size, y, x + size, y + size);
    if (this.walls[2]) this.drawLine(ctx, x, y + size, x + size, y + size);
    if (this.walls[3]) this.drawLine(ctx, x, y, x, y + size);
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
