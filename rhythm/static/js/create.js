let Util = new function () {
    this.random = function (a, b) {
        return Math.random() * (b - a) + a;
    }
};

let CreateMode = new function () {

    const N_ROWS = 3;
    const N_COLS = 7;
    const N_CHORDS = N_COLS * N_ROWS;
    const N_CHANNELS = Math.ceil(N_CHORDS / 2);
    const WORLD_RECT = {
        x: 0,
        y: 0,
        width: 810,
        height: 540
    };
    const PAUSE_TEXT = 'Pause';
    const CONTINUE_TEXT = 'Continue';

    let canvas;
    let context;
    let audioChords;
    let audioChannels = [];

    let canvasLeft;
    let canvasTop;
    let paused = false;
    let mouseIsDown = false;
    let mouseX;
    let mouseY;

    let points = [];
    let bullet;
    let bulletSpeed;

    this.init = function () {
        canvas = document.getElementById('world');
        canvasLeft = (window.innerWidth - WORLD_RECT.width) * .5;
        canvasTop = (window.innerHeight - WORLD_RECT.height) * .5;

        if (canvas && canvas.getContext) {
            audioChords = $('audio').toArray();
            for (let i = 0; i < N_CHANNELS; ++i) {
                audioChannels.push(new Audio(''));
            }
            context = canvas.getContext('2d');
            // Mouse Events
            document.addEventListener('mousemove', updateMouseCoordinate, false);
            document.addEventListener('mousedown', dragPoint, false);
            document.addEventListener('mouseup', putPoint, false);
            canvas.addEventListener('dblclick', drawPoints, false);
            // Button onclick listener
            $('#reset-btn').click(resetWorld);
            $('#pause-btn').click(pauseHandler);
            // Other events
            window.addEventListener('resize', resetCanvasAttr, false);

            bullet = new Bullet();
            bulletSpeed = 2;

            resetCanvasAttr();

            setInterval(loop, 40);
        }
    };

    function drawPoints(event) {
        event.preventDefault();
        mouseIsDown = true;

        updateMouseCoordinate(event);
        createPointAt(mouseX, mouseY);

        updateHashRecord();
    }

    function resetCanvasAttr() {
        canvas.width = WORLD_RECT.width;
        canvas.height = WORLD_RECT.height;

        canvasLeft = (window.innerWidth - canvas.width) * .5;
        canvasTop = (window.innerHeight - canvas.height) * .5;

        canvas.style.position = 'absolute';
        canvas.style.left = canvasLeft + 'px';
        canvas.style.top = canvasTop + 'px';
    }

    function dragPoint(event) {
        event.preventDefault();
        mouseIsDown = true;
        updateMouseCoordinate(event);
        startDragging();
    }

    function putPoint(event) {
        event.preventDefault();
        mouseIsDown = false;
        stopDragging();
        updateHashRecord();
    }

    function resetWorld() {
        paused = true;
        points = [];
        updateHashRecord();
        paused = false;
        $('#pause-btn').html(PAUSE_TEXT);
    }

    function pauseHandler() {
        let btn = $('#pause-btn');
        paused = !paused;
        if (paused) {
            btn.html(CONTINUE_TEXT);
        } else {
            btn.html(PAUSE_TEXT);
        }
    }

    function updateMouseCoordinate(event) {
        mouseX = event.clientX - canvasLeft;
        mouseY = event.clientY - canvasTop;
    }

    function createPointAt(x, y) {
        let point = new Point();
        point.coordinate.x = x;
        point.coordinate.y = y;
        points.push(point);
    }

    function updateHashRecord() {
        let history = $('#history');
        let hash = [];
        for (let i = 0; i < points.length; ++i) {
            let h = Math.round((points[i].coordinate.x / WORLD_RECT.width) * 1000) + 'x' + Math.round((points[i].coordinate.y / WORLD_RECT.height) * 1000);
            hash.push(h);
        }
        if (hash.length > 0) {
            hash.push(bulletSpeed.toString());
        }
        history.html(hash.join('-'));
    }

    function startDragging() {
        let minDistance = 1e5;
        let currentDistance, minPos;
        for (let i = 0; i < points.length; ++i) {
            let point = points[i];
            currentDistance = point.distanceTo({x: mouseX, y: mouseY});
            if (currentDistance < minDistance && currentDistance < Math.max(point.size.current, 15)) {
                minDistance = currentDistance;
                minPos = i;
            }
        }
        if (points[minPos]) {
            points[minPos].dragging = true;
        }
    }

    function stopDragging() {
        for (let i = 0; i < points.length; ++i) {
            if (points[i]) {
                points[i].dragging = false;
            }
        }
    }

    function loop() {
        if (paused) {
            return;
        }
        context.clearRect(WORLD_RECT.x, WORLD_RECT.y, WORLD_RECT.width, WORLD_RECT.height);

        let point, i, color;
        let deadPoints = [];

        for (i = 0; i < points.length; ++i) {
            point = points[i];

            if (point.particles.length > 0) {
                let j, particle;
                for (j = 0; j < point.particles.length; ++j) {
                    if (Math.random() > 0.4) {
                        particle = point.particles[j];

                        particle.coordinate.x += particle.velocity.x;
                        particle.coordinate.y += particle.velocity.y;
                        particle.velocity.x *= 0.97;
                        particle.velocity.y *= 0.97;
                        particle.rotation += particle.velocity.r;

                        let x = particle.coordinate.x + Math.cos(particle.rotation) * particle.rotationRadius;
                        let y = particle.coordinate.y + Math.sin(particle.rotation) * particle.rotationRadius;

                        context.beginPath();
                        context.fillStyle = generateColor(point.color, Util.random(0.3, 1));
                        context.arc(x, y, Math.max(point.scale, 0.5), 0, Math.PI * 2, true);
                        context.fill();
                    }
                }
                if (Math.random() > 0.8) {
                    point.particles.shift();
                }
                while (point.particles.length > 50) {
                    point.particles.shift();
                }
            }


            point.scale = Math.max(Math.min(point.coordinate.y / WORLD_RECT.height, 1), 0.2);

            color = context.createRadialGradient(
                point.coordinate.x, point.coordinate.y, 0,
                point.coordinate.x, point.coordinate.y, point.size.current
            );
            color.addColorStop(0, generateColor(point.color, point.color.a));
            color.addColorStop(1, generateColor(point.color, point.color.a * 0.7));

            context.beginPath();
            context.fillStyle = color;
            context.arc(
                point.coordinate.x, point.coordinate.y, point.size.current * point.scale,
                0, Math.PI * 2, true
            );
            context.fill();

            if (point.dragging) {
                point.coordinate.x += (mouseX - point.coordinate.x) * 0.2;
                point.coordinate.y += (mouseY - point.coordinate.y) * 0.2;
            } else if (isOutsideWorld(point.coordinate)) {
                deadPoints.push(i);
            }

            point.cloudSize.current += (point.cloudSize.target - point.cloudSize.current) * 0.04;
            point.size.current += (point.size.target - point.size.current) * 0.2;
            updatePointColor(point);
        }

        while (deadPoints.length) {
            points.splice(deadPoints.pop(), 1);
        }

        if (points.length > 1) {
            if (bullet.index > points.length - 1) {
                bullet.index = 0;
            }

            let target = points[bullet.index];

            let bX = bullet.getCoordinate().x;
            let bY = bullet.getCoordinate().y;
            let tX = target.coordinate.x;
            let tY = target.coordinate.y;
            let dot = {x: bX, y: bY};
            dot.x += (tX - bX) * bulletSpeed / 10;
            dot.y += (tY - bY) * bulletSpeed / 10;
            bullet.addCoordinate(dot);

            if (bullet.distanceTo(target.coordinate) < Math.min(target.size.current, 3)) {
                bullet.index++;
                bullet.color = target.color;
                if (bullet.index > points.length - 1) {
                    bullet.index = 0;
                }
                target.emit(points[bullet.index].coordinate);
                let cellId = getCellIdFromCoordinate(target.cloneCoordinate());
                playChord(cellId);
            }

            color = generateColor(bullet.color, 1);

            let cc = bullet.coordinates[0];
            let nc = bullet.coordinates[1];
            if (cc && nc) {
                context.beginPath();
                context.strokeStyle = color;
                context.lineWidth = 2;

                context.moveTo(middleCoordinate(cc.x, nc.x), middleCoordinate(cc.y, nc.y));

                for (i = 1; i < bullet.coordinates.length - 1; ++i) {
                    cc = bullet.coordinates[i];
                    nc = bullet.coordinates[i + 1];
                    context.quadraticCurveTo(
                        cc.x, cc.y,
                        middleCoordinate(cc.x, nc.x), middleCoordinate(cc.y, nc.y)
                    );
                }
                context.stroke();
            }

            context.lineTo(nc.x, nc.y);
        }

    }

    function generateColor(c, a) {
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
    }

    function isOutsideWorld(p) {
        return p.x <= WORLD_RECT.x || p.x >= WORLD_RECT.width ||
            p.y <= WORLD_RECT.y || p.y >= WORLD_RECT.height;
    }

    function updatePointColor(point) {
        let centerX = WORLD_RECT.width / 2;
        let x = point.coordinate.x;
        point.color.r = 63 + Math.round((1 - Math.min(x / centerX, 1)) * 189);
        point.color.g = 63 + Math.round(Math.abs((x > centerX ? x - (centerX * 2) : x) / centerX) * 189);
        point.color.b = 63 + Math.round(Math.max(((x - centerX) / centerX), 0) * 189);
    }

    function middleCoordinate(a, b) {
        return a + (b - a) / 2;
    }

    function getCellIdFromCoordinate(p) {
        let dx = WORLD_RECT.width / N_COLS;
        let dy = WORLD_RECT.height / N_ROWS;
        let col = Math.floor(p.x / dx);
        let row = Math.floor(p.y / dy);
        col = col >= N_COLS ? col - 1 : col;
        row = row >= N_ROWS ? row - 1 : row;
        col = col < 0 ? 0 : col;
        row = row < 0 ? 0 : row;

        return row * N_COLS + col;
    }

    function playChord(index) {
        audioChannels[0].pause();
        audioChannels[0].src = audioChords[index].src;
        audioChannels[0].load();
        audioChannels[0].play();
        audioChannels.push(audioChannels.shift());
    }
};

