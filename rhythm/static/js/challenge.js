let Util = new function () {
    this.random = function (a, b) {
        return Math.random() * (b - a) + a;
    };

    this.randomInt = function (a, b) {
        return Math.floor(this.random(a, b - 1e-5));
    };
};

let ChallengeMode = new function () {

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
    const TIME_INTERVAL = 80; // ms
    const SPEED_LEVEL_MAX = 7;
    const SPEED_LEVEL_MIN = 1;

    let worldCanvas, helpCanvas;
    let worldContext, helpContext;
    let audioChords;
    let audioChannels = [];

    let canvasLeft;
    let canvasTop;
    let paused = false;
    let needHelp = true;
    let mouseIsDown = false;
    let banded = false;
    let mouseX;
    let mouseY;

    let points = [];
    let bullet;
    let bulletSpeedLevel;

    let level = 0;
    let passed = false;
    let puzzle = [];
    let confirmed = false;
    let playingPuzzle = false;
    let life = 5;
    let score = 0;
    let factor = SPEED_LEVEL_MAX;

    let timer;
    let playingId;

    this.init = function () {
        worldCanvas = $('#world')[0];
        helpCanvas = $('#help')[0];

        canvasLeft = (window.innerWidth - WORLD_RECT.width) * .5;
        canvasTop = (window.innerHeight - WORLD_RECT.height) * .5;

        bulletSpeedLevel = 4;

        if (worldCanvas && worldCanvas.getContext) {
            audioChords = $('audio').toArray();
            for (let i = 0; i < N_CHANNELS; ++i) {
                audioChannels.push(new Audio(''));
            }
            worldContext = worldCanvas.getContext('2d');

            if (!banded) {
                // Mouse Events
                $(document).mousemove(updateMouseCoordinate);
                $(document).mousedown(dragPoint);
                $(document).mouseup(putPoint);
                $('#world').dblclick(drawPoints);
                // Keyboard Event
                $(document).keydown(updateSpeedLevel);
                // Button onclick listener
                $('#reset-btn').click(resetWorld);
                $('#confirm-btn').click(function () {
                    confirmed = true;
                });
                $('#play-btn').click(playPuzzle);
                // $('#pause-btn').click(pauseHandler);
                // Other events
                window.addEventListener('resize', resizeAllCanvas, false);
                banded = true;
            }

            bullet = new Bullet();

            resetCanvasAttr(worldCanvas);

            updatePointsFromHash();

            setInterval(loop, TIME_INTERVAL);
        }

        if (helpCanvas && helpCanvas.getContext) {
            helpContext = helpCanvas.getContext('2d');
            resetCanvasAttr(helpCanvas);
            $('#help-btn').click(function () {
                needHelp = !needHelp;
                if (needHelp) {
                    drawHelp();
                } else {
                    helpContext.clearRect(0, 0, WORLD_RECT.width, WORLD_RECT.height);
                }
            });
            drawHelp();
        }
    };

    function drawPoints(event) {
        event.preventDefault();
        mouseIsDown = true;

        updateMouseCoordinate(event);
        createPointAt(mouseX, mouseY);
        if (points.length === 1) {
            bullet.coordinates = [{x: mouseX, y: mouseY}];
        }

        updateHashRecord();
    }

    function resetCanvasAttr(canvas) {
        canvas.width = WORLD_RECT.width;
        canvas.height = WORLD_RECT.height;

        canvasLeft = (window.innerWidth - canvas.width) * .5;
        canvasTop = (window.innerHeight - canvas.height) * .5;

        canvas.style.position = 'absolute';
        canvas.style.left = canvasLeft + 'px';
        canvas.style.top = canvasTop + 'px';
    }

    function resizeAllCanvas(event) {
        resetCanvasAttr(worldCanvas);
        resetCanvasAttr(helpCanvas);
        if (needHelp) {
            drawHelp();
        }
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

    function updateSpeedLevel(e) {
        if (e.keyCode === 38) { // up
            bulletSpeedLevel = Math.min(bulletSpeedLevel + 1, SPEED_LEVEL_MAX);
        } else if (e.keyCode === 40) { // down
            bulletSpeedLevel = Math.max(bulletSpeedLevel - 1, SPEED_LEVEL_MIN);
        }
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

    function playPuzzle() {
        factor = Math.min(bulletSpeedLevel, SPEED_LEVEL_MAX);
        playingPuzzle = true;
        let dT = 18 - 2 * bulletSpeedLevel;
        playingId = 0;
        timer = setInterval(playPuzzleWithInterval, dT * TIME_INTERVAL);
    }

    function playPuzzleWithInterval() {
        if (playingId === puzzle.length) {
            clearInterval(timer);
            playingPuzzle = false;
        }
        if (puzzle[playingId]) {
            playChord(puzzle[playingId]);
        }

        playingId += 1;
    }

    function createPointAt(x, y) {
        let point = new Point();
        point.coordinate.x = x;
        point.coordinate.y = y;
        if (points.length === 0) {
            point.first = true;
        }
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
            hash.push(bulletSpeedLevel.toString());
        }
        history.html(hash.join('-'));
    }

    function updatePointsFromHash() {
        let history = $('#history').text();
        let pointsPos = history.split('-');
        let p, x, y;
        points = [];
        while (pointsPos && pointsPos.length) {
            p = pointsPos.shift().split('x');
            if (p.length === 2) {
                x = parseInt(p[0]) / 1000 * WORLD_RECT.width;
                y = parseInt(p[1]) / 1000 * WORLD_RECT.height;
                if (!isNaN(x) && !isNaN(y)) {
                    createPointAt(x, y);
                }
            } else {
                // Get the speed level if any
                if (!isNaN(parseInt(p[0]))) {
                    bulletSpeedLevel = parseInt(p[0]);
                }
            }
        }
    }

    function drawHelp() {
        helpContext.lineWidth = 1;
        helpContext.strokeStyle = "rgba(0,0,0,0.6)";
        let dx = WORLD_RECT.width / N_COLS;
        let dy = WORLD_RECT.height / N_ROWS;
        for (let i = 1; i < N_ROWS; ++i) {
            helpContext.beginPath();
            helpContext.moveTo(0, i * dy);
            helpContext.lineTo(helpCanvas.width, i * dy);
            helpContext.stroke();
        }
        for (let j = 1; j < N_COLS; ++j) {
            helpContext.beginPath();
            helpContext.moveTo(j * dx, 0);
            helpContext.lineTo(j * dx, helpCanvas.height);
            helpContext.stroke();
        }
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

        level = parseInt($('#lv').text());
        if (puzzle.length === 0) {
            generatePuzzle();
        }

        worldContext.clearRect(WORLD_RECT.x, WORLD_RECT.y, WORLD_RECT.width, WORLD_RECT.height);
        let point, i, color;
        let deadPoints = [];
        let deadPos;

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

                        worldContext.beginPath();
                        worldContext.fillStyle = generateColor(point.color, Util.random(0.3, 1));
                        worldContext.arc(x, y, Math.max(point.scale, 0.5), 0, Math.PI * 2, true);
                        worldContext.fill();
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

            color = worldContext.createRadialGradient(
                point.coordinate.x, point.coordinate.y, 0,
                point.coordinate.x, point.coordinate.y, point.size.current
            );
            color.addColorStop(0, generateColor(point.color, point.color.a));
            color.addColorStop(1, generateColor(point.color, point.color.a * 0.7));

            worldContext.beginPath();
            worldContext.fillStyle = color;
            worldContext.arc(
                point.coordinate.x, point.coordinate.y, point.size.current * point.scale,
                0, Math.PI * 2, true
            );
            worldContext.fill();

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
            deadPos = deadPoints.pop();
            if (points[deadPos].first) {
                points[(deadPos + 1) % points.length].first = true;
            }
            points.splice(deadPos, 1);
        }

        if (points.length > 1) {
            if (bullet.index > points.length - 1) {
                bullet.index = 0;
            }

            let target = points[bullet.index];
            let dX = target.coordinate.x - bullet.getCoordinate().x;
            let dY = target.coordinate.y - bullet.getCoordinate().y;
            let dT = 18 - 2 * bulletSpeedLevel - bullet.past;
            dT = dT < 1 ? 1 : dT;
            let dot = {x: bullet.getCoordinate().x, y: bullet.getCoordinate().y};
            dot.x += dX / dT;
            dot.y += dY / dT;
            bullet.addCoordinate(dot);

            if (bullet.distanceTo(target.coordinate) < Math.min(target.size.current, 3)) {
                bullet.index++;
                bullet.past = 0;
                bullet.color = target.color;
                if (bullet.index > points.length - 1) {
                    bullet.index = 0;
                }
                target.emit(points[bullet.index].coordinate);
                if (!playingPuzzle) {
                    let cellId = getCellIdFromCoordinate(target.cloneCoordinate());
                    playChord(cellId);
                }
            }

            color = generateColor(bullet.color, 1);

            let cc = bullet.coordinates[0];
            let nc = bullet.coordinates[1];
            if (cc && nc) {
                worldContext.beginPath();
                worldContext.strokeStyle = color;
                worldContext.lineWidth = 2;
                worldContext.moveTo(middleCoordinate(cc.x, nc.x), middleCoordinate(cc.y, nc.y));

                for (i = 1; i < bullet.coordinates.length - 1; ++i) {
                    cc = bullet.coordinates[i];
                    nc = bullet.coordinates[i + 1];
                    worldContext.quadraticCurveTo(
                        cc.x, cc.y,
                        middleCoordinate(cc.x, nc.x), middleCoordinate(cc.y, nc.y)
                    );
                }
                worldContext.stroke();
            }

            worldContext.lineTo(nc.x, nc.y);
            bullet.past += 1;
        }

        if (confirmed) {
            if (isPuzzleSolved()) {
                upLevel();
            } else {
                life -= 1;
                $('#lf').text(life);
                if (life === 0) {
                    resetChallenge();
                }
            }
            confirmed = false;
        }
    }

    function generatePuzzle() {
        for (let i = 0; i < level + 1; ++i) {
            puzzle.push(Util.randomInt(0, N_CHORDS));
        }
    }

    function isPuzzleSolved() {
        if (points.length === 0) {
            return false;
        }

        if (puzzle.length !== points.length) {
            return false;
        }

        // find first point
        let firstPos = 0;
        for (let i = 0; i < points.length; ++i) {
            if (points[i].first) {
                firstPos = i;
                break;
            }
        }

        let shifted;
        for (let i = 0; i < puzzle.length; ++i) {
            shifted = (i + firstPos) % points.length;
            if (getCellIdFromCoordinate((points[shifted].cloneCoordinate())) !== puzzle[i]) {
                return false;
            }
        }
        return true;
    }

    function upLevel() {
        paused = true;

        level += 1;
        score += 100 * Math.round(level / 2) * life * bulletSpeedLevel;
        life = Math.min(life + 1, 5);

        points = [];
        puzzle = [];
        factor = SPEED_LEVEL_MAX;

        $('#lv').text(level);
        $('#sc').text(score);
        $('#lf').text(life);
        paused = false;
    }

    function resetChallenge() {
        paused = true;
        level = 0;
        passed = false;
        puzzle = [];
        confirmed = false;
        playingPuzzle = false;
        life = 5;
        score = 0;
        $('#lv').text(level);
        $('#sc').text(score);
        $('#lf').text(life);
        puzzle = [];
        resetWorld();
        paused = false;
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
        if (index >= audioChords.length) {
            return;
        }
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
    this.first = false;
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
    this.coordinates = [{x: 0, y: 0}];
    this.past = 0;
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
    let coordinate = this.coordinates[this.coordinates.length - 1];
    let dx = p.x - coordinate.x;
    let dy = p.y - coordinate.y;
    return Math.sqrt(dx * dx + dy * dy);
};

ChallengeMode.init();
window.mode = 3; // create mode