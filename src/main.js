const { vec2, vec3, mat4 } = glMatrix;

class Level {

    static TILE_SIZE = 8;

    static EMPTY = 0xFFFFFF;
    static BLOCK = 0x000000;
    static LIGHT = 0xFFD800;
    static DOOR = 0x0026FF;
    static PLAYER = 0xFF0000;

    static loadContainer(data, tileset) {
        let offset = renderer.getOffset();
        const map = FileUtils.readImagePixels(data);
        let
            mapWidth = map[0].length,
            mapHeight = map.length;
        const drawCall = {
            offset,
            numSprites: 0
        };

        for (let i = 0; i < mapHeight; ++i) {
            for (let j = 0; j < mapWidth; ++j) {
                let
                    value = map[i][j],
                    valueLeft = j == 0 ? -1 : map[i][j - 1],
                    valueRight = j == mapWidth - 1 ? -1 : map[i][j + 1],
                    valueBack = i == 0 ? -1 : map[i - 1][j],
                    valueFront = i == mapHeight - 1 ? -1 : map[i + 1][j];

                let
                    x1 = j * Level.TILE_SIZE, y1 = Level.TILE_SIZE, z1 = i * Level.TILE_SIZE,
                    x2 = (j + 1) * Level.TILE_SIZE, y2 = 0, z2 = (i + 1) * Level.TILE_SIZE;

                switch (value) {
                    case Level.BLOCK: {

                        if (valueLeft != Level.BLOCK && valueLeft != -1) {
                            renderer.addQuad([
                                [x1, y1, z1],
                                [x1, y1, z2],
                                [x1, y2, z2],
                                [x1, y2, z1]
                            ], [1, 1, 1, 1], tileset[0][1]);

                            ++drawCall.numSprites;
                        }

                        if (valueRight != Level.BLOCK && valueRight != -1) {
                            renderer.addQuad([
                                [x2, y1, z2],
                                [x2, y1, z1],
                                [x2, y2, z1],
                                [x2, y2, z2]
                            ], [1, 1, 1, 1], tileset[0][1]);

                            ++drawCall.numSprites;
                        }

                        if (valueFront != Level.BLOCK && valueFront != -1) {
                            renderer.addQuad([
                                [x1, y1, z2],
                                [x2, y1, z2],
                                [x2, y2, z2],
                                [x1, y2, z2]
                            ], [1, 1, 1, 1], tileset[0][1]);

                            ++drawCall.numSprites;
                        }

                        if (valueBack != Level.BLOCK && valueBack != -1) {
                            renderer.addQuad([
                                [x2, y1, z1],
                                [x1, y1, z1],
                                [x1, y2, z1],
                                [x2, y2, z1]
                            ], [1, 1, 1, 1], tileset[0][1]);

                            ++drawCall.numSprites;
                        }

                        break;
                    }
                    default: {
                        renderer.addQuad([
                            [x1, 0, z1],
                            [x2, 0, z1],
                            [x2, 0, z2],
                            [x1, 0, z2]
                        ], [1, 1, 1, 1], tileset[1][0]);

                        renderer.addQuad([
                            [x1, y1, z2],
                            [x2, y1, z2],
                            [x2, y1, z1],
                            [x1, y1, z1]
                        ], [1, 1, 1, 1], i % 2 == 0 ? tileset[1][1] : tileset[1][2]);

                        drawCall.numSprites += 2;
                    }
                }

            }
        }

        return {
            drawCall,
            map
        };
    }

    init(params) {
        this.entities = [];
        this.drawCall = params.drawCall;

        this.mapWidth = params.map[0].length;
        this.mapHeight = params.map.length;

        this.lights = [];

        this.tiles = [...new Array(this.mapHeight)].map((row, i) => [...new Array(this.mapWidth)].map((cell, j) => {

            let entity;

            let
                value = params.map[i][j],
                valueLeft = j == 0 ? -1 : params.map[i][j - 1],
                valueRight = j == this.mapWidth - 1 ? -1 : params.map[i][j + 1],
                valueBack = i == 0 ? -1 : params.map[i - 1][j],
                valueFront = i == this.mapHeight - 1 ? -1 : params.map[i + 1][j];

            const entityPos = [(j + 0.5) * Level.TILE_SIZE, Level.TILE_SIZE / 2, (i + 0.5) * Level.TILE_SIZE];

            switch (value) {
                case Level.PLAYER: {
                    this.player = new Player();
                    entity = this.player;
                    break;
                }
                case Level.DOOR: {
                    entity = new Door();

                    vec3.copy(entity.basePos, entityPos);

                    if ((valueLeft == Level.BLOCK)) {

                        entity.rot[1] = 0;
                        entity.collider = new Collider(
                            -0.5 * Level.TILE_SIZE, -0.5 * Level.TILE_SIZE, -0.125 * Level.TILE_SIZE,
                            0.5 * Level.TILE_SIZE, 0.5 * Level.TILE_SIZE, 0.125 * Level.TILE_SIZE);
                    } else {

                        entity.rot[1] = Math.PI * 0.5
                        entity.collider = new Collider(
                            -0.125 * Level.TILE_SIZE, -0.5 * Level.TILE_SIZE, -0.5 * Level.TILE_SIZE,
                            0.125 * Level.TILE_SIZE, 0.5 * Level.TILE_SIZE, 0.5 * Level.TILE_SIZE);
                    }
                    break;
                }
                case Level.LIGHT: {
                    const l = new Light(1, 1, 0.95, 0.8);
                    vec3.set(l.pos, entityPos[0], Level.TILE_SIZE * 1.25, entityPos[2]);
                    this.lights.push(l);
                    break;
                }
            }
            if (entity) {
                vec3.copy(entity.pos, entityPos);
                this.entities.push(entity);
            }

            return new Tile(params.map[i][j], j, i);
        }));
    }

