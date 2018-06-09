var JumpRhythm = new function () {

    var NUMBER_OF_CHANNELS = 6;
    var NUMBER_OF_CHORDS = 10;

    var NUMBER_OF_ROWS = 1;
    var NUMBER_OF_COLS = 10;

    var worldRect = {x: 0, y: 0, width: 900, height: 600};
    var map = {x: 160, y: 0, width: 580, height: 600};

    var canvas;
    var context;

    var keys = [];

    var playHead;
    var playHeadSpeed = 4;

    // Holds references to all the preloaded chords audio objects, contents never changes after startup
    var audioChords = [];

    // Holds the audio instances used to play back audio, objects in this pool are rotated
    var audioChannels = [];

    var mouseX = (window.innerWidth - worldRect.width);
    var mouseY = (window.innerHeight - worldRect.height);
    var mouseIsDown = false;

    // This is used to keep track of the users last interaction to stop playing sounds after lack of input (save bandwidth)
    var lastMouseMoveTime = new Date().getTime();

    this.init = function () {

        canvas = document.getElementById('world');

        if (canvas && canvas.getContext) {

            // Fetch references to all chord elements in the DOM
            for (var i = 1; i <= NUMBER_OF_CHORDS; i++) {
                audioChords.push(document.getElementById('chord' + i));
            }

            // Setup the playback channels
            for (var i = 0; i <= NUMBER_OF_CHANNELS; i++) {
                audioChannels.push(new Audio(''));
            }

            context = canvas.getContext('2d');

            canvas.addEventListener('dblclick', documentDoubleClickHandler, false);

            playHead = new Playhead();

            setInterval(loop, 1000 / 40);
        }
    };

    function documentDoubleClickHandler(event) {
        event.preventDefault();

        mouseIsDown = true;
        updateMousePosition(event);

        createKey(mouseX, mouseY);
    }

    // Convenience method called from many mouse event handles to update the current mouse position
    function updateMousePosition(event) {
        mouseX = event.clientX - (window.innerWidth - worldRect.width) * .5;
        mouseY = event.clientY - (window.innerHeight - worldRect.height) * .5;
    }

    // Returns a cell from a point. This point must be within the worldRect
    function getCellFromPoint(p) {
        var i, j;

        var cellW = worldRect.width / (NUMBER_OF_COLS - 1);
        var cellH = worldRect.height / (NUMBER_OF_ROWS);

        exitLoop:for (i = 0; i < NUMBER_OF_ROWS; i++) {
            for (j = 0; j < NUMBER_OF_COLS - 1; j++) {
                if (p.x > j * cellW && p.x < j * cellW + cellW && p.y > i * cellH && p.y < i * cellH + cellH) {
                    break exitLoop;
                }
            }
        }

        return {x: j, y: i};
    }

    function createKey(x, y) {

        var key = new Key();

        key.position.x = x;
        key.position.y = y;

        keys.push(key);
    }

    // Updates the color of a key to reflect a position [left = red, mid = green, right = blue]
    function updateKeyColor(key, x, y) {
        var centerX = (worldRect.width / 2);

        key.color.r = 63 + Math.round((1 - Math.min(x / centerX, 1)) * 189);
        key.color.g = 63 + Math.round(Math.abs((x > centerX ? x - (centerX * 2) : x) / centerX) * 189);
        key.color.b = 63 + Math.round(Math.max(((x - centerX) / centerX), 0) * 189);
    }

    function playChord(index) {
        audioChannels[0].pause();

        audioChannels[0].src = audioChords[index].src;
        audioChannels[0].load();
        audioChannels[0].play();

        // Rotate the channels
        audioChannels.push(audioChannels.shift());
    }

    function loop() {

        context.clearRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);

        var key, particle, color, i, ilen, j, jlen;
        var deadKeys = [];

        for (i = 0, ilen = keys.length; i < ilen; i++) {
            key = keys[i];

            // Are there any particles we need to process for this key?
            if (key.particles.length > 0) {

                for (j = 0, jlen = key.particles.length; j < jlen; j++) {
                    if (Math.random() > 0.4) {
                        particle = key.particles[j];

                        particle.position.x += particle.velocity.x;
                        particle.position.y += particle.velocity.y;

                        particle.velocity.x *= 0.87;
                        particle.velocity.y *= 0.87;

                        particle.rotation += particle.velocity.r;

                        var x = particle.position.x + Math.cos(particle.rotation) * particle.rotationRadius;
                        var y = particle.position.y + Math.sin(particle.rotation) * particle.rotationRadius;

                        context.beginPath();
                        context.fillStyle = 'rgba(' + key.color.r + ',' + key.color.g + ',' + key.color.b + ',' + (0.3 + (Math.random() * 0.7)) + ')';
                        context.arc(x, y, Math.max(1 * key.scale, 0.6), 0, Math.PI * 2, true);
                        context.fill();
                    }
                }

                if (Math.random() > 0.8) {
                    key.particles.shift();
                }

                while (key.particles.length > 60) {
                    key.particles.shift();
                }

                // There is a bug causing the next shape drawn after this point to flicker,
                // resetting the fill to a full alpha color works for now
                context.fillStyle = "#ffffff";
            }

            key.scale = 0;
            key.scale += Math.max(Math.min((key.position.y / (map.y + map.height)), 1), 0);
            key.scale = Math.max(key.scale, 0.1);

            var backHeight = 98;

            key.reflection.x = key.position.x;
            key.reflection.y = Math.max(key.position.y + (backHeight - (backHeight * key.scale)), backHeight);

            var sideScale = 1 - Math.max(((key.position.y - backHeight) / (worldRect.height - backHeight)), 0);
            var sideWidth = map.x * sideScale;

            var xs;

            if (key.position.x < sideWidth) {
                xs = 1 - (key.position.x / sideWidth);
                key.scale += xs;
                key.reflection.y += (worldRect.height - key.position.y) * key.scale * xs;
            }
            else if (key.position.x > worldRect.width - sideWidth) {
                xs = (key.position.x - worldRect.width + sideWidth) / (worldRect.width - worldRect.width + sideWidth);
                key.scale += xs;
                key.reflection.y += (worldRect.height - key.position.y) * key.scale * xs;
            }

            sideScale = 1 - Math.max(((key.reflection.y - backHeight) / (worldRect.height - backHeight)), 0);
            sideWidth = map.x * sideScale;

            key.reflection.x = Math.max(Math.min(key.reflection.x, worldRect.width - sideWidth), sideWidth);

            color = context.createRadialGradient(key.position.x, key.position.y, 0, key.position.x, key.position.y, key.size.current);
            color.addColorStop(0, 'rgba(' + key.color.r + ',' + key.color.g + ',' + key.color.b + ',' + key.color.a + ')');
            color.addColorStop(1, 'rgba(' + key.color.r + ',' + key.color.g + ',' + key.color.b + ',' + key.color.a * 0.7 + ')');

            context.beginPath();
            context.fillStyle = color;
            context.arc(key.position.x, key.position.y, key.size.current * key.scale, 0, Math.PI * 2, true);
            context.fill();

            color = context.createRadialGradient(key.reflection.x, key.reflection.y, 0, key.reflection.x, key.reflection.y, key.size.current * key.scale * 2);
            color.addColorStop(0, 'rgba(' + key.color.r + ',' + key.color.g + ',' + key.color.b + ',' + key.color.a * 0.06 + ')');
            color.addColorStop(1, 'rgba(' + key.color.r + ',' + key.color.g + ',' + key.color.b + ',0)');

            context.beginPath();
            context.fillStyle = color;
            context.arc(key.reflection.x, key.reflection.y, key.size.current * key.scale * 2, 0, Math.PI * 2, true);
            context.fill();

            if (key.dragging) {
                key.position.x += (mouseX - key.position.x) * 0.2;
                key.position.y += (mouseY - key.position.y) * 0.2;
            }
            else if (key.position.x < worldRect.x || key.position.x > worldRect.width || key.position.y < worldRect.y || key.position.y > worldRect.height) {
                deadKeys.push(i);
            }

            key.cloudSize.current += (key.cloudSize.target - key.cloudSize.current) * 0.04;
            key.size.current += (key.size.target - key.size.current) * 0.2;

            // Sync the color of the key with the current position
            updateKeyColor(key, key.position.x, key.position.y);
        }

        while (deadKeys.length) {
            keys.splice(deadKeys.pop(), 1);
        }

        // The playhead can only be rendered if there are at least two keys
        if (keys.length > 1) {
            if (playHead.index > keys.length - 1) {
                playHead.index = 0;
            }

            var attractor = keys[playHead.index];

            var point = {
                x: playHead.getPosition().x,
                y: playHead.getPosition().y,
                scale: attractor.scale,
                rx: playHead.getPosition().rx,
                ry: playHead.getPosition().ry
            };

            point.x += (attractor.position.x - playHead.getPosition().x) * playHeadSpeed / 10;
            point.y += (attractor.position.y - playHead.getPosition().y) * playHeadSpeed / 10;

            point.rx += (attractor.reflection.x - playHead.getPosition().rx) * playHeadSpeed / 10;
            point.ry += (attractor.reflection.y - playHead.getPosition().ry) * playHeadSpeed / 10;

            playHead.addPosition(point);

            if (playHead.distanceTo(attractor.position) < Math.min(attractor.size.current * attractor.scale, 5)) {
                playHead.index++;

                // Inherit color from the attractor
                playHead.color = attractor.color;

                if (playHead.index > keys.length - 1) {
                    playHead.index = 0;
                }

                // Emit any extra effects at collision
                attractor.emit(keys[playHead.index].position);

                // Determine which cell the attractor key is in
                var cell = getCellFromPoint({x: attractor.position.x, y: attractor.position.y});

                // Play back the chord representing the cell that the attractor is in
                playChord((cell.y * NUMBER_OF_COLS) + cell.x + 1);
            }

            // Set the color of the playhead
            color = 'rgba(' + playHead.color.r + ',' + playHead.color.g + ',' + playHead.color.b + ',1)';

            var cp = playHead.positions[0];
            var np = playHead.positions[1];

            if (cp && np) {
                context.beginPath();
                context.strokeStyle = color;

                context.lineWidth = 2 * cp.scale;
                context.moveTo(cp.x + (np.x - cp.x) / 2, cp.y + (np.y - cp.y) / 2);

                for (i = 1, len = playHead.positions.length - 1; i < len; i++) {
                    cp = playHead.positions[i];
                    np = playHead.positions[i + 1];

                    context.quadraticCurveTo(cp.x, cp.y, cp.x + (np.x - cp.x) / 2, cp.y + (np.y - cp.y) / 2);
                }

                context.stroke();

                cp = playHead.positions[0];
                np = playHead.positions[1];

                color = 'rgba(' + playHead.color.r + ',' + playHead.color.g + ',' + playHead.color.b + ',0.1)';

                context.beginPath();
                context.strokeStyle = color;

                context.lineWidth = 1.8 * cp.scale;
                context.moveTo(cp.rx + (np.rx - cp.rx) / 2, cp.ry + (np.ry - cp.ry) / 2);

                for (i = 1, len = playHead.positions.length - 1; i < len; i++) {
                    cp = playHead.positions[i];
                    np = playHead.positions[i + 1];

                    context.quadraticCurveTo(cp.rx, cp.ry, cp.rx + (np.rx - cp.rx) / 2, cp.ry + (np.ry - cp.ry) / 2);
                }

                context.stroke();
            }

            context.lineTo(np.x, np.y);
        }

    }


};

