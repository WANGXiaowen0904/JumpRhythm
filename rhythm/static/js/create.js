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

    let canvas;
    let context;
    let audioChords;
    let audioChannels = [];

    let canvasLeft;
    let canvasTop;
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
            canvas.addEventListener('dblclick', drawPoints, false);
            // TODO: add keyboard event?
            // Other events
            window.addEventListener('resize', resetCanvasAttr, false);

            bullet = new Bullet();
            bulletSpeed = 3;

            resetCanvasAttr();

            setInterval(loop, 40);
        }
    };

    function drawPoints(event) {
        event.preventDefault();
        mouseIsDown = true;

        updateMouseCoordinate(event);
        createPointAt(mouseX, mouseY);
        // TODO: save point with hash
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

    function loop() {
        context.clearRect(WORLD_RECT.x, WORLD_RECT.y, WORLD_RECT.width, WORLD_RECT.height);

        let point, i, iLen, color;
        let deadPoints = [];

        for (i = 0, iLen = points.length; i < iLen; ++i) {
            point = points[i];

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

            if (false) {
                // todo: dragging ?
            } else if (isOutsideWorld(point.coordinate)) {
                deadPoints.push(i);
            }

            point.size.current += (point.size.target - point.size.current) * 0.2;
            updatePointColor(point);
        }

        while (deadPoints.length) {
            points.splice(deadPoints.pop(), 1);
        }

        if (points.length > 1) {
            if (bullet.index > point.length - 1) {
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

                let cellId = getCellIdFromCoordinate(target.cloneCoordinate());
                console.log(cellId);
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

                for (i = 1, iLen = bullet.coordinates.length - 1; i < iLen; ++i) {
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
        col = col === N_COLS ? col - 1 : col;
        row = row === N_ROWS ? row - 1 : row;

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
}

Point.prototype = new Dot();

function Particle() {
    this.coordinate = {x: 0, y: 0};
    this.velocity = {x: 0, y: 0, r: 0};
    this.rotationRadius = 0;
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