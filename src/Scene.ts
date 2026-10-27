import type { Entity } from "./Entity.ts";
import type { ComponentConstructor } from "./Utils.ts";

/** The scene containing all entities. */
export class Scene {
    private _entities: Entity[] = [];

    get entities() {
        return this._entities;
    }

    /**
     * Adds entity to the scene.
     * @param entity Entity object to add to the scene
     */
    addEntity(entity: Entity) {
        this._entities.push(entity);
    }

    /**
     * Removes the entity from the scene.
     * @param entity Entity object to remove from the scene
     */
    removeEntity(entity: Entity) {
        let i = this._entities.indexOf(entity);
        if (i !== -1) {
            this._entities.splice(i, 1);
        }
    }

    /**
     * Retrieves all entities containing the specific component. Usage: getEntitiesByComponent(Camera).
     * @param componentType The constructor of a specific component, e.g., Camera, Mesh, ...
     * @returns List of entities
     */
    getEntitiesByComponent(componentType: ComponentConstructor): Entity[] {
        const entities = [];
        for (const entity of this._entities) {
            if (entity.getComponent(componentType)) {
                entities.push(entity);
            }
        }
        return entities;
    }

    /**
     * Retrieves the entity with the given name if it exists. May return null otherwise.
     * @param name name of the entity
     * @returns the entity or null
     */
    getEntityByName(name: string) {
        for (const entity of this._entities) {
            if (entity.name === name) {
                return entity;
            }
        }
        return null;
    }
}