function Dot() {
    this.coordinate = {x: 0, y: 0}
}

Dot.prototype.distanceTo = function (p) {
    let dx = this.coordinate.x - p.x;
    let dy = this.coordinate.y - p.y;
    return Math.sqrt(dx * dx + dy * dy);
};
Dot.prototype.cloneCoordinate = function () {
    return {x: this.coordinate.x, y: this.coordinate.y};
};

function Point() {
    this.coordinate = {x: 0, y: 0};
    this.color = {r: 0, g: 0, b: 0, a: 1};
    this.size = {current: 0, target: 16};
    this.scale = 0;
    this.cloudSize = {current: 50, target: 50};
    this.particles = [];
    this.dragging = false;
}

Point.prototype = new Dot();
Point.prototype.emit = function (direction) {
    this.size.current = 12;
    this.cloudSize.current = 100;

    let quantity = Util.random(20, 40);
    let particle;
    let factor = 0.8;
    let dx = direction.x - this.cloneCoordinate().x;
    let dy = direction.y - this.cloneCoordinate().y;
    for (let i = 0; i < quantity; ++i) {
        particle = new Particle();

        particle.coordinate = this.cloneCoordinate();

        particle.coordinate.x += dx * (i / quantity) * factor;
        particle.coordinate.y += dy * (i / quantity) * factor;

        let rr = (dx + dy) / 600 * (i / quantity);
        particle.coordinate.x += rr * Util.random(-1, 1);
        particle.coordinate.y += rr * Util.random(-1, 1);

        particle.velocity.x = dx / Util.random(100, 600);
        particle.velocity.y = dy / Util.random(100, 600);
        particle.velocity.r = Util.random(-0.1, 0.1);

        particle.rotationRadius = Util.random(0, 20);

        this.particles.push(particle);
    }
};

function Particle() {
    this.coordinate = {x: 0, y: 0};
    this.velocity = {x: 0, y: 0, r: 0};
    this.rotationRadius = 0;
    this.rotation = 0;
}

Particle.prototype = new Dot();

function Bullet() {
    this.coordinates = [
        {x: 0, y: 0}
    ];
    this.index = 0;
    this.size = 2;
    this.length = 5;
    this.color = {r: 0, g: 0, b: 0, a: 0.8};
}

Bullet.prototype.getCoordinate = function () {
    return this.coordinates[this.coordinates.length - 1];
};
Bullet.prototype.addCoordinate = function (c) {
    while (this.coordinates.length > this.length) {
        this.coordinates.shift();
    }
    this.coordinates.push(c);
};
Bullet.prototype.distanceTo = function (p) {
    let coordinate = this.getCoordinate();
    let dx = p.x - coordinate.x;
    let dy = p.y - coordinate.y;
    return Math.sqrt(dx * dx + dy * dy);
};

CreateMode.init();