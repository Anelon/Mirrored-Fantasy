import Box from "../box.js";
import { Rectangle } from "../shapes.js";
import { CATEGORY, TILE_NAMES, TYPES } from "../utils/enums.js";
import Vec2 from "../vec2.js";

export default class Tile {
    /**
     * @param {Vec2} location
     * @param {string} name name of the tilesprite to draw
     * @param {boolean} walkable
     * @param {boolean} passable
     * @param {boolean} breakable
     * @param {number} around
     */
    constructor(location, name, walkable, passable, breakable, around) {
        this.location = location;
        this.name = name;
        this.walkable = walkable;
        this.passable = passable;
        this.breakable = breakable;
        this.around = around;
        this.overlapping = false;
        this.tileSize = new Vec2();
        this.category = CATEGORY.tile;
        this.type = TYPES.basic;
    }
    /**
     * @param {Vec2} location
     * @param {number} around
     */
    init(location, around) {
        this.location = location;
        this.around = around;
        return this;
    }
    /**
     * @param {{ walkable: boolean; passable: boolean; breakable: boolean }} traversalObject
     */
    setTraversal(traversalObject) {
        this.walkable = traversalObject.walkable;
        this.passable = traversalObject.passable;
        this.breakable = traversalObject.breakable;
        return this;
    }
    clone() {
        return new Tile(new Vec2(this.location.x, this.location.y), this.name, this.walkable, this.passable, this.breakable, this.around);
    }
    /**
     * @param {Vec2} tileSize
     * @param {Vec2} topLeft
     */
    makeBox(tileSize, topLeft) {
        this.tileSize = tileSize;
        const center = this.location.add(topLeft).multiplyVecS(tileSize).addS(tileSize.multiplyScalar(0.5));
        return new Box(center, tileSize, this);
    }
    makeShape() {
        const center = this.location.multiplyVec(this.tileSize).addS(this.tileSize.multiplyScalar(0.5));
        return new Rectangle(center, this.tileSize.x, this.tileSize.y);
    }
    /**
     * @param {import("../entity.js").default} other
     */
    hit(other) {
        if (other.category === CATEGORY.player) {
            if (!this.walkable) {
                //TODO just block what would colide with (x values if above or below)
                //put player back to old location
                other.location = other.oldLocation;
            }
        }
        if (other.category === CATEGORY.projectile) {
            if (this.breakable) {
                this.walkable = true;
                this.passable = true;
                this.breakable = false;
                this.name = TILE_NAMES[" "];
            }
        }

    }
}