    update() {
        if (this.paused) return;

        for (let entity of this.entities) {
            entity.update();
            if (entity.collider) {
                vec3.copy(entity.collider.pos, entity.pos);
            }
        }

        for (let entity of this.entities) {
            entity.physicsUpdate();
        }

        vec3.set(camera.pos, this.player.pos[0], this.player.pos[1], this.player.pos[2]);
        vec3.copy(camera.dir, this.player.dir);
    }

    render() {
        renderer.beginFrame(0.1, 0.1, 0.1);

        for (let l of this.lights) {
            l.render();
        }

        renderer.draw([0, 0, 0], [0, 0, 0], this.drawCall.offset, this.drawCall.numSprites);

        for (let entity of this.entities) {
            entity.draw();
        }

        renderer.endFrame(camera);
    }

    getTileAt(x, y) {
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return null;
        }
        return this.tiles[y][x];
    }

}

class Light {

    pos = vec3.create();
    intensity;
    r;
    g;
    b;

    constructor(intensity, r, g, b) {
        this.intensity = intensity;
        this.r = r;
        this.g = g;
        this.b = b;
    }

    render() {
        this.intensity = Math.min(3 * Level.TILE_SIZE / vec3.dist(camera.pos, this.pos), Level.TILE_SIZE * 0.2);
        renderer.addLight(this.pos, this.intensity, this.r, this.g, this.b);
    }

}

class Tile {

    type;
    x;
    y;

    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
    }

    getPos() {
        return [(x + 0.5) * Level.TILE_SIZE, 0, (y + 0.5) * Level.TILE_SIZE];
    }

    getType() {
        return this.type;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }
}

class CollisionResult {

    collide = false;
    depth;
    normal = vec3.create();

}

class Collider {

    pos = vec3.create();
    localMin;
    localMax;

    constructor(x1, y1, z1, x2, y2, z2) {
        this.localMin = [x1, y1, z1];
        this.localMax = [x2, y2, z2];
    }

    getGlobalMin() {
        return vec3.add(vec3.create(), this.pos, this.localMin);
    }

    getGlobalMax() {
        return vec3.add(vec3.create(), this.pos, this.localMax);
    }

    contains(x, y, z) {
        let
            min = this.getGlobalMin(),
            max = this.getGlobalMax();
        return x > min[0] && x < max[0] && y > min[1] && y < max[1] && z > min[2] && z < max[2];
    }

    intersects(other) {
        let
            min1 = this.getGlobalMin(),
            max1 = this.getGlobalMax(),
            min2 = other.getGlobalMin(),
            max2 = other.getGlobalMax();
        return (max1[0] - min2[0]) * (min1[0] - max2[0]) < 0 &&
            (max1[1] - min2[1]) * (min1[1] - max2[1]) < 0 &&
            (max1[2] - min2[2]) * (min1[2] - max2[2]) < 0;
    }

    collide(result, otherMin, otherMax) {
        let
            min = this.getGlobalMin(),
            max = this.getGlobalMax();

        let minDepth = 10e9;
        let depth;
        let normal = vec3.create();

        // Bottom
        depth = otherMax[1] - min[1];
        if (depth < 0) return;
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, 0, -1, 0);
        }

        // Left
        depth = otherMax[0] - min[0];
        if (depth < 0) return;
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, -1, 0, 0);
        }

        // Right
        depth = max[0] - otherMin[0];
        if (depth < 0) return;
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, 1, 0, 0);
        }

        // Top
        depth = max[1] - otherMin[1];
        if (depth < 0) return;
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, 0, 1, 0);
        }

        // Back
        depth = otherMax[2] - min[2];
        if (depth < 0) {
            return;
        }
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, 0, 0, -1);
        }

        // Front
        depth = max[2] - otherMin[2];
        if (depth < 0) {
            return;
        }
        if (depth < minDepth) {
            minDepth = depth;
            vec3.set(normal, 0, 0, 1);
        }

        result.collide = true;
        result.depth = minDepth;
        vec3.copy(result.normal, normal);
    }

    resolve(result) {
        if (!result.collide) return;

        let diff = vec3.scale(vec3.create(), result.normal, result.depth);
        vec3.sub(this.pos, this.pos, diff);
    }

}

class Entity {

    groups = new Set();
    collider;
    pos = vec3.create();
    vel = vec3.create();
    rot = vec3.create();
    grounded = false;
    collideLeft = false;
    collideRight = false;
    collideTop = false;
    groupsToCollide = new Set();

    physicsUpdate() { }

