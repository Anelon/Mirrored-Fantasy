import Vec2 from "../sharedJS/vec2.js";
import { Circle } from "../sharedJS/shapes.js";
import Ability from "../sharedJS/ability/ability.js";
import CHANNELS from "../sharedJS/utils/channels.js";
import Player from "../sharedJS/player.js";
import { keyBinds, keyPress } from "./keyBinds.js";
import CollisionEngine from "../sharedJS/collisionEngine.js";
import CanvasWrapper from "./canvasWrapper.js";
import Time from "../sharedJS/utils/time.js";
import Projectile from "../sharedJS/ability/projectile.js";
import FireballAbility from "../sharedJS/ability/fireballAbility.js";
import WaterballAbility from "../sharedJS/ability/waterballAbility.js";
import PlantSeedAbility from "../sharedJS/ability/plantSeedAbility.js";

//class for handling the current player
export default class PlayerController extends Player {
    /**
     * @param {Vec2} location
     * @param {string} name
     * @param {string} imgSrc
     * @param {number} speed
     * @param {number} health
     * @param {number} scale
     * @param {CanvasWrapper} canvas
     * @param {boolean} hasUI
     */
    constructor(location, name, imgSrc, speed, health, scale, canvas, hasUI = true) {
        let hitbox = new Circle(location, Player.WIDTH);
        super(location, name, imgSrc, speed, health, hitbox, scale);
        this.baseSpeed = speed;
        this.name = name;
        this.hasUI = hasUI
        /** @type {HTMLImageElement} */
        this.image = document.querySelector(`img#${imgSrc}`);


        if (this.hasUI) {
            /** @type {HTMLProgressElement} */
            this.healthBar = document.querySelector("progress#healthBar");
            this.healthBar.max = this.maxHealth;
            this.healthBar.value = this.currHealth;

            /** @type {HTMLSpanElement} */
            this.healthValue = document.querySelector("span#healthNum");
            this.healthValue.innerText = this.currHealth.toString();
        }


        //create default abilities
        this.abilities = {
            //[keyBinds.MELEE]: new Ability("Melee", 100, 100, 100, 10, Projectile, 1, new Circle(new Vec2(), 16)),
            [keyBinds.RANGE]: new Ability("Arrow", 200, 100, 200, 10, Projectile, 1, new Circle(new Vec2(), 16)),
            [keyBinds.ABILITY1]: new FireballAbility(),
            [keyBinds.ABILITY2]: new WaterballAbility(),
            [keyBinds.ABILITY3]: new PlantSeedAbility(),
        };
        //set up mouse object
        this.mouse = {
            x: null,
            y: null,
            changed: false,
            changeCount: 0,
        };

        //bind the mouse event to the document to control player aiming
        canvas.addEventListener("mousemove", this.mouseEvent.bind(this));

        //if true the player can not use any abilities
        this.silenced = false;
        this.stunned = false;
    }
    //gets a Vec2 that is the look direction and updates lookDirection
    /**
     * @param {Time} time
     * @param {number} dt
     * @param {CollisionEngine} [collisions]
     * @param {CanvasWrapper} [canvas]
     * @param {any} [socket]
     */
    update(time, dt, collisions, canvas, socket) {
        this.moved = false;
        if(this.stunned) return;
        let direction = new Vec2();
        //go fast button
        if (keyPress[keyBinds.JUMP]) {
            this.speed = this.baseSpeed * 2;
        } else this.speed = this.baseSpeed;
        //check all of the different movement keybindings
        if (keyPress[keyBinds.UP]) {
            direction.y -= 1;
        }
        if (keyPress[keyBinds.DOWN]) {
            direction.y += 1;
        }
        if (keyPress[keyBinds.LEFT]) {
            direction.x -= 1;
        }
        if (keyPress[keyBinds.RIGHT]) {
            direction.x += 1;
        }
        if (direction.x || direction.y) {
            this.move(dt, direction);
            this.moved = true;
        }

        // --- Abilities ---

        if (!this.silenced) {
            this.lookDirection = new Vec2(this.mouse.x, this.mouse.y).addS(canvas.topRight).subS(this.location);
            //TODO make melee ability (currently debugging prints this)
            if (keyPress[keyBinds.MELEE]) {
                console.info(this);
                console.info(collisions.dynamics);
            }
            //handle abilities
            for(const key of Object.keys(this.abilities)) {
                //if that ability is pressed use it
                if(keyPress[key]) {
                    const projectile = this.abilities[key].use(time.now, this, this.lookDirection);
                    //if the ability was successful
                    if (projectile) {
                        socket.emit(CHANNELS.newProjectile, projectile.makeObject(), (id) => {
                            projectile.id = id;
                            //add projectile to the collisions
                            collisions.addDynamic(projectile);
                            canvas.addDrawable(projectile);
                        });
                    } else {
                        console.info("On CoolDown");
                    }
                }
            }
        }
    }
    /**
     * Draws player image, crosshair, and healthbar
     * @param {CanvasWrapper} canvas 
     */
    draw(canvas) {
        this.mouse.changed = false; // flag that the mouse coords have been rendered
        // get mouse canvas coordinate correcting for page scroll
        let target = new Vec2(this.mouse.x, this.mouse.y).addS(canvas.topRight);
        //canvas.drawImageLookat(this.image, this.location, target.sub(this.location), this.scale);
        canvas.drawImageLookat(this.image, this.location, this.lookDirection, this.scale, null, null, null, null, this.objectives);
        // Draw mouse at its canvas position
        canvas.drawCrossHair(target, "black");
        // draw line from you center to mouse to check alignment is perfect
        canvas.drawLine(this.location, target, "black", 0.2);
        // draw Health bar
        const healthBarOffset = new Vec2(0, -(this.hitbox.halfWidth + 5));
        const healthBarDimentions = new Vec2(32, 8);
        const origin = this.location.add(healthBarOffset);

        canvas.drawHealthBar(origin, healthBarDimentions, this.currHealth, this.maxHealth);
    }
    mouseEvent(e) {  // get the mouse coordinates relative to the canvas top left
        //let bounds = collisions.canvas.getBoundingClientRect();
        this.mouse.x = e.offsetX;
        this.mouse.y = e.offsetY;
        this.mouse.changed = true;
        this.mouse.changeCount += 1;
    }
    /**
     * @param {number} damage
     * @param {string} hitID
     */
    hurt(damage, hitID) {
        if(this.lastHit === hitID) {
            console.info(hitID, " already hit");
            return;
        }
        console.info("Hit for", damage);
        this.currHealth -= damage;
        if (this.hasUI) {
            //update healthbar and value
            this.healthBar.value = this.currHealth;
            this.healthValue.innerText = this.currHealth.toString();
        }
    }
    kill() {
        super.kill();
        //update healthbar and value
        this.healthBar.value = this.currHealth;
        this.healthValue.innerText = this.currHealth.toString();
    }
}
