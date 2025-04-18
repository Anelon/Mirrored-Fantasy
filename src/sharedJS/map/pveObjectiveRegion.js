import { OBJECTIVE_COLORS } from "../utils/enums.js";
import Region from "./region.js";
/** @typedef {import("../player.js").default} Player */

export default class PVEObjectiveRegion extends Region {
    /**
     * @param {import("../vec2").default} center
     * @param {import("../vec2").default} dimentions
     * @param {string} name
     */
    constructor(center, dimentions, name) {
        super(center, dimentions, name, OBJECTIVE_COLORS[name]);
        this.locked = true;
    }
    /**
     * placeholder for regions that need to do something when first player begins overlap will probably just be used for the PVE dungeon to start AI
     * @param {Player} player
     */
    beginOverlap(player) {
        player.objectives.add(this.color);
    }
}