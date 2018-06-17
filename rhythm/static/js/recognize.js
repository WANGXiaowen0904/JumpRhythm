let Util = new function () {

    this.random = function (a, b) {
        return Math.random() * (b - a) + a;
    };

};

let RecognizeMode = new function () {

    const N_ROWS = 3;
    const N_COLS = 7;
    const N_CHORDS = N_COLS * N_ROWS;
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
    const EPSILON = 2;

    let worldCanvas, helpCanvas;
    let worldContext, helpContext;

    let canvasLeft;
    let canvasTop;
    let paused = true;
    let needHelp = true;
    let banded = false;
    let mouseX;
    let mouseY;

    let points = [];
    let bullet;
    let bulletSpeedLevel;

    let audio;
    let audioContext;
    let source;
    let analyser;

    let timer;
    let duration;

    this.init = function () {
        worldCanvas = $('#world')[0];
        helpCanvas = $('#help')[0];

        canvasLeft = (window.innerWidth - WORLD_RECT.width) * .5;
        canvasTop = (window.innerHeight - WORLD_RECT.height) * .5;

        bulletSpeedLevel = 4;

        if (worldCanvas && worldCanvas.getContext) {
            worldContext = worldCanvas.getContext('2d');

            if (!banded) {
                // Mouse Events
                // $(document).mousemove(updateMouseCoordinate);
                // $(document).mousedown(dragPoint);
                // $(document).mouseup(putPoint);
                // $('#world').dblclick(drawPoints);
                // Keyboard Event
                $(document).keydown(updateSpeedLevel);
                // Button onclick listener
                // $('#reset-btn').click(resetWorld);
                $('#pause-btn').click(pauseHandler);
                // Other events
                window.addEventListener('resize', resizeAllCanvas, false);
                banded = true;
            }

            bullet = new Bullet();

            resetCanvasAttr(worldCanvas);

            // updatePointsFromHash();
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
            // drawHelp();
        }

        setInterval(loop, TIME_INTERVAL);
    };

    this.recognize = function () {
        audio = $('#audio-source')[0];
        audioContext = new window.AudioContext();
        duration = parseInt(audio.duration) * 1000;
        try {
            source = audioContext.createMediaElementSource(audio);
            analyser = audioContext.createAnalyser();
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) {
            console.log('handle exception');
            console.log(e);
        } finally {
            if (audio && audioContext) {
                resetWorld();
                audio.load();
                audio.play();
                paused = false;
                timer = setInterval(generatePoints, TIME_INTERVAL);
            }
        }
    };

    function generatePoints() {
        if (paused) {
            return;
        }
        let bufferArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(bufferArray);
        if (points.length < 2 || getCountdown() === 1) {
            updatePointsFromFreq(bufferArray[0]);
        }
        duration -= TIME_INTERVAL;
        if (duration < 0) {
            clearInterval(timer);
            resetWorld();
            paused = true;
        }
    }

    function updatePointsFromFreq(freq) {
        let pos = Math.floor(N_CHORDS * freq / 256);
        if (isNaN(pos)) {
            return;
        }
        pos = pos === N_CHORDS ? pos - 1 : pos;
        let x = pos % N_COLS;
        let y = N_ROWS - Math.floor(pos / N_COLS) - 1; // y: from top to bottom, pitch: from bottom to top
        let dx = WORLD_RECT.width / N_COLS;
        let dy = WORLD_RECT.height / N_ROWS;
        let centerX = dx * (x + .5);
        let centerY = dy * (y + .5);
        let isolated = false;
        while (!isolated) {
            isolated = true;
            centerX += dx * Util.random(-.5, .5);
            centerY += dy * Util.random(-.5, .5);
            for (let i = 0; i < points.length; ++i) {
                if (points[i].distanceTo({x: centerX, y: centerY}) < EPSILON) {
                    isolated = false;
                    break;
                }
            }
        }
        createPointAt(centerX, centerY);
        if (points.length === N_CHORDS) {
            points.shift();
        }
    }

    function getCountdown() {
        let countdown = 18 - 2 * bulletSpeedLevel - bullet.past;
        return countdown < 1 ? 1 : countdown;
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

    function resetWorld() {
        paused = true;
        points = [];
        worldContext.clearRect(WORLD_RECT.x, WORLD_RECT.y, WORLD_RECT.width, WORLD_RECT.height);
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
            audio.pause();
        } else {
            btn.html(PAUSE_TEXT);
            audio.play();
        }
    }

    function createPointAt(x, y) {
        let point = new Point();
        point.coordinate.x = x;
        point.coordinate.y = y;
        points.push(point);
    }

    function drawHelp() {
        helpContext.lineWidth = 3;
        helpContext.strokeStyle = "lightgrey";
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

    function loop() {
        if (paused) {
            return;
        }
        worldContext.clearRect(WORLD_RECT.x, WORLD_RECT.y, WORLD_RECT.width, WORLD_RECT.height);
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


            point.scale = 0.1 + Math.min(point.coordinate.y / WORLD_RECT.height, 1) * 0.8; // 0.1 ~ 0.9
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
            points.splice(deadPoints.pop(), 1);
        }

        if (points.length > 1) {
            if (bullet.index > points.length - 1) {
                bullet.index = 0;
            }

            let target = points[bullet.index];
            let dX = target.coordinate.x - bullet.getCoordinate().x;
            let dY = target.coordinate.y - bullet.getCoordinate().y;
            let dT = getCountdown();
            let dot = {x: bullet.getCoordinate().x, y: bullet.getCoordinate().y};
            dot.x += dX / dT;
            dot.y += dY / dT;
            bullet.addCoordinate(dot);

            if (bullet.distanceTo(target.coordinate) < EPSILON) {
                bullet.index++;
                bullet.past = 0;
                bullet.color = target.color;
                if (bullet.index > points.length - 1) {
                    bullet.index = 0;
                }
                target.emit(points[bullet.index].coordinate);
                // let cellId = getCellIdFromCoordinate(target.cloneCoordinate());
                // playChord(cellId);
            }

            color = generateColor(bullet.color, .5);

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

RecognizeMode.init();
window.mode = 2;