/* ============================================================
   EventSyncEngine — Immersive Animation Layer
   Canvas-based particle universe + DOM tech cursor
   GPU-accelerated, performant, zero globals
   ============================================================ */

(() => {
    'use strict';

    // ─── Utility: throttle via rAF ─────────────────────────
    function rafThrottle(fn) {
        let ticking = false;
        return function (...args) {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => { fn.apply(this, args); ticking = false; });
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    // §1  TECH CURSOR — reticle + particle trail (DOM-based)
    // ═══════════════════════════════════════════════════════
    const cursor = document.createElement('div');
    cursor.className = 'tech-cursor';
    cursor.innerHTML = `
        <div class="cursor-halo"></div>
        <div class="cursor-ring"></div>
        <div class="cursor-ring-inner"></div>
        <div class="cursor-cross-h"></div>
        <div class="cursor-cross-v"></div>
        <div class="cursor-dot"></div>
    `;
    document.body.appendChild(cursor);

    let mouseX = -100, mouseY = -100;
    let cursorX = -100, cursorY = -100;
    const LERP = 0.35; // Increased from 0.15 for smoother/faster response

    // Cursor particle trail
    const CP_SIZE = 30;
    const CP_INTERVAL = 35;
    const cpTypes = ['type-a', 'type-b', 'type-c'];
    let cpPool = [], cpIdx = 0, cpTime = 0, cpPX = 0, cpPY = 0;

    for (let i = 0; i < CP_SIZE; i++) {
        const p = document.createElement('div');
        p.className = 'cursor-particle ' + cpTypes[i % 3];
        p.style.opacity = '0';
        document.body.appendChild(p);
        cpPool.push(p);
    }

    function spawnCursorParticle(x, y) {
        const now = performance.now();
        if (now - cpTime < CP_INTERVAL || Math.hypot(x - cpPX, y - cpPY) < 6) return;
        cpTime = now; cpPX = x; cpPY = y;
        const p = cpPool[cpIdx++ % CP_SIZE];
        const s = 2 + Math.random() * 5;
        p.style.width = s + 'px'; p.style.height = s + 'px';
        p.style.left = (x + (Math.random() - .5) * 20) + 'px';
        p.style.top = (y + (Math.random() - .5) * 20) + 'px';
        p.style.opacity = '0.9'; p.style.transform = 'scale(1)'; p.style.transition = 'none';
        p.offsetHeight;
        p.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
        p.style.opacity = '0';
        p.style.transform = `scale(0) translate(${(Math.random() - .5) * 40}px, ${-15 - Math.random() * 25}px)`;
    }

    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    function animateCursor() {
        cursorX += (mouseX - cursorX) * LERP;
        cursorY += (mouseY - cursorY) * LERP;
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
        if (Math.abs(mouseX - cursorX) > 0.3 || Math.abs(mouseY - cursorY) > 0.3) {
            spawnCursorParticle(cursorX, cursorY);
        }
        requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    const hoverSel = 'a,button,.btn,.tab-btn,.pw-eye,select,[role="button"],.event-card,.stat-chip,.sync-log li,.filter-select,input,textarea,.btn-auth,.auth-card';
    document.addEventListener('mouseover', (e) => { if (e.target.closest(hoverSel)) cursor.classList.add('hovering'); });
    document.addEventListener('mouseout', (e) => { if (e.target.closest(hoverSel)) cursor.classList.remove('hovering'); });
    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });


    // ═══════════════════════════════════════════════════════
    // §2  CANVAS PARTICLE UNIVERSE
    //     • 180 multi-depth particles with constellation lines
    //     • Mouse-reactive (particles repelled by cursor)
    //     • Shooting comets (periodic streaks)
    //     • 3D wireframe geometries (rotating hexagons, triangles)
    //     • Energy pulse waves
    // ═══════════════════════════════════════════════════════

    const canvas = document.createElement('canvas');
    canvas.id = 'particle-universe';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:-5;pointer-events:none;';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Color palette ──────────────────────────────────────
    const CYAN = { r: 34, g: 211, b: 238 };
    const INDIGO = { r: 99, g: 102, b: 241 };
    const VIOLET = { r: 139, g: 92, b: 246 };
    const COLORS = [CYAN, INDIGO, VIOLET];
    function rgba(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }

    // ── §2a. Particles ─────────────────────────────────────
    const PARTICLE_COUNT = 180;
    const CONNECTION_DIST = 120;
    const MOUSE_REPEL_DIST = 160;
    const MOUSE_REPEL_FORCE = 0.8;

    class Particle {
        constructor() { this.reset(true); }
        reset(init) {
            this.x = init ? Math.random() * W : (Math.random() < .5 ? -20 : W + 20);
            this.y = init ? Math.random() * H : (Math.random() < .5 ? -20 : H + 20);
            if (init) {
                this.x = Math.random() * W;
                this.y = Math.random() * H;
            }
            this.depth = 0.3 + Math.random() * 0.7;  // 0.3 = far, 1.0 = near
            this.size = (0.5 + Math.random() * 2.5) * this.depth;
            this.vx = (Math.random() - 0.5) * 0.4 * this.depth;
            this.vy = (Math.random() - 0.5) * 0.4 * this.depth;
            this.color = COLORS[Math.floor(Math.random() * 3)];
            this.alpha = (0.15 + Math.random() * 0.5) * this.depth;
            this.pulseSpeed = 0.005 + Math.random() * 0.015;
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.glowSize = this.size * (2 + Math.random() * 3);
        }
        update(t) {
            // Mouse repulsion
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_REPEL_DIST && dist > 0) {
                const force = (1 - dist / MOUSE_REPEL_DIST) * MOUSE_REPEL_FORCE * this.depth;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }

            // Damping
            this.vx *= 0.98;
            this.vy *= 0.98;

            // Base drift + velocity
            this.x += this.vx;
            this.y += this.vy;

            // Pulse
            this.currentAlpha = this.alpha * (0.6 + 0.4 * Math.sin(t * this.pulseSpeed + this.pulsePhase));

            // Wrap around
            if (this.x < -50) this.x = W + 50;
            if (this.x > W + 50) this.x = -50;
            if (this.y < -50) this.y = H + 50;
            if (this.y > H + 50) this.y = -50;
        }
        draw() {
            // Glow
            ctx.beginPath();
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowSize);
            grad.addColorStop(0, rgba(this.color, this.currentAlpha * 0.6));
            grad.addColorStop(1, rgba(this.color, 0));
            ctx.fillStyle = grad;
            ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = rgba(this.color, this.currentAlpha);
            ctx.fill();
        }
    }

    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    // Draw constellation connections
    function drawConnections() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            for (let j = i + 1; j < PARTICLE_COUNT; j++) {
                const a = particles[i], b = particles[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const opacity = (1 - dist / CONNECTION_DIST) * 0.12 * Math.min(a.depth, b.depth);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = rgba(a.color, opacity);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    // ── §2b. Shooting Comets ───────────────────────────────
    class Comet {
        constructor() { this.reset(); this.active = false; }
        reset() {
            this.active = true;
            this.color = COLORS[Math.floor(Math.random() * 3)];
            // Random edge spawn
            const side = Math.floor(Math.random() * 2);
            if (side === 0) {
                this.x = Math.random() * W;
                this.y = -10;
                this.angle = Math.PI / 4 + Math.random() * Math.PI / 4;
            } else {
                this.x = -10;
                this.y = Math.random() * H * 0.5;
                this.angle = Math.random() * Math.PI / 6;
            }
            this.speed = 4 + Math.random() * 6;
            this.length = 60 + Math.random() * 100;
            this.width = 1 + Math.random() * 2;
            this.life = 1.0;
            this.decay = 0.008 + Math.random() * 0.006;
        }
        update() {
            if (!this.active) return;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life -= this.decay;
            if (this.life <= 0 || this.x > W + 50 || this.y > H + 50) {
                this.active = false;
            }
        }
        draw() {
            if (!this.active) return;
            const tailX = this.x - Math.cos(this.angle) * this.length;
            const tailY = this.y - Math.sin(this.angle) * this.length;
            const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
            grad.addColorStop(0, rgba(this.color, 0));
            grad.addColorStop(0.7, rgba(this.color, this.life * 0.3));
            grad.addColorStop(1, rgba(this.color, this.life * 0.8));
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Head glow
            ctx.beginPath();
            const hg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 8);
            hg.addColorStop(0, rgba(this.color, this.life * 0.6));
            hg.addColorStop(1, rgba(this.color, 0));
            ctx.fillStyle = hg;
            ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const comets = [new Comet(), new Comet(), new Comet()];
    let lastCometTime = 0;

    // ── §2c. 3D Wireframe Geometries ───────────────────────
    class Wireframe {
        constructor() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.rotX = Math.random() * Math.PI * 2;
            this.rotY = Math.random() * Math.PI * 2;
            this.rotZ = Math.random() * Math.PI * 2;
            this.spinX = (Math.random() - 0.5) * 0.008;
            this.spinY = (Math.random() - 0.5) * 0.01;
            this.spinZ = (Math.random() - 0.5) * 0.006;
            this.driftX = (Math.random() - 0.5) * 0.2;
            this.driftY = (Math.random() - 0.5) * 0.15;
            this.scale = 20 + Math.random() * 40;
            this.color = COLORS[Math.floor(Math.random() * 3)];
            this.alpha = 0.06 + Math.random() * 0.1;
            this.type = Math.floor(Math.random() * 3); // 0=hex, 1=tri, 2=diamond
            this.vertices = this._makeVertices();
            this.edges = this._makeEdges();
        }
        _makeVertices() {
            if (this.type === 0) { // Hexagon prism
                const v = [];
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    v.push([Math.cos(a), Math.sin(a), -0.5]);
                    v.push([Math.cos(a), Math.sin(a), 0.5]);
                }
                return v;
            } else if (this.type === 1) { // Octahedron
                return [[0, 1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];
            } else { // Cube
                return [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
            }
        }
        _makeEdges() {
            if (this.type === 0) {
                const e = [];
                for (let i = 0; i < 6; i++) {
                    e.push([i * 2, ((i + 1) % 6) * 2]); // top ring
                    e.push([i * 2 + 1, ((i + 1) % 6) * 2 + 1]); // bottom ring
                    e.push([i * 2, i * 2 + 1]); // verticals
                }
                return e;
            } else if (this.type === 1) {
                return [[0, 1], [0, 2], [0, 3], [0, 4], [5, 1], [5, 2], [5, 3], [5, 4], [1, 2], [2, 3], [3, 4], [4, 1]];
            } else {
                return [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
            }
        }
        _project(v) {
            let [x, y, z] = v;
            // Rotate X
            let y1 = y * Math.cos(this.rotX) - z * Math.sin(this.rotX);
            let z1 = y * Math.sin(this.rotX) + z * Math.cos(this.rotX);
            // Rotate Y
            let x1 = x * Math.cos(this.rotY) + z1 * Math.sin(this.rotY);
            let z2 = -x * Math.sin(this.rotY) + z1 * Math.cos(this.rotY);
            // Rotate Z
            let x2 = x1 * Math.cos(this.rotZ) - y1 * Math.sin(this.rotZ);
            let y2 = x1 * Math.sin(this.rotZ) + y1 * Math.cos(this.rotZ);
            // Perspective
            const perspective = 3;
            const scale = perspective / (perspective + z2);
            return [this.x + x2 * this.scale * scale, this.y + y2 * this.scale * scale];
        }
        update() {
            this.rotX += this.spinX;
            this.rotY += this.spinY;
            this.rotZ += this.spinZ;
            this.x += this.driftX;
            this.y += this.driftY;
            if (this.x < -100) this.x = W + 100;
            if (this.x > W + 100) this.x = -100;
            if (this.y < -100) this.y = H + 100;
            if (this.y > H + 100) this.y = -100;
        }
        draw() {
            ctx.strokeStyle = rgba(this.color, this.alpha);
            ctx.lineWidth = 0.8;
            for (const [a, b] of this.edges) {
                const p1 = this._project(this.vertices[a]);
                const p2 = this._project(this.vertices[b]);
                ctx.beginPath();
                ctx.moveTo(p1[0], p1[1]);
                ctx.lineTo(p2[0], p2[1]);
                ctx.stroke();
            }
            // Vertex dots
            ctx.fillStyle = rgba(this.color, this.alpha * 1.5);
            for (const v of this.vertices) {
                const p = this._project(v);
                ctx.beginPath();
                ctx.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    const wireframes = [];
    const WF_COUNT = 8;
    for (let i = 0; i < WF_COUNT; i++) wireframes.push(new Wireframe());

    // ── §2d. Energy Pulse Waves ────────────────────────────
    class PulseWave {
        constructor() { this.active = false; }
        spawn() {
            this.active = true;
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.radius = 0;
            this.maxRadius = 200 + Math.random() * 200;
            this.speed = 1.5 + Math.random() * 2;
            this.color = COLORS[Math.floor(Math.random() * 3)];
        }
        update() {
            if (!this.active) return;
            this.radius += this.speed;
            if (this.radius > this.maxRadius) this.active = false;
        }
        draw() {
            if (!this.active) return;
            const progress = this.radius / this.maxRadius;
            const alpha = (1 - progress) * 0.15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(this.color, alpha);
            ctx.lineWidth = 1.5 * (1 - progress);
            ctx.stroke();
            // Inner ring
            if (this.radius > 20) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = rgba(this.color, alpha * 0.5);
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    const pulses = [new PulseWave(), new PulseWave(), new PulseWave()];
    let lastPulseTime = 0;

    // ── §2e. Nebula Clouds (large soft gradient blobs) ─────
    class Nebula {
        constructor() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.radius = 150 + Math.random() * 250;
            this.color = COLORS[Math.floor(Math.random() * 3)];
            this.alpha = 0.015 + Math.random() * 0.025;
            this.driftX = (Math.random() - 0.5) * 0.1;
            this.driftY = (Math.random() - 0.5) * 0.08;
            this.pulseSpeed = 0.003 + Math.random() * 0.004;
            this.phase = Math.random() * Math.PI * 2;
        }
        update(t) {
            this.x += this.driftX;
            this.y += this.driftY;
            this.currentAlpha = this.alpha * (0.5 + 0.5 * Math.sin(t * this.pulseSpeed + this.phase));
            if (this.x < -this.radius) this.x = W + this.radius;
            if (this.x > W + this.radius) this.x = -this.radius;
            if (this.y < -this.radius) this.y = H + this.radius;
            if (this.y > H + this.radius) this.y = -this.radius;
        }
        draw() {
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
            grad.addColorStop(0, rgba(this.color, this.currentAlpha));
            grad.addColorStop(0.5, rgba(this.color, this.currentAlpha * 0.4));
            grad.addColorStop(1, rgba(this.color, 0));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    const nebulae = [];
    for (let i = 0; i < 5; i++) nebulae.push(new Nebula());

    // ── MAIN RENDER LOOP ───────────────────────────────────
    let frameCount = 0;

    function render() {
        ctx.clearRect(0, 0, W, H);
        frameCount++;
        const t = performance.now();

        // Layer 1: Nebulae (deepest)
        for (const n of nebulae) { n.update(t); n.draw(); }

        // Layer 2: Wireframes
        for (const w of wireframes) { w.update(); w.draw(); }

        // Layer 3: Particles + connections
        for (const p of particles) { p.update(t); }
        drawConnections();
        for (const p of particles) { p.draw(); }

        // Layer 4: Comets
        if (t - lastCometTime > 4000 + Math.random() * 5000) {
            for (const c of comets) {
                if (!c.active) { c.reset(); lastCometTime = t; break; }
            }
        }
        for (const c of comets) { c.update(); c.draw(); }

        // Layer 5: Energy pulses
        if (t - lastPulseTime > 5000 + Math.random() * 4000) {
            for (const p of pulses) {
                if (!p.active) { p.spawn(); lastPulseTime = t; break; }
            }
        }
        for (const p of pulses) { p.update(); p.draw(); }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);


    // ═══════════════════════════════════════════════════════
    // §3  DASHBOARD-ONLY — card tilt, reveal, parallax
    // ═══════════════════════════════════════════════════════

    const TILT_MAX = 6;
    const hasDashboard = document.querySelector('.event-grid');

    if (hasDashboard) {
        function initTilt(card) {
            if (!card.querySelector('.card-glow')) {
                const g = document.createElement('div'); g.className = 'card-glow';
                card.insertBefore(g, card.firstChild);
            }
            if (!card.querySelector('.light-sweep')) {
                const s = document.createElement('div'); s.className = 'light-sweep';
                card.insertBefore(s, card.firstChild);
            }
            card.addEventListener('mousemove', rafThrottle((e) => {
                const r = card.getBoundingClientRect();
                const x = e.clientX - r.left, y = e.clientY - r.top;
                const cx = r.width / 2, cy = r.height / 2;
                card.style.setProperty('--rx', (((cy - y) / cy) * TILT_MAX).toFixed(2) + 'deg');
                card.style.setProperty('--ry', (((x - cx) / cx) * TILT_MAX).toFixed(2) + 'deg');
                card.style.setProperty('--glow-x', x + 'px');
                card.style.setProperty('--glow-y', y + 'px');
            }));
            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        }

        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); revealObs.unobserve(e.target); } });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        function observeReveal(el) { if (!el.classList.contains('revealed')) revealObs.observe(el); }

        function initAll() {
            document.querySelectorAll('.event-card').forEach(c => { initTilt(c); observeReveal(c); });
            document.querySelectorAll('.sidebar .card.glass').forEach(c => observeReveal(c));
            document.querySelectorAll('.stat-chip').forEach(c => observeReveal(c));
        }

        const gridEl = document.querySelector('.event-grid');
        if (gridEl) {
            new MutationObserver(muts => {
                for (const m of muts) for (const n of m.addedNodes) {
                    if (n.nodeType !== 1) continue;
                    if (n.classList?.contains('event-card')) { initTilt(n); requestAnimationFrame(() => observeReveal(n)); }
                    n.querySelectorAll?.('.event-card').forEach(c => { initTilt(c); requestAnimationFrame(() => observeReveal(c)); });
                }
            }).observe(gridEl, { childList: true, subtree: true });
        }

        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) {
            new MutationObserver(() => {
                statsBar.querySelectorAll('.stat-chip').forEach(c => observeReveal(c));
            }).observe(statsBar, { childList: true, subtree: true });
        }

        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.addEventListener('mousemove', rafThrottle((e) => {
                const r = dashboard.getBoundingClientRect();
                dashboard.style.setProperty('--aura-x', ((e.clientX - r.left) / r.width * 100) + '%');
                dashboard.style.setProperty('--aura-y', ((e.clientY - r.top) / r.height * 100) + '%');
            }));
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
        else requestAnimationFrame(initAll);
    }

})();