    updatePosition() {
        let level = scene;

        let
            minX = ~~((this.pos[0] + this.collider.localMin[0]) / Level.TILE_SIZE), minY = ~~((this.pos[2] + this.collider.localMin[1]) / Level.TILE_SIZE),
            maxX = ~~((this.pos[0] + this.collider.localMax[0]) / Level.TILE_SIZE), maxY = ~~((this.pos[2] + this.collider.localMax[1]) / Level.TILE_SIZE);

        this.grounded = this.collideLeft = this.collideRight = this.collideTop = false;
        vec3.copy(this.collider.pos, this.pos);

        let blocksToCollide = [];
        for (let i = minY; i <= maxY; ++i) {
            for (let j = minX; j <= maxX; ++j) {
                const tile = level.getTileAt(j, i);
                if (tile != null && tile.getType() == Level.BLOCK) {
                    blocksToCollide.push(new Collider(
                        tile.getX() * Level.TILE_SIZE, 0, tile.getY() * Level.TILE_SIZE,
                        (tile.getX() + 1) * Level.TILE_SIZE, Level.TILE_SIZE, (tile.getY() + 1) * Level.TILE_SIZE
                    ));
                }
            }
        }
        for (let e of level.entities) {
            for (let g of e.groups.values()) {
                if (this.groupsToCollide.has(g)) {
                    blocksToCollide.push(e.collider);
                    break;
                }
            }
        }

        for (let block of blocksToCollide) {
            const result = new CollisionResult();

            this.collider.collide(result, block.getGlobalMin(), block.getGlobalMax());
            if (result.collide) {
                if (result.normal[1] == -1) {
                    this.grounded = true;
                } else if (result.normal[0] == -1) {
                    this.collideLeft = true;
                } else if (result.normal[0] == 1) {
                    this.collideRight = true;
                } else if (result.normal[1] == 1) {
                    this.collideTop = true;
                }
            }
            this.collider.resolve(result);
        }

        vec3.copy(this.pos, this.collider.pos);
    }

    draw() { }
}

class Player extends Entity {

    static SPEED = 10;

    moving = false;
    dir = [0, 0, -1];
    fingers;

    constructor() {
        super();
        this.collider = new Collider(-1, -2, -1, 1, 2, 1);
        this.groupsToCollide.add("door");
        this.fingers = [...new Array(2)].fill(0);
        this.touchpadCenter = vec2.create();
    }

    update() {
        const moveDir = [0, 0];

        if(Device.getType() == Device.DESKTOP) {


            if (KeyListener.isKeyPressed("KeyA")) {
                moveDir[0] = 1;
            } else if (KeyListener.isKeyPressed("KeyD")) {
                moveDir[0] = -1;
            }
            if (KeyListener.isKeyPressed("KeyW")) {
                moveDir[1] = 1;
            } else if (KeyListener.isKeyPressed("KeyS")) {
                moveDir[1] = -1;
            }
    
            vec3.rotateY(this.dir, this.dir, [0, 0, 0], MouseListener.getDeltaX() * delta * -0.18);
        } else {


            for (let i = 0; i < 2; ++i) {
                if(TouchListener.isJustTouched(i)) {
                    for(let j = 0; j < 2; ++j) {
                        if(this.fingers[j] == i + 1) {
                            this.fingers[j] = 0;
                        }
                    }
                    if(TouchListener.getX(i) < sw / 2) {
                        if(this.fingers[0] == 0) {
                            this.fingers[0] = i + 1;
                            vec2.set(this.touchpadCenter, TouchListener.getX(i), TouchListener.getY(i));
                        }
                    } else {
                        if(this.fingers[1] == 0) {
                            this.fingers[1] = i + 1;
                        }
                    }
                }
    
                if(this.fingers[0] == i + 1) {
    
                    if(TouchListener.isTouched(i)) {
                        vec2.set(moveDir, this.touchpadCenter[0] - TouchListener.getX(i), this.touchpadCenter[1] - TouchListener.getY(i));
                    } else {
                        this.fingers[0] = 0;
                    }
                } else if(this.fingers[1] == i + 1) {
    
                    if(TouchListener.isTouched(i)) {
                        vec3.rotateY(this.dir, this.dir, [0, 0, 0], TouchListener.getDeltaX(i) * delta * -0.36);
                    } else {
                        this.fingers[1] = 0;
                    }
                }
    
            }
        }

        vec3.normalize(this.dir, this.dir);

        if (moveDir[0] != 0 || moveDir[1] != 0) {
            this.moving = true;
            const moveAngle = Math.atan2(moveDir[0], moveDir[1]);
            const v = vec3.rotateY(vec3.create(), this.dir, [0, 0, 0], moveAngle);
            vec3.scale(v, v, Player.SPEED);
            vec3.set(this.vel, v[0], 0, v[2])
        } else {
            this.moving = false;
            vec3.set(this.vel, 0, 0, 0);
        }
    }

    physicsUpdate() {
        let frameVel = vec3.scale(vec3.create(), this.vel, delta);
        vec3.add(this.pos, this.pos, frameVel);

        this.updatePosition();
    }

}

class Door extends Entity {

    static MAX_OFFSET = Level.TILE_SIZE * 0.9;
    static SPEED = 5;

    opened = false;
    basePos = vec3.create();
    offset = 0;

    constructor() {
        super();
        this.groups.add("door");
    }

    draw() {
        renderer.draw(this.pos, this.rot, model_door.offset, model_door.numSprites);
    }

    update() {
        let level = scene;

        this.opened = vec3.dist(this.basePos, level.player.pos) < Level.TILE_SIZE * 0.75;

        if (this.opened) {
            if (this.offset < Door.MAX_OFFSET) {
                this.offset += delta * Door.SPEED;
            } else {
                this.offset = Door.MAX_OFFSET;
            }
        } else {
            if (this.offset > 0) {
                this.offset -= delta * Door.SPEED;
            } else {
                this.offset = 0;
            }
        }

        const offsetVec = [this.offset, 0, 0];
        vec3.rotateY(offsetVec, offsetVec, [0, 0, 0], this.rot[1]);
        vec3.add(this.pos, this.basePos, offsetVec);
    }

}

