import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

@Component({
  selector: 'app-particle-background',
  templateUrl: './particle-background.component.html',
  styleUrls: ['./particle-background.component.scss']
})
export class ParticleBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId!: number;
  private mouse = { x: 0, y: 0 };
  private isMouseMoving = false;
  private mouseTimeout!: number;

  private readonly PARTICLE_COUNT = 80;
  private readonly MAX_DISTANCE = 120;
  private readonly MOUSE_INFLUENCE = 50;

  ngOnInit() {
    this.initCanvas();
    this.createParticles();
    this.animate();
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }
  }

  private initCanvas() {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  private createParticles() {
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        hue: Math.random() * 60 + 200 // Blue to purple range
      });
    }
  }

  private animate = () => {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.updateParticles();
    this.drawParticles();
    this.drawConnections();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateParticles() {
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce off edges
      if (particle.x < 0 || particle.x > window.innerWidth) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > window.innerHeight) {
        particle.vy *= -1;
      }

      // Mouse interaction
      if (this.isMouseMoving) {
        const dx = particle.x - this.mouse.x;
        const dy = particle.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.MOUSE_INFLUENCE) {
          const force = (this.MOUSE_INFLUENCE - distance) / this.MOUSE_INFLUENCE;
          particle.vx += (dx / distance) * force * 0.01;
          particle.vy += (dy / distance) * force * 0.01;
        }
      }

      // Add slight random movement
      particle.vx += (Math.random() - 0.5) * 0.01;
      particle.vy += (Math.random() - 0.5) * 0.01;

      // Dampen velocity
      particle.vx *= 0.99;
      particle.vy *= 0.99;
    });
  }

  private drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

      // Create gradient for glow effect
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      );
      gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 60%, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      // Add inner bright core
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${particle.hue}, 80%, 70%, ${particle.opacity * 1.5})`;
      this.ctx.fill();
    });
  }

  private drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.MAX_DISTANCE) {
          const opacity = (this.MAX_DISTANCE - distance) / this.MAX_DISTANCE * 0.3;
          const hue = (p1.hue + p2.hue) / 2;

          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
    this.isMouseMoving = true;

    if (this.mouseTimeout) {
      clearTimeout(this.mouseTimeout);
    }

    this.mouseTimeout = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 100);
  }
}
