import type { Component } from "./Component.ts";
import type { ComponentConstructor } from "./Utils.ts";


/**
 * The game entity. Entity can be an in-game object,
 * camera, specific system, force, collider, etc.
 * Entity contains components that define its properties.
 */
export class Entity {
    name: string | null = null;
    private _parent: Entity | null = null;
    private _components = new Map<ComponentConstructor<any>, any>();

    /**
     * Adds a component. Keep in mind that an entity can have **only one** component of each type!
     * @param component A component to add to the entity; should implement interface {@link Component}
     */
    addComponent<T extends Component>(component: T) {
        this._components.set(component.constructor as ComponentConstructor<T>, component);
    }

    /**
     * Retrieves the component of the provided type
     * from the entity if the component of that type
     * exists on the entity.
     * @param componentType The constructor of specific component
     * @returns Component or undefined
     */
    getComponent<T extends Component>(componentType: ComponentConstructor<T>): T | undefined {
        return this._components.get(componentType);
    }

    /**
     * Removes the component of provided type from the entity.
     * @param componentType The constructor of specific component
     */
    removeComponent<T extends Component>(componentType: ComponentConstructor<T>) {
        this._components.delete(componentType);
    }

    get parent() {
        return this._parent;
    }

    set parent(parent: Entity | null) {
        this._parent = parent;
    }
}