class AssetPool {

    static imagesMap = new Map();
    static audioMap = new Map();

    static getImage(name) {
        return this.imagesMap.get(name);
    }

    static getAudio(name) {
        return this.audioMap.get(name);
    }

    static loadImage(name, path) {
        return new Promise(resolve => {
            const image = new Image();
            image.crossOrigin = "Anonymous";
            image.src = path;
            image.onload = () => {
                this.imagesMap.set(name, image);
                resolve(image);
            }
        });
    }

    static loadAudio(name, path) {
        return new Promise(resolve => {
            const audio = new Audio(path);
            audio.load();
            audio.oncanplaythrough = () => {
                this.audioMap.set(name, audio);
                resolve(audio);
            }
        });
    }

}

class MathUtils {

    static lerp(x, a, b) {
        return (b - a) * x + a;
    }

    static rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randInt(min, max) {
        return Math.floor(this.rand(min, max + 1));
    }

    static clamp(x, a, b) {
        return Math.min(Math.max(x, a), b);
    }

    static sat(x) {
        return this.clamp(x, 0, 1);
    }

    static shuffle(arr) {
        for (let i = 0; i < arr.length; ++i) {
            const idx = this.randInt(0, arr.length - 1);
            [arr[i], arr[idx]] = [arr[idx], arr[i]];
        }
    }

    static choice(arr) {
        return arr[this.randInt(0, arr.length - 1)];
    }

    static isPowerOf2(x) {
        return (x & (x - 1)) == 0;
    }

    static max(arr) {
        return Math.max(...arr);
    }

    static min(arr) {
        return Math.min(...arr);
    }

    static avg(arr) {
        return arr.reduce((acc, a) => acc + a) / arr.length;
    }

    static step(edge1, edge2, x) {
        return (x - edge1) / (edge2 - edge1);
    }

    static radToDeg(rad) {
        return rad / Math.PI * 180;
    }

    static degToRad(deg) {
        return deg / 180 * Math.PI;
    }

}

class FileUtils {

    static readImagePixels(image) {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.canvas.width = image.width;
        ctx.canvas.height = image.height;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0);

        const data = [...new Array(image.width)].map(_ => [...new Array(image.height)]);

        const imageData = ctx.getImageData(0, 0, image.width, image.width);
        for (let i = 0; i < imageData.data.length; i += 4) {
            let j = i / 4;
            let
                x = j % image.width,
                y = ~~(j / image.width);
            const pixelColor = (imageData.data[i] << 8 | imageData.data[i + 1]) << 8 | imageData.data[i + 2];

            data[y][x] = pixelColor;
        }

        return data;
    }

}

class Camera {

    pos = vec3.create();
    dir = vec3.fromValues(0, 0, -1);
    up = vec3.fromValues(0, 1, 0);

    vw;
    vh;
    near = 0.1;
    far = 1000;

    projectionMatrix = mat4.create();
    viewMatrix = mat4.create();

    tpmVec = vec3.create();

    updateView() {
        mat4.lookAt(this.viewMatrix, this.pos, vec3.add(vec3.create(), this.pos, this.dir), this.up);
    }

    lookAt(...args) {
        if (args.length == 1) {
            vec3.copy(this.tpmVec, args[0]);
        } else if (args.length == 3) {
            vec3.set(this.tpmVec, ...args);
        }

        vec3.sub(this.tpmVec, this.tpmVec, this.pos);
        vec3.normalize(this.tpmVec, this.tpmVec);

        vec3.copy(this.dir, this.tpmVec);
    }

    getRight() {
        return vec3.cross(this.tpmVec, this.dir, this.up);
    }
}

class PerspectiveCamera extends Camera {

    fov;

    constructor(fov) {
        super();
        this.fov = fov;
    }

    updateProjection() {
        const aspect = this.vw / this.vh;
        mat4.perspective(this.projectionMatrix, MathUtils.degToRad(this.fov), aspect, this.near, this.far);
    }

}

class ShaderUtils {

    static createProgram(vsrc, fsrc) {
        const shaderProgram = gl.createProgram();

        gl.attachShader(shaderProgram, this.compileShader(gl.VERTEX_SHADER, vsrc));
        gl.attachShader(shaderProgram, this.compileShader(gl.FRAGMENT_SHADER, fsrc));

        gl.linkProgram(shaderProgram);
        if (gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) == 0) {
            console.log(gl.getProgramInfoLog(shaderProgram));
        }

        return shaderProgram;
    }

    static compileShader(type, src) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
            console.log(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

}

class Renderer {

    static MAX_SPRITES = 16384;
    static MAX_LIGHTS = 64;
    static MAX_TEXTURES = 8;

    static POS_SIZE = 3;
    static POS_OFFSET = 0;
    static COLOR_SIZE = 4;
    static COLOR_OFFSET = this.POS_SIZE;
    static UV_SIZE = 2;
    static UV_OFFSET = this.COLOR_OFFSET + this.COLOR_SIZE;
    static TEX_ID_SIZE = 1;
    static TEX_ID_OFFSET = this.UV_OFFSET + this.UV_SIZE;
    static NORMAL_SIZE = 3;
    static NORMAL_OFFSET = this.TEX_ID_OFFSET + this.TEX_ID_SIZE;
    static VERT_SIZE = this.POS_SIZE + this.COLOR_SIZE + this.UV_SIZE + this.TEX_ID_SIZE + this.NORMAL_SIZE;

