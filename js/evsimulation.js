// EV SIMULATION

window.addEventListener('DOMContentLoaded', function() {
    // We need to wait for the html to be loaded first, otherwise we can't find the elements
    
    // Set up canvas
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');

    // Constants
    const mass              = 180000; // kg
    const payload           = 240000; // kg
    const engineForceMax    = 500000; // N
    const targetSpeed       = 13.88; // 50kph
    const kThrottle         = 1;
    const rollingResistance = 0.02;
    const gravity           = 9.81; // m/s^2
    const sDistance         = [0, 500, 1000, 1500, 2000, 2500];
    const aSlopeAngle       = [0, 0.0997, 0, -0.0997, 0, 0]; // 10% Grade
    const sStops            = [1250, 2500];
    const BattCapacity      = 7000000000; // J
    const Pancillary        = 100000; // W
    const dt    = 0.04; // Time step (seconds)
    var N       = sDistance.length;

    // Hill drawing
    const positionScaling = canvas.width / sDistance[N-1];
    const hillStart = canvas.height - 200;

    // State variables
    let currentStop         = sStops[0];
    let currentTargetSpeed  = targetSpeed;
    let currentMass         = mass;
    let position            = 0; // m
    let positionPrev        = 0; // m
    let altitude            = 0; // m
    let velocity            = 0; // m/s
    let acceleration        = 0; // m/s^2
    let currentSlope        = 0; // radians
    let efficiency          = 0.7;
    let PBattery            = 0; // W
    let EBattery            = BattCapacity * 0.8; // J

    // Simulation loop
    function update() {
        // Find the slope:
        for (var i = 0; i < N; i++) {
            if (position >= sDistance[i]){
                currentSlope = aSlopeAngle[i];
            }
        }

        // Find the target speed:
        const distanceToStop = currentStop - position;
        if (distanceToStop < 100) {
            TargetDecel         = -1 * (velocity * velocity) / (2 * distanceToStop);
            currentTargetSpeed  = Math.max(0, currentTargetSpeed + TargetDecel * dt);
            if (velocity < 0.1){
                currentStop = sStops.at(-1);
            }
        }else{
            currentTargetSpeed  = targetSpeed;
        }

        // Find the current mass:
        if (position <= (sDistance.at(-1) / 2)){
            currentMass = mass;
        }else{
            currentMass = mass + payload;
        }
        
        // Engine Force:
        const throttle          = Math.max(-1, Math.min(1, (currentTargetSpeed - velocity) * kThrottle));
        const engineForce       = throttle * engineForceMax;

        // Battery Power:
        if (engineForce > 0){
            PBattery = ((engineForce * velocity) / efficiency) + Pancillary;
        } else if (engineForce < 0){
            PBattery = ((engineForce * velocity) * efficiency) + Pancillary;
        } else {
            PBattery = Pancillary;
        }
        // Forces
        const gravityForce      = currentMass * gravity * Math.sin(currentSlope);
        const resistanceForce   = rollingResistance * currentMass * gravity;
        const netForce          = engineForce - (gravityForce + resistanceForce);

        // Acceleration, velocity, and position
        acceleration = netForce / currentMass;
        velocity += acceleration * dt;
        velocity = Math.max(velocity, 0);
        position += velocity * dt;
        altitude += (position - positionPrev) * Math.tan(currentSlope);
        positionPrev = position;
        EBattery -= PBattery * dt;

        // Reset if necessary:
        if (position > sDistance.at(-1)){
            position = 0; // m
            positionPrev = 0; // m
            altitude = 0; // m
            velocity = 0; // m/s
            acceleration = 0; // m/s^2
            currentSlope = 0; // radians
            EBattery     = BattCapacity * 0.8;
        }
        // Draw the scene
        draw();

        // Continue the simulation
        requestAnimationFrame(update);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hill
      ctx.beginPath();
      var hillY = hillStart;
      for(var i = 0; i < N-1; i++) {
        ctx.moveTo(sDistance[i] * positionScaling, hillY);
        hillY = hillY - Math.tan(aSlopeAngle[i]) * (sDistance[i+1] - sDistance[i]);
        ctx.lineTo(sDistance[i+1] * positionScaling, hillY);
      }
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw truck
      const truckX = position * positionScaling;
      const truckY = hillStart - altitude;
      ctx.fillStyle = '#0b1d43';
      ctx.fillRect(truckX-25 , truckY - 20, 50, 20); // Truck as a rectangle

      // Draw Fortescue logo:
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(truckX, truckY-10, 6, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw the payload:
      ctx.fillStyle = '#400000';
      if (currentMass > mass){
        ctx.fillRect(truckX-20 , truckY - 35, 15, 15); // Payload
      }else{
        ctx.fillRect((canvas.width / 2) - 15, 35, 15, 15); // Payload
      }

      // Add the information:
      ctx.strokeStyle = '#666';
      ctx.fillStyle = '#0b1d43';
      ctx.strokeRect(70, 150, 40, 100);
      ctx.fillRect(70, 150 + (100 - (velocity * 3.6 * 2)), 40, velocity * 3.6 * 2);
      const velocityKph = velocity * 3.6; // Convert m/s to kph
      ctx.font = "20px Arial";
      ctx.fillText(`Velocity: ${velocityKph.toFixed(2)} kph`, 10, 280); // Display velocity

      const masst = currentMass / 1000; // Convert kg to tonne
      ctx.fillStyle = 'black';
      ctx.fillText(`Mass: ${masst.toFixed(2)} tonne`, 200, 100); // Display mass

      // Battery Power:
      ctx.strokeRect(280, 150, 40, 100);
      const Powerkw = PBattery / 1000; // W to kW
      if (PBattery > 0){
        ctx.fillStyle = 'green';
        ctx.fillRect(280, 150 + (50 - (PBattery / 200000)), 40, PBattery / 200000);
        ctx.fillText(`Power: ${Powerkw.toFixed(2)} kW`, 220, 280);
      } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(280, 200, 40, -1 * PBattery / 200000);
        ctx.fillText(`Power: ${Powerkw.toFixed(2)} kW`, 220, 280);
      }

      // Battery SoC:
      ctx.strokeRect(480, 150, 40, 100);
      ctx.fillStyle = '#00ff00';
      const SoC = EBattery / BattCapacity * 100;
      ctx.fillRect(480, 150 + (100 - SoC), 40, SoC);
      ctx.fillStyle = 'black';
      ctx.fillText(`Battery: ${SoC.toFixed(2)} %`, 440, 280);
    }

    // Start the simulation
    update();

});
