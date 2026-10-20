import { useEffect, useRef } from 'react';

/**
 * Ein Punktgitter: links Ordnung (ein festes Raster, in dem man zu Hause ist),
 * nach rechts löst es sich auf. Das Bild erzählt die Dramaturgie der Reise.
 * Reagiert sacht auf Zeiger und Scrollen; ohne Bewegung bei reduzierter Animation.
 */
export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let pointer = { x: -999, y: -999 };
    let scroll = 0;

    type Dot = { gx: number; gy: number; sx: number; sy: number; ph: number; s: number };
    let dots: Dot[] = [];

    const rnd = (() => {
      let a = 1337;
      return () => {
        a = (a * 1664525 + 1013904223) % 4294967296;
        return a / 4294967296;
      };
    })();

    const build = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const gap = w < 640 ? 34 : 44;
      const cols = Math.ceil(w / gap) + 1;
      const rows = Math.ceil(h / gap) + 1;
      dots = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            gx: i * gap,
            gy: j * gap,
            sx: (rnd() - 0.5) * 2,
            sy: (rnd() - 0.5) * 2,
            ph: rnd() * Math.PI * 2,
            s: 0.6 + rnd() * 0.8,
          });
        }
      }
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const fg = getComputedStyle(canvas).color;
      // Wie weit ist die Ordnung schon zerfallen? Beginnt bei ~35 % der Breite, wächst mit dem Scrollen.
      const edge = 0.3 + Math.min(0.5, scroll / 900);
      for (const d of dots) {
        const x01 = d.gx / w;
        const chaos = Math.max(0, (x01 - edge) / (1 - edge + 0.001));
        const k = chaos * chaos * (3 - 2 * chaos);
        const drift = reduce ? 0 : Math.sin(t / 1800 + d.ph) * (1 + k * 3);
        const x = d.gx + d.sx * k * 70 + drift * k * 3;
        const y = d.gy + d.sy * k * 70 + (reduce ? 0 : Math.cos(t / 2100 + d.ph) * k * 3);
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / 140);
        const r = (1.1 + near * 2.2) * (1 - k * 0.25) * d.s;
        const a = (0.18 + near * 0.55) * (1 - k * 0.45) + (k > 0.1 ? 0.04 : 0);
        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(tick);
    };

    build();
    const onResize = () => {
      build();
      if (reduce) draw(0);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onScroll = () => {
      scroll = window.scrollY;
      if (reduce) draw(0);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    if (reduce) draw(0);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <canvas ref={ref} className="hero-field" aria-hidden="true" />;
}