    static positions = [
        [-0.5, 0.5, 0],
        [0.5, 0.5, 0],
        [0.5, -0.5, 0],
        [-0.5, -0.5, 0]
    ];

    static VERT_SRC = `#version 300 es

    layout (location=0) in vec3 aPos;
    layout (location=1) in vec4 aColor;
    layout (location=2) in vec2 aUv;
    layout (location=3) in float aTexID;
    layout (location=4) in vec3 aNormal;
    
    out vec4 vColor;
    out vec2 vUv;
    out float vTexID;
    out vec3 vNormal;
    out vec3 vPos;
    
    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform vec3 uTranslate;
    uniform vec3 uRotate;

    mat4 rx(float rad) {
        float 
            s = sin(rad),
            c = cos(rad);
        return mat4(
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        );
    }
    
    mat4 ry(float rad) {
        float 
            s = sin(rad),
            c = cos(rad);
        return mat4(
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        );
    }

    void main() {
        mat4
            mrx = rx(uRotate.x), 
            mry = ry(uRotate.y);

        vColor = aColor;
        vUv = aUv;
        vTexID = aTexID;
        vNormal = mat3(mry) * aNormal;
        vPos = (mrx * mry * vec4(aPos, 1.0)).xyz + uTranslate;

        gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPos, 1.0);
    }`;

    static FRAG_SRC = `#version 300 es

    precision highp float;
    
    in vec4 vColor;
    in vec2 vUv;
    in float vTexID;
    in vec3 vNormal;
    in vec3 vPos;
    
    uniform sampler2D uTexSlots[${this.MAX_TEXTURES}];
    
    uniform vec3 uLights[${this.MAX_LIGHTS * 2}];
    uniform int uNumLights;
    
    out vec4 color;
    
    void main(void) {
        int idx = int(vTexID + 0.001);
        switch(idx) {
            case 1:
                color = vColor * texture(uTexSlots[1], vUv);
                break;
            case 2:
                color = vColor * texture(uTexSlots[2], vUv);
                break;
            case 3:
                color = vColor * texture(uTexSlots[3], vUv);
                break;
            case 4:
                color = vColor * texture(uTexSlots[4], vUv);
                break;
            case 5:
                color = vColor * texture(uTexSlots[5], vUv);
                break;
            case 6:
                color = vColor * texture(uTexSlots[6], vUv);
                break;
            case 7:
                color = vColor * texture(uTexSlots[7], vUv);
                break;
            default:
                color = vColor;
        }
    
        vec3 lightColor;
        for(int i = 0; i < uNumLights * 2; i += 2) {
            lightColor += max(dot(vNormal, normalize(uLights[i] - vPos)), 0.0) * (1.0 / pow(length(uLights[i] - vPos), 2.0)) * uLights[i + 1];
        }
        color.rgb = color.rgb * (lightColor + 0.4);
    }`;

    buffer;
    numSprites = 0;
    lightBuffer;
    numLights = 0;

    shaderProgram;
    vao;
    vbo;
    ebo;

    drawCalls = [];
    textures = [];
    texSlots = [0, 1, 2, 3, 4, 5, 6, 7];

    uProjectionMatrix_Loc;
    uViewMatrix_Loc;
    uTexSlots_Loc;
    uLights_Loc;
    uNumLights_Loc;
    uTranslate_Loc;
    uRotate_Loc;

    constructor() {
        this.buffer = new Float32Array(Renderer.MAX_SPRITES * 4 * Renderer.VERT_SIZE);
        this.lightBuffer = new Float32Array(Renderer.MAX_LIGHTS * 6);
    }

