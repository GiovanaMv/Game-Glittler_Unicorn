import {
  Component,
  AfterViewInit,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private cols = 15;
  private rows = 15;
  private cellSize!: number;
  private grid: Cell[] = [];
  private stack: Cell[] = [];
  private current!: Cell;
  private goal = { x: this.cols - 1, y: this.rows - 1 };

  private ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 0, speed: 2 };

  directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  // ngAfterViewInit() {
  //   this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  //   this.ctx = this.canvas.getContext('2d')!;
  //   this.resizeCanvas();
  //   this.setupMaze();
  //   this.gameLoop();
  //   window.addEventListener('resize', () => this.resizeCanvas());
  //   window.addEventListener('devicemotion', (event) =>
  //     this.handleMotion(event)
  //   );
  // }

  ngAfterViewInit() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.setupMaze();
    this.gameLoop();

    window.addEventListener('resize', () => this.resizeCanvas());

    // ADICIONAR ISSO:
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      alert('Toque na tela para ativar os sensores de movimento.');
    }

    window.addEventListener('devicemotion', (event) =>
      this.handleMotion(event)
    );
  }

  resizeCanvas() {
    const size = Math.min(window.innerWidth, window.innerHeight); // usa o menor dos dois
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = size / this.cols;
    this.ball.radius = this.cellSize / 4;
  }

  setupMaze() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid.push(new Cell(x, y));
      }
    }
    this.current = this.grid[0];
    this.current.visited = true;
    this.stack = [this.current];
  }

  getNeighbors(cell: Cell) {
    let neighbors: { neighbor: Cell; index: number }[] = [];
    this.directions.forEach((dir, index) => {
      const nx = cell.x + dir.x;
      const ny = cell.y + dir.y;
      const neighbor = this.grid.find((c) => c.x === nx && c.y === ny);
      if (neighbor && !neighbor.visited) {
        neighbors.push({ neighbor, index });
      }
    });
    return neighbors;
  }

  generateMaze() {
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

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.grid.forEach((cell) => cell.draw(this.ctx, this.cellSize));
    // Draw goal
    this.ctx.fillStyle = 'red';
    this.ctx.beginPath();
    this.ctx.arc(this.goal.x * this.cellSize + this.cellSize / 2, this.goal.y * this.cellSize + this.cellSize / 2, this.cellSize / 4, 0, Math.PI * 2);
    this.ctx.fill();
    // Draw ball
    this.ctx.fillStyle = 'blue';
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x * this.cellSize + this.cellSize / 2, this.ball.y * this.cellSize + this.cellSize / 2, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }



  @HostListener('document:click')
  handleClick() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', this.handleMotion.bind(this));
            alert('Sensores ativados!');
          } else {
            alert('Permissão para sensores negada.');
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', this.handleMotion.bind(this));
    }
  }


  moveBall(direction: string) {
    let newX = this.ball.x;
    let newY = this.ball.y;
    if (direction === 'ArrowUp') newY--;
    if (direction === 'ArrowDown') newY++;
    if (direction === 'ArrowLeft') newX--;
    if (direction === 'ArrowRight') newX++;

    const currentCell = this.grid.find((c) => c.x === this.ball.x && c.y === this.ball.y)!;
    const dirIndex = this.directions.findIndex(d => d.x === (newX - this.ball.x) && d.y === (newY - this.ball.y));
    const targetCell = this.grid.find((c) => c.x === newX && c.y === newY);

    if (targetCell && !currentCell.walls[dirIndex]) {
      this.ball.x = newX;
      this.ball.y = newY;
    }

    if (this.ball.x === this.goal.x && this.ball.y === this.goal.y) {
      this.setupMaze();
      this.ball.x = 0;
      this.ball.y = 0;
    }
  }

  handleMotion(event: DeviceMotionEvent) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    this.ball.vx = -(acc.x ?? 0) * this.ball.speed * 0.5;
    this.ball.vy = (acc.y ?? 0) * this.ball.speed * 0.5;


    // this.ball.vx = (acc.x ?? 0) * this.ball.speed;
    // this.ball.vy = -(acc.y ?? 0) * this.ball.speed;
  }

  updateBallPosition() {
  const nextX = this.ball.x + this.ball.vx * 0.098;
  const nextY = this.ball.y + this.ball.vy * 0.098;

  const currentCell = this.grid.find(c =>
    Math.floor(this.ball.x) === c.x && Math.floor(this.ball.y) === c.y
  );

  if (!currentCell) return;

  // Controle para impedir que passe pelas paredes horizontalmente
  if (this.ball.vx > 0 && currentCell.walls[1]) {
    if (Math.floor(nextX + 0.3) > currentCell.x) {
      this.ball.vx = 0;
    } else {
      this.ball.x = nextX;
    }
  } else if (this.ball.vx < 0 && currentCell.walls[3]) {
    if (Math.floor(nextX - 0.3) < currentCell.x) {
      this.ball.vx = 0;
    } else {
      this.ball.x = nextX;
    }
  } else {
    this.ball.x = nextX;
  }

  // Controle para impedir que passe pelas paredes verticalmente
  if (this.ball.vy > 0 && currentCell.walls[2]) {
    if (Math.floor(nextY + 0.3) > currentCell.y) {
      this.ball.vy = 0;
    } else {
      this.ball.y = nextY;
    }
  } else if (this.ball.vy < 0 && currentCell.walls[0]) {
    if (Math.floor(nextY - 0.3) < currentCell.y) {
      this.ball.vy = 0;
    } else {
      this.ball.y = nextY;
    }
  } else {
    this.ball.y = nextY;
  }

  // Limites do canvas
  this.ball.x = Math.max(0, Math.min(this.cols - 1, this.ball.x));
  this.ball.y = Math.max(0, Math.min(this.rows - 1, this.ball.y));

  // Chegou no final?
  if (Math.floor(this.ball.x) === this.goal.x && Math.floor(this.ball.y) === this.goal.y) {
    this.setupMaze();
    this.ball.x = 0;
    this.ball.y = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }
}

  gameLoop() {
    this.generateMaze();
    this.updateBallPosition();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    this.moveBall(event.key);
  }
}

// Classe Cell como TypeScript
class Cell {
  visited = false;
  walls = [true, true, true, true];

  constructor(public x: number, public y: number) { }

  draw(ctx: CanvasRenderingContext2D, size: number) {
    const x = this.x * size;
    const y = this.y * size;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    if (this.walls[0]) this.drawLine(ctx, x, y, x + size, y); // top
    if (this.walls[1]) this.drawLine(ctx, x + size, y, x + size, y + size); // right
    if (this.walls[2]) this.drawLine(ctx, x, y + size, x + size, y + size); // bottom
    if (this.walls[3]) this.drawLine(ctx, x, y, x, y + size); // left
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
