//this will probably change a lot when we make an actual map
import Vec2 from "./vec2.js";
import QuadTree from "./quadTree.js";
import { Rectangle, Circle } from "./shapes.js";
import Projectile from "./ability/projectile.js";
import Player from "./player.js";
import Time from "./utils/time.js";
/** @typedef {import("./entity.js").default} Entity */
/** @typedef {import("./dragon.js").default} Dragon */
/** @typedef {import("./map/region.js").default} Region */
//import PlayerController from "../clientJS/playerController.js";
//import { MinPriorityQueue } from '@datastructures-js/priority-queue';


export default class CollisionEngine {
    /**
     * Constructs a CollisionEngine
     * @param {number} width Width of map region
     * @param {number} height Height of map region
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;

        //map for holding player and projectiles id -> object
        this.players = new Map();
        this.dynamics = new Map();

        this.boundry = new Rectangle(new Vec2(this.width/2, this.height/2), this.width, this.height);
        this.qTreeCapacity = 10;
        this.collisionTree = new QuadTree(this.boundry, this.qTreeCapacity);
        this.staticObjects = new QuadTree(this.boundry, this.qTreeCapacity);
        this.regions = new Array();
    }

    /**
     * Updates all player's and projectiles based on the changed time and checks for colisions
     * @param {Time} time 
     * @param {number} step The tick time
     * @returns {Array<Entity>} Objects that should be deleted
     */
    update(time, step) {

        //reset regions overlapping
        for(const region of this.regions) {
            const endOverlap = region.resetOverlaps();
        }
        //reset quadTree, might change to updating locations of each item later if we end up with too many static items
        this.collisionTree = new QuadTree(this.boundry, this.qTreeCapacity);
        const deleteList = new Array();

        //move everything and place in collision quad tree
        for (const player of this.players.values()) {
            if(!this.collisionTree.push(player.makePoint())) {
                //prevent player from leaving the map
                player.location = player.oldLocation;
                this.collisionTree.push(player.makePoint());
            }
            player.overlapping = false;
            //check if the player is in any regions
            for(const region of this.regions) {
                if(region.contains(player.location)) {
                    const newOverlap = region.addOverlaps(player);
                    if (newOverlap) {
                        deleteList.push(region);
                        //possibly do something although handled on the region class
                    }
                }
            }
        }
        for (const region of this.regions) {
            if(region.lastOverlaps.size && !region.overlaps.size) {
                region.endOverlap();
            }
        }
        for (const dynamic of this.dynamics.values()) {
            dynamic.update(time, step, this);
            const added = this.collisionTree.push(dynamic.makePoint());
            //if dynamic is out of the map region delete it
            if(!added) {
                deleteList.push(dynamic);
            }
            dynamic.overlapping = false;
        }
        //check for collisions
        for (const player of this.players.values()) {
            const playerShape = player.makeShape();
            //make shape with 2 to have it search an area double the size of the player
            const others = this.collisionTree.query(playerShape);
            this.staticObjects.query(playerShape, others);
            for(const other of others) {
                if(other.owner === player) continue;
                if(playerShape.intersects(other)) {
                    player.overlapping = true;
                    //should probably do something other for the players rather than deleting
                    if(player.hit(other.owner)) deleteList.push(player);
                    other.owner.overlapping = true;
                    if(other.owner.hit(player)) deleteList.push(other.owner);
                }
            }
        }
        for (const dynamic of this.dynamics.values()) {
            //skip dynamic that have already done something
            if (deleteList.includes(dynamic)) continue;
            const dynamicShape = dynamic.makeShape();
            //make shape with 2 to have it search an area double the size of the dynamic
            const others = this.collisionTree.query(dynamicShape);
            //check static objects as well
            this.staticObjects.query(dynamicShape, others);
            for(const other of others) {
                if(other.owner === dynamic) continue;
                if(dynamicShape.intersects(other)) {
                    dynamic.overlapping = true;
                    if(dynamic.hit(other.owner)) deleteList.push(dynamic);
                    other.owner.overlapping = true;
                    if(other.owner.hit(dynamic)) deleteList.push(other.owner);
                }
            }
        }

        return deleteList;
    }

    /**
     * Adds player to the players Map
     * @param {Player} newPlayer 
     */
    addPlayer(newPlayer) {
        this.players.set(newPlayer.id, newPlayer);
    }

    /**
     * Removes player from player Map
     * @param {Player|string} oldPlayer A player object or playerID
     */
    removePlayer(oldPlayer) {
        if(oldPlayer instanceof Player) {
            this.players.delete(oldPlayer.id);
        } else {
            this.players.delete(oldPlayer);
        }
    }

    /**
     * Updates the player on the map or creates a new player
     * @param {Player} playerJSON 
     * @param {Array<string>} objectives 
     * @returns {Player|boolean}
     */
    updatePlayer(playerJSON, objectives) {
        const player = this.players.get(playerJSON.id);
        //this should not happen in production hopefully
        //console.assert(player instanceof Player, "Player not found", playerJSON.id);
        if(player instanceof Player) {
            player.updateInfo(playerJSON, objectives);
            return false;
        } else {
            //handle if the server reloads but the client doesn't (could just reset the client but this seems better for development)
            const {
                location, oldLocation, spawnLocation, name, imgSrc, speed, maxHealth, hitbox, scale
            } = playerJSON;
            const loc = new Vec2(location.x, location.y);
            const oldLoc = new Vec2(oldLocation.x, oldLocation.y);
            const spawnLoc = new Vec2(spawnLocation.x, spawnLocation.y);
            let newPlayer = new Player(loc, name, imgSrc, speed, maxHealth, new Circle(loc, hitbox.radius), scale);
            newPlayer.oldLocation = oldLoc;
            newPlayer.spawnLocation = spawnLoc;
            newPlayer.id = playerJSON.id;
            this.addPlayer(newPlayer);
            return newPlayer;
        }
    }

    /**
     * Adds dynamic to the dynamics Map
     * @param {Projectile|Dragon} newDynamic 
     */
    addDynamic(newDynamic) {
        this.dynamics.set(newDynamic.id, newDynamic);
    }

    /**
     * Removes Dynamic from player Map
     * @param {Projectile|Dragon} oldDynamic 
     */
    removeDynamic(oldDynamic) {
        if(oldDynamic.id) {
            if(!this.dynamics.has(oldDynamic.id)) return;
            this.dynamics.delete(oldDynamic.id);
        } else {
            if(!this.dynamics.has(oldDynamic)) return;
            this.dynamics.delete(oldDynamic);
        }
    }
    /**
     * @param {import("./box.js").default[]} statics
     */
    addStatics(statics) {
        for(const stat of statics) {
            this.staticObjects.push(stat);
        }
    }
    /**
     * @param {import("./box.js").default[]} statics
     */
    setStatics(statics) {
        this.staticObjects = new QuadTree(this.boundry, this.qTreeCapacity);
        for(const stat of statics) {
            this.staticObjects.push(stat);
        }
    }
    /**
     * @param {Array<Region>} regions
     */
    setRegions(regions) {
        this.regions = regions;
    }
}