    init() {
        this.shaderProgram = ShaderUtils.createProgram(Renderer.VERT_SRC, Renderer.FRAG_SRC);
        gl.useProgram(this.shaderProgram);

        this.uProjectionMatrix_Loc = gl.getUniformLocation(this.shaderProgram, "uProjectionMatrix");
        this.uViewMatrix_Loc = gl.getUniformLocation(this.shaderProgram, "uViewMatrix");
        this.uTexSlots_Loc = gl.getUniformLocation(this.shaderProgram, "uTexSlots");
        this.uLights_Loc = gl.getUniformLocation(this.shaderProgram, "uLights");
        this.uNumLights_Loc = gl.getUniformLocation(this.shaderProgram, "uNumLights");
        this.uTranslate_Loc = gl.getUniformLocation(this.shaderProgram, "uTranslate");
        this.uRotate_Loc = gl.getUniformLocation(this.shaderProgram, "uRotate");

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.vertexAttribPointer(0, Renderer.POS_SIZE, gl.FLOAT, false, Renderer.VERT_SIZE * 4, Renderer.POS_OFFSET * 4);
        gl.vertexAttribPointer(1, Renderer.COLOR_SIZE, gl.FLOAT, false, Renderer.VERT_SIZE * 4, Renderer.COLOR_OFFSET * 4);
        gl.vertexAttribPointer(2, Renderer.UV_SIZE, gl.FLOAT, false, Renderer.VERT_SIZE * 4, Renderer.UV_OFFSET * 4);
        gl.vertexAttribPointer(3, Renderer.TEX_ID_SIZE, gl.FLOAT, false, Renderer.VERT_SIZE * 4, Renderer.TEX_ID_OFFSET * 4);
        gl.vertexAttribPointer(4, Renderer.NORMAL_SIZE, gl.FLOAT, false, Renderer.VERT_SIZE * 4, Renderer.NORMAL_OFFSET * 4);

        this.ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.genIndices(), gl.STATIC_DRAW);
    }

    genIndices() {
        const indices = new Uint16Array(Renderer.MAX_SPRITES * 6);
        const idxCache = [
            0, 1, 2,
            0, 2, 3
        ];
        for (let i = 0; i < Renderer.MAX_SPRITES; ++i) {
            for (let j = 0; j < 6; ++j) {
                indices[i * 6 + j] = idxCache[j] + i * 4;
            }
        }
        return indices;
    }

    beginFrame(r, g, b) {
        gl.clearColor(r, g, b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        this.numLights = 0;
    }

    submitBuffer() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.buffer.subarray(0, this.numSprites * 4 * Renderer.VERT_SIZE), gl.STATIC_DRAW);
    }

    draw(translate, rotate, offset, numSprites) {
        this.drawCalls.push({
            translate,
            rotate,
            offset,
            numSprites
        });
    }

    addQuad(positions, color, sprite) {
        let
            a = vec3.sub(vec3.create(), positions[1], positions[0]),
            b = vec3.sub(vec3.create(), positions[1], positions[3]);

        let normal = vec3.cross(vec3.create(), a, b);
        let coords = sprite.coords;

        for (let i = 0; i < 4; ++i) {
            const offset = (this.numSprites * 4 + i) * Renderer.VERT_SIZE;

            const pos = positions[i];
            for (let j = 0; j < Renderer.POS_SIZE; ++j) {
                this.buffer[offset + Renderer.POS_OFFSET + j] = pos[j];
            }

            for (let j = 0; j < Renderer.COLOR_SIZE; ++j) {
                this.buffer[offset + Renderer.COLOR_OFFSET + j] = color[j];
            }

            for (let j = 0; j < Renderer.UV_SIZE; ++j) {
                this.buffer[offset + Renderer.UV_OFFSET + j] = coords[i * Renderer.UV_SIZE + j];
            }

            let texID = 0;
            if (sprite.tex != null) {
                if (!this.textures.includes(sprite.tex)) {
                    this.textures.push(sprite.tex);
                }
                texID = this.textures.indexOf(sprite.tex) + 1;
            }
            this.buffer[offset + Renderer.TEX_ID_OFFSET] = texID;

            for (let j = 0; j < Renderer.NORMAL_SIZE; ++j) {
                this.buffer[offset + Renderer.NORMAL_OFFSET + j] = normal[j];
            }
        }
        ++this.numSprites;
    }

    addSprite(translate, scale, rot, color, sprite) {
        const positions = new Array(4);
        for (let i = 0; i < 4; ++i) {
            let pos = vec3.clone(Renderer.positions[i]);
            vec3.mul(pos, pos, scale);
            vec3.rotateX(pos, pos, [0, 0, 0], rot[0]);
            vec3.rotateY(pos, pos, [0, 0, 0], rot[1]);
            vec3.add(pos, pos, translate);
            positions[i] = pos;
        }
        this.addQuad(positions, color, sprite);
    }

    addLight(pos, intensity, r, g, b) {
        if (this.numLights < Renderer.MAX_LIGHTS) {
            this.lightBuffer.set([...pos, r * intensity, g * intensity, b * intensity], this.numLights * 6);
            ++this.numLights;
        }
    }

    endFrame(camera) {
        gl.useProgram(this.shaderProgram);

        gl.uniformMatrix4fv(this.uProjectionMatrix_Loc, false, camera.projectionMatrix);
        gl.uniformMatrix4fv(this.uViewMatrix_Loc, false, camera.viewMatrix);
        gl.uniform1iv(this.uTexSlots_Loc, this.texSlots);
        gl.uniform1i(this.uNumLights_Loc, this.numLights);
        gl.uniform3fv(this.uLights_Loc, this.lightBuffer);

        for (let i = 0; i < this.textures.length; ++i) {
            gl.activeTexture(gl.TEXTURE0 + i + 1);
            this.textures[i].bind();
        }

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);
        gl.enableVertexAttribArray(4);

        for (let c of this.drawCalls) {
            gl.uniform3fv(this.uTranslate_Loc, c.translate);
            gl.uniform3fv(this.uRotate_Loc, c.rotate);

            gl.drawElements(gl.TRIANGLES, c.numSprites * 6, gl.UNSIGNED_SHORT, c.offset * 2 * 6);
        }

        gl.disableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.disableVertexAttribArray(3);
        gl.disableVertexAttribArray(4);

        gl.bindVertexArray(null);

        for (let i = 0; i < this.textures.length; ++i) {
            this.textures[i].unbind();
        }

        gl.useProgram(null);

        this.drawCalls = [];
    }

    getOffset() {
        return this.numSprites;
    }

}

class Texture {

    constructor() {
        this.id = -1;
    }