/**
 *
 */
function Point() {
    this.position = {x: 0, y: 0};
}

Point.prototype.distanceTo = function (p) {
    var dx = p.x - this.position.x;
    var dy = p.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
};
Point.prototype.clonePosition = function () {
    return {x: this.position.x, y: this.position.y};
};

/**
 *
 */
function Key() {
    this.position = {x: 0, y: 0};
    this.reflection = {x: 0, y: 0};
    this.color = {r: 0, g: 0, b: 0, a: 1};
    this.size = {current: 0, target: 16};
    this.scale = 1;
    this.cloudSize = {current: 50, target: 50};
    this.dragging = false;
    this.particles = [];
}

Key.prototype = new Point();
Key.prototype.emit = function (direction) {

    this.size.current = 12;
    this.cloudSize.current = 100;

    // var q = 20 + Math.round(Math.random() * 200);
    var i, p, dx, dy;
    dx = direction.x - this.clonePosition().x;
    dy = direction.y - this.clonePosition().y;

    var q = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) * 0.1);

    for (i = 0; i < q; i++) {
        p = new Particle();

        p.position = this.clonePosition();

        // dx = direction.x - p.position.x;
        // dy = direction.y - p.position.y;

        p.position.x += dx * (0.8 * (i / q));
        p.position.y += dy * (0.8 * (i / q));

        var rr = ((dx + dy) / 200) * (i / q);

        p.position.x += -rr + Math.random() * (rr + rr);
        p.position.y += -rr + Math.random() * (rr + rr);

        p.velocity.x = dx / (100 + (Math.random() * 20));
        p.velocity.y = dy / (100 + (Math.random() * 20));
        p.velocity.r = -0.1 + Math.random() * 0.2;

        p.rotationRadius = Math.random() * 20;

        this.particles.push(p);
    }
};

/**
 *
 */
function Particle() {
    this.position = {x: 0, y: 0};
    this.velocity = {x: 0, y: 0, r: 0};
    this.rotation = 0;
    this.rotationRadius = 0;
}

Particle.prototype = new Point();

/**
 *
 * @returns {Playhead}
 */
function Playhead() {
    this.positions = [{x: 0, y: 0, rx: 0, ry: 0, scale: 1}]; // rx & ry = reflectionX/Y
    this.index = 0;
    this.size = 2;
    this.length = 5;
    this.color = {r: 0, g: 0, b: 0, a: 0.8};
}

Playhead.prototype.distanceTo = function (p) {
    var position = this.getPosition();

    var dx = p.x - position.x;
    var dy = p.y - position.y;
    return Math.sqrt(dx * dx + dy * dy);
};
Playhead.prototype.addPosition = function (p) {
    while (this.positions.length > this.length) {
        this.positions.shift();
    }

    this.positions.push(p);
};
Playhead.prototype.getPosition = function () {
    return this.positions[this.positions.length - 1];
};


JumpRhythm.init();

