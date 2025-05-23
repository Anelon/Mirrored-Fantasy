import Vec2 from "./vec2.js";
import Point from "./point.js";
import { Circle, Rectangle } from "./shapes.js";
import Time from "./utils/time.js";
import { TYPES, CATEGORY } from "./utils/enums.js";
/** @typedef {import("./collisionEngine.js").default} CollisionEngine */

let idGen = 0;
export default class Entity {
    /**
     * Makes a new Entity
     * @constructor
     * @param {Vec2} location The start location of Entity
     * @param {string} imgSrc Display image
     * @param {Circle|Rectangle} hitbox Hittable region
     * @param {number} [speed=0] How many pixels the entity moves per second
     * @param {number} [scale=1] The scale factor to get to 64 pixels per tile
     * @param {Vec2} [lookDirection=Vec2(1,0)] Which direction the entity is looking at
     */
    constructor(location, imgSrc, hitbox, speed = 0, scale = 1, lookDirection = new Vec2(1,0)) {
        console.assert(location instanceof Vec2, "Loaction not a Vec2", location);
        if(!(location instanceof Vec2)) {
            throw TypeError("Entity: Location not Vec2");
        }
        this.id = (idGen++).toString();
        this.location = location.clone();
        this.oldLocation = location.clone();
        this.imgSrc = imgSrc;
        this.hitbox = hitbox.clone();
        this.lookDirection = lookDirection;
        this.speed = speed;
        this.scale = scale;
        //mostly for debugging now
        this.overlapping = false;
        this.damage = 0;
        this.maxHealth = 0;
        this.currHealth = 0;

        this.type = TYPES.basic;
        this.category = CATEGORY.none;
        this.lastHit = null;
    }
    get x() {
        return this.location.x;
    }
    get y() {
        return this.location.y;
    }

    /**
     * Makes a point and assigns Entity as owner
     * @returns {Point}
     */
    makePoint() {
        return new Point(this.location, this.hitbox.halfWidth, this);
    }

    /**
     * Creates a cirlce based on the size and location of Entity
     * @param {number} [scale=1] The scale of the shape you want to make
     * @returns {Circle}
     */
    makeShape(scale = 1) {
        return new Circle(this.location, (this.hitbox.halfWidth) * scale);
    }

    /**
     * Converts an Entity to a JSON object with the type as constructor name
     * @returns {object}
     */
    makeObject() {
        let objectType = this.constructor.name;
        let objectJson = JSON.stringify(this);
        return {type: objectType, json: objectJson};
    }

    /**
     * Updates the Entity based on how much time has passed and the map state
     * @param {Time} time 
     * @param {number} dt The time sinse last frame
     * @param {CollisionEngine} collisionEngine The time sinse last frame
     */
    update(time, dt, collisionEngine) {
        if(this.speed > 0) {
            this.move(dt, this.lookDirection);
        }
    }
    /**
     * Moves the character in direction at this.speed * dt
     * @param {number} dt 
     * @param {Vec2} direction 
     */
    move(dt, direction) {
        if(!(direction instanceof Vec2)) {
            throw TypeError("Moveable move: Direction not Vec2");
        }
        this.oldLocation = this.location.clone();

        let dist = this.speed * dt;
        this.location.addS(direction.getUnit().multiplyScalar(dist));
    }

    /**
     * Given a JSON object it updates the entity
     * @param {Entity} infoJSON Contains what needs to be updated
     * @retruns {Entity}
     */
    updateInfo(infoJSON) {
        if(infoJSON.id) this.id = infoJSON.id;
        if(infoJSON.location) {
            this.location = new Vec2(infoJSON.location.x, infoJSON.location.y);
        }
        if(infoJSON.oldLocation) {
            this.oldLocation = new Vec2(infoJSON.oldLocation.x, infoJSON.oldLocation.y);
        }
        if(infoJSON.lookDirection) {
            this.lookDirection = new Vec2(infoJSON.lookDirection.x, infoJSON.lookDirection.y);
        }
        if(infoJSON.speed) {
            this.speed = infoJSON.speed;
        }
        if(infoJSON.lastHit) {
            this.lastHit = infoJSON.lastHit;
        }
        return this;
    }
    /**
     * Returns false saying do nothing be default to default entity
     * @param {Entity} other 
     */
    hit(other) {
        return false;
    }
    //should be called when projectile hits max range
    think(map) {
    }
    /**
     * @param {number} damage
     * @param {string} hitID
     */
    hurt(damage, hitID) {
        if(this.lastHit === hitID) return;
        this.lastHit = hitID;
        this.currHealth -= damage;
    }
}
