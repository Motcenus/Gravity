const canvas = document.getElementById('gravityCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const G = 6.67430e-11;
const speedFactor = 2;
let springConstant = 0.05;
let restLength = 500;
const dampingFactor = 0.05;

let planetRadius = 5;
let planetMass = Math.PI * Math.pow(planetRadius, 3);

let lineOpacity = 0.5;
let planetNumber = 10;

let merging = false;
let collide = true;
let gravity = true;
let selectedPlanet = null;
let hoveringPlanet = null;
let dragging = false;
let simulationRunning = true;

class Planet {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = planetRadius;
        this.mass = planetMass;
        this.color = color;
        this.dx = Math.random() * 2 - 1;
        this.dy = Math.random() * 2 - 1;
        this.selected = false;
        this.hover = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.selected ? 'red' : (this.hover ? 'lightblue' : this.color);
        ctx.fill();
        ctx.closePath();

        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2, false);
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();

            const plusSize = this.radius * 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x - plusSize, this.y);
            ctx.lineTo(this.x + plusSize, this.y);
            ctx.moveTo(this.x, this.y - plusSize);
            ctx.lineTo(this.x, this.y + plusSize);
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    drawConnections(planets) {
        for (let i = 0; i < planets.length; i++) {
            if (this !== planets[i]) {
                const distanceX = planets[i].x - this.x;
                const distanceY = planets[i].y - this.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                let force = 0;
                if (gravity && distance > 0) {
                    force = (G * this.mass * planets[i].mass) / (distance * distance);
                }
                
                const angle = Math.atan2(distanceY, distanceX);

                const lineWidth = gravity ? Math.min(10, Math.max(1, force * 1e-10)) : 1;

                ctx.strokeStyle = `rgba(0, 0, 0, ${lineOpacity})`;
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(planets[i].x, planets[i].y);
                ctx.stroke();

                const springForceMagnitude = springConstant * (distance - restLength);
                const forceX = Math.cos(angle) * springForceMagnitude;
                const forceY = Math.sin(angle) * springForceMagnitude;

                this.applyForce(forceX, forceY);
                planets[i].applyForce(-forceX, -forceY);
            }
        }
    }

    applyForce(fx, fy) {
        this.dx += fx / this.mass;
        this.dy += fy / this.mass;
    }

    update(planets) {
        let netFx = 0;
        let netFy = 0;

        for (let i = 0; i < planets.length; i++) {
            if (this !== planets[i]) {
                const distanceX = planets[i].x - this.x;
                const distanceY = planets[i].y - this.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                if (distance > 0) {
                    let force = 0;
                    if (gravity) {
                        force = (G * this.mass * planets[i].mass) / (distance * distance);
                    }
                    const angle = Math.atan2(distanceY, distanceX);
                    const forceX = Math.cos(angle) * force;
                    const forceY = Math.sin(angle) * force;

                    netFx += forceX;
                    netFy += forceY;
                }

                if (collide && distance < this.radius + planets[i].radius) {
                    if (merging) {
                        mergePlanets(this, planets[i]);
                        return;
                    }
                }
            }
        }

        this.dx *= (1 - dampingFactor);
        this.dy *= (1 - dampingFactor);

        this.applyForce(netFx, netFy);

        this.x += this.dx * speedFactor;
        this.y += this.dy * speedFactor;

        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.dx = -this.dx;
        }

        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.dy = -this.dy;
        }

        this.draw();
    }

    isMouseOver(mx, my) {
        return Math.sqrt((mx - this.x) ** 2 + (my - this.y) ** 2) <= this.radius;
    }
}

function mergePlanets(planet1, planet2) {
    const newMass = planet1.mass + planet2.mass;
    const newRadius = planetRadius;

    const newX = (planet1.x * planet1.mass + planet2.x * planet2.mass) / newMass;
    const newY = (planet1.y * planet1.mass + planet2.y * planet2.mass) / newMass;
    const newDx = (planet1.dx * planet1.mass + planet2.dx * planet2.mass) / newMass;
    const newDy = (planet1.dy * planet1.mass + planet2.dy * planet2.mass) / newMass;

    const newPlanet = new Planet(newX, newY, planet1.color);
    newPlanet.dx = newDx;
    newPlanet.dy = newDy;
    newPlanet.mass = newMass;
    newPlanet.radius = newRadius;

    planets = planets.filter(p => p !== planet1 && p !== planet2);
    planets.push(newPlanet);
}

let planets = [];
for (let i = 0; i < planetNumber; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
    planets.push(new Planet(x, y, color));
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < planets.length; i++) {
        planets[i].drawConnections(planets);
    }

    for (let i = 0; i < planets.length; i++) {
        planets[i].update(planets);
    }

    if (simulationRunning) {
        requestAnimationFrame(animate);
    }
}

document.getElementById('planetNumber').addEventListener('input', function() {
    planetNumber = parseInt(this.value);
    document.getElementById('planetNumberValue').textContent = this.value;
    planets = [];
    for (let i = 0; i < planetNumber; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        planets.push(new Planet(x, y, color));
    }
});

document.getElementById('planetRadius').addEventListener('input', function() {
    planetRadius = parseFloat(this.value);
    document.getElementById('planetRadiusValue').textContent = this.value;
    planetMass = Math.PI * Math.pow(planetRadius, 3);
    planets.forEach(planet => {
        planet.radius = planetRadius;
        planet.mass = planetMass;
    });
});

document.getElementById('springConstant').addEventListener('input', function() {
    springConstant = parseFloat(this.value);
    document.getElementById('springConstantValue').textContent = this.value;
});

document.getElementById('restLength').addEventListener('input', function() {
    restLength = parseFloat(this.value);
    document.getElementById('restLengthValue').textContent = this.value;
});

document.getElementById('lineOpacity').addEventListener('input', function() {
    lineOpacity = parseFloat(this.value);
    document.getElementById('lineOpacityValue').textContent = this.value;
});

document.getElementById('startSimulation').addEventListener('click', function() {
    if (simulationRunning) {
        simulationRunning = false;
        this.textContent = 'Start Simulation';
    } else {
        simulationRunning = true;
        this.textContent = 'Pause Simulation';
        animate();
    }
});

document.getElementById('endSimulation').addEventListener('click', function() {
    simulationRunning = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    selectedPlanet = null;

    planets.forEach(planet => {
        if (planet.isMouseOver(mouseX, mouseY)) {
            selectedPlanet = planet;
            dragging = true;
        }
    });
});

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    hoveringPlanet = null;
    planets.forEach(planet => {
        planet.hover = false;
        if (planet.isMouseOver(mouseX, mouseY)) {
            hoveringPlanet = planet;
            planet.hover = true;
        }
    });

    if (dragging && selectedPlanet) {
        selectedPlanet.x = mouseX;
        selectedPlanet.y = mouseY;
    }
});

canvas.addEventListener('mouseup', function() {
    dragging = false;
});

animate();
