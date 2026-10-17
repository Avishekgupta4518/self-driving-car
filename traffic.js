// Endless, seeded traffic. Every row always keeps at least one free lane and
// the free lane moves by at most one lane between rows, so the road is always
// passable. Using a seed means every generation faces the same traffic and
// the "record" distance is comparable between generations.
// The traffic also gets denser the further you drive (a gentle difficulty ramp),
// so a brand-new brain first learns to dodge single cars before it has to
// thread through full rows.
class Traffic {
    constructor(road, startY, seed) {
        this.road = road;
        this.startY = startY;
        this.reset(seed);
    }

    reset(seed) {
        this.seed = seed;
        this.rng = mulberry32(seed);
        this.cars = [];
        this.freeLane = 1;
        this.row = 0;
    }

    update(leaderY, lookAhead) {
        for (let i = 0; i < this.cars.length; i++) {
            this.cars[i].update(this.road.borders, []);
        }

        let front = this.startY;
        if (this.cars.length) {
            front = Infinity;
            for (const c of this.cars) if (c.y < front) front = c.y;
        }
        while (front > leaderY - lookAhead) {
            front = this.#spawnRow(front);
        }

        // forget traffic that is far behind everybody
        const limit = leaderY + 900;
        if (this.cars.length && this.cars[0].y > limit) {
            this.cars = this.cars.filter(c => c.y < limit);
        }
    }

    #spawnRow(front) {
        const rng = this.rng;
        const laneCount = this.road.laneCount;

        const y = front - (190 + rng() * 90);

        const r = rng();
        const delta = r < 0.33 ? -1 : (r < 0.66 ? 0 : 1);
        this.freeLane = clamp(this.freeLane + delta, 0, laneCount - 1);

        const density = clamp(0.3 + this.row * 0.04, 0.3, 0.85);
        this.row++;

        const wants = [];
        const hues = [];
        for (let lane = 0; lane < laneCount; lane++) {
            wants.push(rng() < density);
            hues.push((290 + rng() * 260) % 360);
        }
        wants[this.freeLane] = false;
        if (!wants.some(Boolean)) {
            wants[(this.freeLane + 1) % laneCount] = true;
        }

        for (let lane = 0; lane < laneCount; lane++) {
            if (!wants[lane]) continue;
            this.cars.push(new Car(
                this.road.getLaneCenter(lane), y, 30, 50, "DUMMY", 2,
                "hsl(" + hues[lane] + ", 95%, 62%)"
            ));
        }
        return y;
    }
}
