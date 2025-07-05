import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private cols = 15;
  private rows = 15;
  private cellSize!: number;

  private grid: any[] = [];
  private stack: any[] = [];
  private current: any;
  private goal = { x: this.cols - 1, y: this.rows - 1 };
  private ball = { x: 0, y: 0, radius: 0, targetX: 0, targetY: 0, speed: 0.1 };

  private directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();

    window.addEventListener('resize', this.resizeCanvas.bind(this));
    window.addEventListener('devicemotion', this.handleMotion.bind(this));

    this.setupMaze();
    this.gameLoop();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    this.moveBall(event.key);
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
    this.cellSize = Math.min(canvas.width / this.cols, canvas.height / this.rows);
    this.ball.radius = this.cellSize / 4;

    if (/Mobi|Android/i.test(navigator.userAgent)) {
      this.ball.speed = 0.1;
    }
  }

  // Classe da célula
  private Cell = class {
    visited = false;
    walls = [true, true, true, true];
    constructor(public x: number, public y: number, private ctx: CanvasRenderingContext2D, private cellSize: number) {}
    draw() {
      const x = this.x * this.cellSize;
      const y = this.y * this.cellSize;
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      if (this.walls[0]) this.drawLine(x, y, x + this.cellSize, y);
      if (this.walls[1]) this.drawLine(x + this.cellSize, y, x + this.cellSize, y + this.cellSize);
      if (this.walls[2]) this.drawLine(x, y + this.cellSize, x + this.cellSize, y + this.cellSize);
      if (this.walls[3]) this.drawLine(x, y, x, y + this.cellSize);
    }
    drawLine(x1: number, y1: number, x2: number, y2: number) {
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  };

  private setupMaze() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid.push(new this.Cell(x, y, this.ctx, this.cellSize));
      }
    }
    this.current = this.grid[0];
    this.current.visited = true;
    this.stack.push(this.current);
  }

  private getNeighbors(cell: any) {
    const neighbors: any[] = [];
    this.directions.forEach((dir, index) => {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      const neighbor = this.grid.find(c => c.x === nx && c.y === ny);
      if (neighbor && !neighbor.visited) {
        neighbors.push({ neighbor, index });
      }
    });
    return neighbors;
  }

  private generateMaze() {
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
        this.current = this.stack.pop();
      }
    }
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.grid.forEach(cell => cell.draw());
    // Red
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(this.goal.x * this.cellSize + this.cellSize / 2, this.goal.y * this.cellSize + this.cellSize / 2, this.cellSize / 4, 0, Math.PI * 2);
    this.ctx.fill();
    // Blue
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x * this.cellSize + this.cellSize / 2, this.ball.y * this.cellSize + this.cellSize / 2, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private moveBall(direction: string) {
    let newX = this.ball.x;
    let newY = this.ball.y;
    if (direction === 'ArrowUp' || direction === 'up') newY--;
    if (direction === 'ArrowDown' || direction === 'down') newY++;
    if (direction === 'ArrowLeft' || direction === 'left') newX--;
    if (direction === 'ArrowRight' || direction === 'right') newX++;

    const currentCell = this.grid.find(c => c.x === this.ball.x && c.y === this.ball.y);
    const targetCell = this.grid.find(c => c.x === newX && c.y === newY);
    const directionIndex = this.directions.findIndex(d => d.x === newX - this.ball.x && d.y === newY - this.ball.y);

    if (targetCell && !currentCell.walls[directionIndex]) {
      this.ball.x = newX;
      this.ball.y = newY;
    }

    if (this.ball.x === this.goal.x && this.ball.y === this.goal.y) {
      this.setupMaze();
      this.ball.x = 0;
      this.ball.y = 0;
    }
  }

  private handleMotion(event: DeviceMotionEvent) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const { x, y } = acc;
    if (Math.abs(x!) > Math.abs(y!)) {
      this.moveBall(x! > 0 ? 'ArrowLeft' : 'ArrowRight');
    } else {
      this.moveBall(y! > 0 ? 'ArrowDown' : 'ArrowUp');
    }
  }

  private gameLoop() {
    this.generateMaze();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}
