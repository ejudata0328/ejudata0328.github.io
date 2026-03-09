/**
 * Hero Particle Network Animation
 * AI/Tech 느낌의 노드 네트워크 파티클 애니메이션
 */
(function () {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouse = { x: null, y: null };
    var PARTICLE_COUNT = 80;
    var CONNECT_DIST = 150;
    var MOUSE_DIST = 200;
    var animId;

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    function Particle() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.3;
    }

    Particle.prototype.update = function () {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse interaction - gentle attraction
        if (mouse.x !== null) {
            var dx = mouse.x - this.x;
            var dy = mouse.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_DIST) {
                this.vx += dx * 0.00005;
                this.vy += dy * 0.00005;
            }
        }

        // Speed limit
        var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1) {
            this.vx *= 0.99;
            this.vy *= 0.99;
        }
    };

    Particle.prototype.draw = function () {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 180, 255, ' + this.opacity + ')';
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 180, 255, ' + (this.opacity * 0.1) + ')';
        ctx.fill();
    };

    function init() {
        resize();
        particles = [];
        var count = Math.min(PARTICLE_COUNT, Math.floor(canvas.width * canvas.height / 12000));
        for (var i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DIST) {
                    var opacity = (1 - dist / CONNECT_DIST) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(100, 180, 255, ' + opacity + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }

            // Mouse connections
            if (mouse.x !== null) {
                var mdx = particles[i].x - mouse.x;
                var mdy = particles[i].y - mouse.y;
                var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < MOUSE_DIST) {
                    var mopacity = (1 - mdist / MOUSE_DIST) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = 'rgba(150, 210, 255, ' + mopacity + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw floating grid lines (subtle)
        drawGrid();

        for (var i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        connectParticles();

        animId = requestAnimationFrame(animate);
    }

    var gridOffset = 0;
    function drawGrid() {
        gridOffset += 0.15;
        if (gridOffset > 60) gridOffset = 0;

        ctx.strokeStyle = 'rgba(100, 180, 255, 0.03)';
        ctx.lineWidth = 0.5;

        var spacing = 60;
        for (var x = -spacing + gridOffset; x < canvas.width + spacing; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (var y = -spacing + gridOffset; y < canvas.height + spacing; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    canvas.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', function () {
        mouse.x = null;
        mouse.y = null;
    });

    window.addEventListener('resize', function () {
        resize();
        // Reposition particles within new bounds
        for (var i = 0; i < particles.length; i++) {
            if (particles[i].x > canvas.width) particles[i].x = Math.random() * canvas.width;
            if (particles[i].y > canvas.height) particles[i].y = Math.random() * canvas.height;
        }
    });

    init();
    animate();
})();
