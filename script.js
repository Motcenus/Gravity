const canvas = document.getElementById('gravityCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Configuration Variables
const G = 6.67430e-11; // Universal Gravitational Constant (m^3 kg^-1 s^-2)
const speedFactor = 2; // Adjust this value to control the speed (1 is normal speed, <1 is slower, >1 is faster)
let springConstant = 0.05; // Spring constant for elasticity
let restLength = 500; // Rest length of the spring
const dampingFactor = 0.05; // Damping factor for friction

let planetRadius = 5; // Fixed radius for all planets
let planetMass = Math.PI * Math.pow(planetRadius, 3); // Mass proportional to volume

let lineOpacity = 0.5; // Opacity of the lines
let planetNumber = 10; // Number of planets

let merging = false; // Flag to control merging
let collide = true; // Default to true
let gravity = true; // Default to true, toggle gravity
let selectedPlanet = null; // Currently selected planet
let hoveringPlanet = null; // Currently hovered planet
let dragging = false; // Is a planet being dragged?
let simulationRunning = true; // Flag to control simulation running state

class Planet {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = planetRadius;
        this.mass = planetMass;
        this.color = color;
        this.dx = Math.random() * 2 - 1;
        this.dy = Math.random() * 2 - 1;
        this.selected = false; // Track if this planet is selected
        this.hover = false; // Track if this planet is hovered
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.selected ? 'red' : (this.hover ? 'lightblue' : this.color);
        ctx.fill();
        ctx.closePath();

        // Draw selection clue if the planet is selected
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2, false);
            ctx.strokeStyle = 'yellow'; // Highlight color
            ctx.lineWidth = 3; // Width of the highlight
            ctx.stroke();
            ctx.closePath();

            // Draw the plus sign
            const plusSize = this.radius * 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x - plusSize, this.y);
            ctx.lineTo(this.x + plusSize, this.y);
            ctx.moveTo(this.x, this.y - plusSize);
            ctx.lineTo(this.x, this.y + plusSize);
            ctx.strokeStyle = 'yellow'; // Color of the plus sign
            ctx.lineWidth = 2; // Width of the plus sign
            ctx.stroke();
        }
    }

    drawConnections(planets) {
        for (let i = 0; i < planets.length; i++) {
            if (this !== planets[i]) {
                const distanceX = planets[i].x - this.x;
                const distanceY = planets[i].y - this.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                // Calculate the gravitational force if gravity is enabled
                let force = 0;
                if (gravity && distance > 0) {
                    force = (G * this.mass * planets[i].mass) / (distance * distance);
                }
                
                const angle = Math.atan2(distanceY, distanceX);

                // Set the line width based on the gravitational force if gravity is enabled
                const lineWidth = gravity ? Math.min(10, Math.max(1, force * 1e-10)) : 1;

                ctx.strokeStyle = `rgba(0, 0, 0, ${lineOpacity})`; // Set line color with opacity
                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(planets[i].x, planets[i].y);
                ctx.stroke();

                // Calculate the spring force
                const springForceMagnitude = springConstant * (distance - restLength);
                const forceX = Math.cos(angle) * springForceMagnitude;
                const forceY = Math.sin(angle) * springForceMagnitude;

                // Apply the spring force
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
        // Reset forces for each update
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

                // Collision detection and merging based on the flags
                if (collide && distance < this.radius + planets[i].radius) {
                    if (merging) {
                        mergePlanets(this, planets[i]);
                        return; // Exit after merging to avoid multiple merges
                    }
                }
            }
        }

        // Apply damping friction
        this.dx *= (1 - dampingFactor);
        this.dy *= (1 - dampingFactor);

        // Apply net forces
        this.applyForce(netFx, netFy);

        // Update position and velocity
        this.x += this.dx * speedFactor;
        this.y += this.dy * speedFactor;

        // Handle canvas boundary collisions
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.dx = -this.dx;
        }

        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.dy = -this.dy;
        }

        this.draw();
    }

    isMouseOver(mx, my) {
        // Adjust mouse detection to be more accurate
        return Math.sqrt((mx - this.x) ** 2 + (my - this.y) ** 2) <= this.radius;
    }
}

function mergePlanets(planet1, planet2) {
    // Calculate new mass and radius
    const newMass = planet1.mass + planet2.mass;
    const newRadius = planetRadius; // Fixed radius for merged planet

    // Average position and velocity
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

// Control Event Listeners
document.getElementById('planetNumber').addEventListener('input', function() {
    planetNumber = parseInt(this.value);
    document.getElementById('planetNumberValue').textContent = this.value;
    // Reset planets array
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
    // Update radius and mass of each planet
    planetMass = Math.PI * Math.pow(planetRadius, 3); // Recalculate mass
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
        animate(); // Restart the animation
    }
});

document.getElementById('endSimulation').addEventListener('click', function() {
    simulationRunning = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Mouse Event Handlers for Selection
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

// Start the initial animation
animate();
