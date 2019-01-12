// dependencies

import "./theLevel.css"
/*----------------------------------------Basic Level Design--------------------------------- */
let simpleLevelPlan = `
......................
..#................#..
..#..............=.#..
..#.........o.o....#..
..#.@......#####...#..
..#####............#..
......#++++++++++++#..
......##############..
......................`;
/*----------------------------------------The Level Itself--------------------------------- */
class Level {
    constructor(plan) {
        // Use trim to remove white space at start and end of plan, allowing all lines to start directly below each other
        // The rest is split on newline characters, with each line being spread into an array
        let rows = plan.trim().split("\n").map(l => [...l]); 
        // rows holds the array of arrays of characters (the rows of the plan)
        this.height = rows.length;
        this.width = rows[0].length;
        // height and width are derived from the rows array
        this.startActors = []; // Distinguishes moving elements from the static background, will be stored in an array of objects.

        // map over rows + content to create arrays
        this.rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let type = levelChars[ch];                          // Constructor uses this object to map background elements to strings and actors to classes
                if (typeof type == "string") return type;           // when type is an actor, it creates an object, which is added to startActors
                this.startActors.push(                              // which allows the mapping function to return "empty" for the background square
                    type.create(new Vec(x, y), ch));                // Actor position is stored as a Vec obj. 
                return "empty";
            });
        });
    }
}
/*----------------------------------------State Manager--------------------------------- */
class State {
    constructor(level, actors, status) {
        this.level = level;
        this.actors = actors;
        this.status = status;
    }

    static start(level) {
        return new State(level, level.startActors, "playing");
    }

    get player() {
        return this.actors.find(a => a.type == "player");
    }
}

// Persistent data structure, so updating the game will create a new state and leave the old one intact.


/*----------------------------------------Vec Class For Location and Size--------------------------------- */
class Vec {
    constructor(x, y) {
        this.x = x; this.y = y;
    }
    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }
    times(factor) {
        return new Vec(this.x * factor, this.y * factor);
    }
}

/*----------------------------------------Player Class--------------------------------- */
class Player {
    constructor(pos, speed) {
        this.pos = pos;
        this.speed = speed;
    }

    get type() { return "player"; }

    static create(pos) {
        return new Player(pos.plus(new Vec(0, -0.5)),
                            new Vec(0, 0));
    }
}

Player.prototype.size = new Vec(0.8, 1.5);

/*----------------------------------------Lava Class--------------------------------- */
class Lava {
    constructor(pos, speed, reset) {
        this.pos = pos;
        this.speed = speed;
        this.reset = reset;
    }

    get type() { return "lava"; }

    static create(pos, ch) {
        if (ch == "=") {
            return new Lava(pos, new Vec(2, 0));
        } else if (ch == "|") {
            return new Lava(pos, new Vec(0, 2));
        } else if (ch == "v") {
            return new Lava(pos, new Vec(0,3), pos);
        }
    }
}

Lava.prototype.size = new Vec(1, 1);

/*----------------------------------------Coin Class--------------------------------- */
class Coin {
    constructor(pos, basePos, wobble) {
        this.pos = pos;
        this.basePos = basePos;
        this.wobble = wobble;
    }

    get type() { return "coin"; }

    static create(pos) {
        let basePos = pos.plus(new Vec(0.2, 0.1));
        return new Coin(basePos, basePos,
                        Math.random() * Math.PI * 2);
    }
}

Coin.prototype.size = new Vec(0.6, 0.6);

/*----------------------------------------Level Character Mapping--------------------------------- */
const levelChars = {
    ".": "empty", "#": "wall", "+": "lava",
    "@": Player, "o": Coin,
    "=": Lava, "|": Lava, "v": Lava
};

/*----------------------------------------Create The Level--------------------------------- */
let simpleLevel = new Level(simpleLevelPlan);
// console.log(`${simpleLevel.width} by ${simpleLevel.height}`);

/*-----------------------------------------Function For Elements w/Attributes + Child Nodes--------------------------------------------------------*/

function elt(name, attrs, ...children) {
    let dom = document.createElement(name);
    for (let attr of Object.keys(attrs)) {
        dom.setAttribute(attr, attrs[attr]);
    }
    for (let child of children) {
        dom.appendChild(child);
    }
    return dom;
}

/*----------------------------------------Creates A Display------------------------------------*/
class DOMDisplay {
    constructor(parent, level) {
        this.dom = elt("div", {class: "game"}, drawGrid(level));
        this.actorLayer = null;
        parent.appendChild(this.dom);
    }

    clear() { this.dom.remove(); }
}

// BG Grid is drawn once, as it never changes. Actors are redrawn every time the display is updated with a given state.

function drawGrid(level) {
    return elt("table", {
        class: "background",
        style: `width: ${level.width * scale}px`
    }, ...level.rows.map(row =>
        elt("tr", {style: `height: ${scale}px`},
            ...row.map(type => elt("td", {class: type})))
    ));
}

// The spread operator is used to pass arrays of child nodes to elt as separate arguments

/*-----------------------------------Draw each actor--------------------------*/

function drawActors(actors) {
    return elt("div", {}, ...actors.map(actor=> {
        let rect = elt("div", {class: `actor ${actor.type}`});
        rect.style.width = `${actor.size.x * scale}px`;
        rect.style.height = `${actor.size.y * scale}px`;
        rect.style.left = `${actor.pos.x * scale}px`;
        rect.style.top = `${actor.pos.y * scale}px`;
        return rect;
    }));
}

/*-----------------------------------syncState is used to make the display show a given state.it Removes old actor graphics and redraws new positions-------*/
DOMDisplay.prototype.syncState = function(state) {
    if (this.actorLayer) this.actorLayer.remove();
    this.actor = drawActors(state.actors);
    this.dom.appendChild(this.actorLayer);
    this.dom.className = `game ${state.status}`;
    this.scrollPlayerIntoView(state);
};

/*------Scroll Player Into View, incase of overflow---------*/
DOMDisplay.prototype.scrollPlayerIntoView = function(state) {
    let width = this.dom.clientWidth;
    let height = this.dom.clientHeight;
    let margin = width / 3;

    // The Viewport
    let left = this.dom.scrollLeft, right = left + width;
    let top = this.dom.scrollTop, bottom = top + height;

    let player = state.player;
    let center = player.pos.plus(player.size.times(0.5))
                            .times(scale);
    
    if (center.x < left + margin) {
        this.dom.scrollLeft = center.x - margin;
    } else if (center.x > right - margin) {
        this.dom.scrollLeft = center.x + margin - width;
    }
    if (center.y < top + margin) {
        this.dom.scrollTop = center.y - margin;
    } else if (center.y > bottom - margin) {
        this.dom.scrollTop = center.y + margin - height;
    }
};
