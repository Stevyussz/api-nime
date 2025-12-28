import * as v from "valibot";

const animesailSchema = {
    query: {
        search: v.object({
            q: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
        }),
    },
};

export default animesailSchema;
