import { Effect } from "effect";

type Listener<T> = (a: T) => Effect.Effect<void, never, never>;
export class BatchListener<T> {
    private listeners: Listener<T>[] = [];
    constructor(def: Listener<T>[] = []) {
        this.listeners = def;
    }

    get listener() {
        return (a: T) => Effect.all(this.listeners.map(l => l(a)));
    }

    add(a: Listener<T>) {
        this.listeners.push(a);
    }

    remove(a: Listener<T>) {
        this.listeners = this.listeners.filter(l => l !== a);
    }
}