    init(data) {
        this.id = gl.createTexture();
        this.width = data.width;
        this.height = data.height;

        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    bind() {
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    }

    unbind() {
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    region(x, y, w, h) {
        const sprite = new Sprite(this);
        sprite.setRegion(x, y, w, h);
        return sprite;
    }

    split(sw, sh) {
        let
            numX = ~~(this.width / sw),
            numY = ~~(this.height / sh);

        let sprites = [...new Array(numY)].map(_ => [...new Array(numX)]);

        for (let i = 0; i < numY; ++i) {
            for (let j = 0; j < numX; ++j) {
                sprites[i][j] = new Sprite(this);
                sprites[i][j].setRegion(j * sw, i * sh, sw, sh);
            }
        }
        return sprites;
    }

    static fromImage(data) {
        let tex = new Texture();
        tex.init(data);
        return tex;
    }

}

class Sprite {

    static EMPTY = new Sprite(null);

    constructor(tex) {
        this.tex = tex;
        this.coords = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
    }

    setRegion(x, y, w, h) {
        this.width = w;
        this.height = h;
        let
            tw = this.tex.width,
            th = this.tex.height;
        let
            x1 = x / tw, y1 = y / th,
            x2 = (x + w) / tw, y2 = (y + h) / th;
        this.coords[0] = x1;
        this.coords[1] = y1;
        this.coords[2] = x2;
        this.coords[3] = y1;
        this.coords[4] = x2;
        this.coords[5] = y2;
        this.coords[6] = x1;
        this.coords[7] = y2;
    }
}

class Animation {

    constructor(frameRate, frames) {
        this.frameRate = frameRate;
        this.frames = frames;
        this.dur = frames.length * frameRate;
    }

    getFrame(time) {
        let idx = ~~(time % dur / frameRate);
        return frames[idx];
    }

}

class KeyListener {

    static instance = null;

    keyPressed = new Set();
    keyBeginPress = new Set();
    keyEndPress = new Set();

    static get() {
        if (this.instance == null) {
            this.instance = new KeyListener();
        }

        return this.instance;
    }

    _keyCallback(ev) {
        if (ev.type == "keydown") {
            this.keyPressed.add(ev.code);
        } else {
            this.keyPressed.delete(ev.code);
        }

    }

    static initEvents() {
        addEventListener("keydown", (ev) => this.get()._keyCallback(ev));
        addEventListener("keyup", (ev) => this.get()._keyCallback(ev));
    }

    static isKeyPressed(code) {
        return this.get().keyPressed.has(code);
    }

    static keyBeginPress(code) {
        return this.get().keyBeginPress.has(code);
    }

    static beginFrame() {
        const _this = this.get();
        _this.keyBeginPress.clear();
        _this.keyPressed.forEach(code => {
            if (!_this.keyEndPress.has(code)) {
                _this.keyBeginPress.add(code);
            }
        });
        _this.keyEndPress = new Set(_this.keyPressed);
    }

}

class MouseListener {

    static instance = null;

    pressed = false;
    wasPressed = false;
    clicked = false;
    x = 0;
    y = 0;
    dx = 0;
    dy = 0;
    relX = 0;
    relY = 0;
    prevRelX = 0;
    prevRelY = 0;

    static get() {
        if (this.instance == null) {
            this.instance = new MouseListener();
        }

        return this.instance;
    }

    _mouseCallback(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        if (e.type == "mouseup") {
            this.pressed = false;
        } else {
            if (e.type == "mousedown") {
                this.pressed = true;
            } else {
                this.relX += e.movementX;
                this.relY += e.movementY;
            }

            const boundingRect = e.target.getBoundingClientRect();
            this.x = e.pageX - boundingRect.x;
            this.y = e.pageY - boundingRect.y;
        }
    }

    static initEvents(canvas) {
        canvas.addEventListener("mousedown", (ev) => this.get()._mouseCallback(ev));
        canvas.addEventListener("mouseup", (ev) => this.get()._mouseCallback(ev));
        canvas.addEventListener("mousemove", (ev) => this.get()._mouseCallback(ev));
    }

    static beginFrame() {
        const _this = this.get();

        _this.clicked = !_this.wasPressed && _this.pressed;
        _this.pressed = _this.wasPressed;
        _this.dx = _this.relX - _this.prevRelX;
        _this.dy = _this.relY - _this.prevRelY;
        _this.prevRelX = _this.relX;
        _this.prevRelY = _this.relY;
    }

    static isPressed() {
        return this.get().pressed;
    }

    static getX() {
        return this.get().x;
    }

    static getY() {
        return this.get().y;
    }

    static getDeltaX() {
        return this.get().dx;
    }

    static getDeltaY() {
        return this.get().dy;
    }

}

class TouchListener {

    static MAX_TOUCHES = 8;
    static instance = null;

    touches;

    static get() {
        if (this.instance == null) {
            this.instance = new TouchListener();
        }
        return this.instance;
    }

    constructor() {
        this.touches = [...new Array(TouchListener.MAX_TOUCHES)].map(_ => ({
            x: 0,
            y: 0,
            prevX: 0,
            prevY: 0,
            dx: 0,
            dy: 0,
            wasTouched: false,
            touched: false,
            justTouched: false
        }));
    }

    _touchCallback(e) {
        if (e.cancelable && e.type == "touchmove") {
            e.preventDefault();
        }
        if (e.type == "touchcancel") {
            for (let touch of this.touches) {
                touch.touched = false;
            }
        } else {
            const boundingRect = e.target.getBoundingClientRect();
            for (let touch of e.changedTouches) {
                const touchID = touch.identifier;
                if (this.touches[touchID]) {
                    const touchInfo = this.touches[touchID];
                    if (e.type == "touchend") {
                        touchInfo.touched = false;
                    } else {
                        touchInfo.touched = true;
                        touchInfo.x = touch.pageX - boundingRect.x;
                        touchInfo.y = touch.pageY - boundingRect.y;
                    }
                }
            }
        }
    }

    static initEvents(canvas) {
        canvas.addEventListener("touchstart", (ev) => this.get()._touchCallback(ev));
        canvas.addEventListener("touchmove", (ev) => this.get()._touchCallback(ev));
        canvas.addEventListener("touchend", (ev) => this.get()._touchCallback(ev));
        canvas.addEventListener("touchcancel", (ev) => this.get()._touchCallback(ev));
    }

    static beginFrame() {
        const _this = this.get();

        for (let touchInfo of _this.touches) {
            if (!touchInfo.wasTouched && touchInfo.touched) {
                touchInfo.justTouched = true;
                touchInfo.prevX = touchInfo.x;
                touchInfo.prevY = touchInfo.y;
            } else {
                touchInfo.justTouched = false;
            }
            touchInfo.wasTouched = touchInfo.touched;
            touchInfo.dx = touchInfo.x - touchInfo.prevX;
            touchInfo.dy = touchInfo.y - touchInfo.prevY;
            touchInfo.prevX = touchInfo.x;
            touchInfo.prevY = touchInfo.y;
        }
    }

    static isTouched(idx = 0) {
        return this.get().touches[idx].touched;
    }

    static isJustTouched(idx = 0) {
        return this.get().touches[idx].justTouched;
    }

    static getX(idx = 0) {
        return this.get().touches[idx].x;
    }

    static getY(idx = 0) {
        return this.get().touches[idx].y;
    }

    static getDeltaX(idx = 0) {
        return this.get().touches[idx].dx;
    }

    static getDeltaY(idx = 0) {
        return this.get().touches[idx].dy;
    }

}

class Device {

    static DESKTOP = 1;
    static MOBILE = 2;

    static type = null;

    static getType() {
        if (this.type == null) {
            const ua = navigator.userAgent;
            this.type = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua) ? this.MOBILE : this.DESKTOP;
        }
        return this.type;
    }

}

let
    canvas,
    /** @type {WebGL2RenderingContext} */
    gl;
let
    sw,
    sh;
let
    lastTime,
    delta = 0,
    totalTime = 0;
let scene;
let renderer = new Renderer();
let camera = new PerspectiveCamera(60);

let levelData = [];

let
    model_door;

const model_init_door = () => {
    let offset = renderer.getOffset();

    let
        s = [
            Level.TILE_SIZE,
            Level.TILE_SIZE,
            Level.TILE_SIZE * 0.25
        ],
        c = [1, 1, 1, 1];
    c1 = [0.15, 0.22, 0.38, 1];

    renderer.addSprite([0, 0, s[2] * 0.5], s, [0, 0, 0], c, spritesheet_tileset[0][3]);
    renderer.addSprite([0, 0, s[2] * -0.5], s, [0, Math.PI, 0], c, spritesheet_tileset[0][3]);
    renderer.addSprite([s[0] * -0.5, 0, 0], [s[2], s[1], s[0]], [0, Math.PI * -0.5, 0], c1, Sprite.EMPTY);
    renderer.addSprite([s[0] * 0.5, 0, 0], [s[2], s[1], s[0]], [0, Math.PI * 0.5, 0], c1, Sprite.EMPTY);
    renderer.addSprite([0, s[1] * 0.5, 0], [s[0], s[2], s[1]], [Math.PI * -0.5, 0, 0], c1, Sprite.EMPTY);
    renderer.addSprite([0, s[1] * -0.5, 0], [s[0], s[2], s[1]], [Math.PI * 0.5, 0, 0], c1, Sprite.EMPTY);

    return {
        offset: offset,
        numSprites: 6
    };
}

let
    tex_tileset,
    spritesheet_tileset;

const ASSETS_URL = "";

const init = async () => {
    await Promise.all([
        AssetPool.loadImage("tileset", ASSETS_URL + "assets/images/lab-tileset-1.png"),
        AssetPool.loadImage("map1", ASSETS_URL + "assets/maps/map-1.gif")
    ]);

    canvas = document.createElement("canvas");
    canvas.oncontextmenu = e => {
        e.stopPropagation();
        e.preventDefault();
    }
    
    gl = canvas.getContext("webgl2");
    document.body.appendChild(canvas);

    addEventListener("resize", resize);
    resize();

    tex_tileset = Texture.fromImage(AssetPool.getImage("tileset"));
    spritesheet_tileset = tex_tileset.split(32, 32);

    renderer.init();
    KeyListener.initEvents();
    MouseListener.initEvents(canvas);
    TouchListener.initEvents(canvas);

    levelData = [
        Level.loadContainer(AssetPool.getImage("map1"), spritesheet_tileset)
    ];

    model_door = model_init_door();

    renderer.submitBuffer();

    alert("Click to start");

    canvas.onclick = () => {
        canvas.onclick = () => {
            canvas.requestPointerLock();
            canvas.requestFullscreen().catch(err => {
                console.log(err.message);
            });
        }
        canvas.onclick();

        scene = new Level();
        scene.init(levelData[0]);

        requestAnimationFrame(loop);
    }
}

const resize = () => {
    camera.vw = canvas.width = sw = innerWidth;
    camera.vh = canvas.height = sh = innerHeight;
    camera.updateProjection();
}

const loop = (timeNow) => {
    timeNow *= 0.001;
    if (!lastTime) lastTime = timeNow;
    delta = Math.min(timeNow - lastTime, 0.05);
    totalTime += delta;
    lastTime = timeNow;

    KeyListener.beginFrame();
    MouseListener.beginFrame();
    TouchListener.beginFrame();

    scene.update();
    camera.updateView();
    scene.render();

    requestAnimationFrame(loop);
}

const changeScene = (newScene, sceneParams) => {
    scene = newScene;
    scene.init(sceneParams);
}

addEventListener("DOMContentLoaded", init);