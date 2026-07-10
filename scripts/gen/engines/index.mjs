// Engine registry. Add a new backend: build the adapter, append it here.
import { flux2Iris } from "./flux2-iris.mjs";
import { sd15Mflux } from "./sd15-mflux.mjs";
import { hostedFal } from "./hosted-fal.mjs";

export const ENGINES = [flux2Iris, sd15Mflux, hostedFal];

export function getEngine(id) {
    const e = ENGINES.find((x) => x.id === id);
    if (!e) {
        throw new Error(
            `Unknown engine "${id}". Known: ${ENGINES.map((x) => x.id).join(", ")}`
        );
    }
    return e;
}
