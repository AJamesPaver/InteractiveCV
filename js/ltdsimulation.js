// EV SIMULATION

window.addEventListener('DOMContentLoaded', function() {
  // We need to wait for the html to be loaded first, otherwise we can't find the elements
  
  // --- GLOBALS ---
  let scene, camera, renderer, car, container, payload, oreCars, ground;
  let lastcar;
  let simData = [];
  let isLoaded = false;

  let truckRotationY = -Math.PI / 2
  let truckRotationX = 0
  let truckRotationZ = 0

  let orecarlength = 10;

  let cameraOrbitAngle = 0;

  let currentIndex = 0;
  const clock = new THREE.Clock();
  let playbackSpeed = 25.0; // multiplier to speed up or slow down playback
  let currentSimTime = 0;  // tracks where we are in the simulation timeline

  let cameraStartTime = performance.now();

  const payloadOffset = new THREE.Vector3(0, 1.1, 0); // local offset (in car space)

  // --- LOAD CSV DATA ---
  Papa.parse('data/RouteData_Train.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      const trackData = results.data;
      // Copy the first row:
      const firstRow = { ...trackData[0] };
      const offset = -100;
      firstRow["distance_m"] = firstRow["distance_m"] + offset;
      firstRow["elevation_m"] = 0;
      trackData.unshift(firstRow);
      initScene(trackData);
    }
  });

  // - Load the Sim Data:
  Papa.parse('data/simulation_log_train_20251101_150955.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      simData = results.data.filter(d => d.time_s !== null && d.time_s !== undefined && !isNaN(d.time_s));
      initPlot();
      animate();
    }
  });

  // ----------------------------------------------------------------------------------------
  // --- INITIALIZE 3D SCENE ---
  function initScene(trackData) {
    container = document.getElementById('scene-container');
    scene = new THREE.Scene();
    const color = new THREE.Color( 0x87CEEB );
    scene.background = color;
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 10000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threeD-canvas'), antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // === Lighting ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 100, 50);
    scene.add(directional);

    // === Draw track as a ramp ===

    // Extract top edge of ramp (elevation profile)
    const topEdge = trackData.map(p => new THREE.Vector2(p.distance_m, p.elevation_m));

    // Create bottom edge along the ground (same x distances, y=0)
    const bottomEdge = [...trackData]
      .reverse()
      .map(p => new THREE.Vector2(p.distance_m, 0));

    // Combine to form a closed ramp outline
    const rampOutline = [...topEdge, ...bottomEdge];

    // Create shape and extrude
    const rampShape = new THREE.Shape(rampOutline);
    const roadWidth = 20; // total width of road (so ±5 in z)
    const extrudeSettings = { depth: roadWidth, bevelEnabled: false };

    const rampGeometry = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
    // Center the geometry around z = 0 (by default it extends in +Z)
    rampGeometry.translate(0, 0, -roadWidth / 2);
    const rampMaterial = new THREE.MeshPhongMaterial({ color: 0x696969 });
    const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);

    scene.add(rampMesh);

    // === Add route line for context ===
    let trackWidth = 2
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x808080 });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(
      trackData.map(p => new THREE.Vector3(p.distance_m, p.elevation_m, trackWidth/2))
    );
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    // Add second line:
    const lineMaterial2 = new THREE.LineBasicMaterial({ color: 0x808080 });
    const lineGeometry2 = new THREE.BufferGeometry().setFromPoints(
      trackData.map(p => new THREE.Vector3(p.distance_m, p.elevation_m, -trackWidth/2))
    );
    const line2 = new THREE.Line(lineGeometry2, lineMaterial2);
    scene.add(line2);

    // === Add ground plane for context ===
    // Define your location (longitude, latitude, zoom)
    const lon = 118.5646;
    const lat = -20.4409;
    const zoom = 12;
    const mapWidth = 1024;
    const mapHeight = 1024;

    // Calculate ground resolution for this latitude and zoom
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
    const textureWidthMeters = metersPerPixel * mapWidth;
    const textureHeightMeters = metersPerPixel * mapHeight;

    // Use Mapbox Static API
    const mapURL = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom}/${mapWidth}x${mapHeight}?access_token=pk.eyJ1IjoiYWphbWVzcGF2ZXIiLCJhIjoiY21oajhkNzh1MHV3azJtcXY4cWY2ejgweCJ9.6xL-0YVHhDldc_X_teIXTQ`;

    const groundloader = new THREE.TextureLoader();
    const groundTexture = groundloader.load(mapURL, () => {
      groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;

      const planeWidth = 60000;  // meters
      const planeHeight = 5000;  // meters
      // Match real-world scale
      groundTexture.repeat.set(planeWidth / textureWidthMeters, planeHeight / textureHeightMeters);

      const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
      ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 5000), groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = Math.min(...trackData.map(p => p.elevation_m)) - 1;
      ground.position.x = 25000;
      scene.add(ground);
    });

    // === Load the MAIN car/locomotive: ===

    // instantiate a loader
    const loader = new THREE.GLTFLoader();

    // load a resource
    loader.load(
      // resource URL
      'data/train_-_british_rail_class_08_rail_blue_livery/scene.gltf',
      // called when resource is loaded
      function ( object ) {
        car = object.scene;
        //car.scale.set(1, 1, 1); // adjust scaling as needed
        car.position.set(0, 0, 0);
        car.rotation.x = truckRotationX;
        car.rotation.z = truckRotationZ;

        // Add the last car:
        lastcar = car.clone(true);
        lastcar.position.set(0, 0, 0);
        lastcar.rotation.x = truckRotationX;
        lastcar.rotation.z = truckRotationZ;

        scene.add( car );
        scene.add( lastcar );
        isLoaded = true;
      },
      // called when loading is in progress
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( 'An error happened' );
      }
    );

    // === Create Ore Car Geometry ===
    const oreCarGeom = new THREE.BoxGeometry(orecarlength, 2, 2);  // width, height, depth
    const oreCarMat = new THREE.MeshPhongMaterial({ color: 0xD3D3D3 });

    // Create array to store ore cars
    oreCars = [];

    for (let i = 1; i <= 18; i++) {
        const carMesh = new THREE.Mesh(oreCarGeom, oreCarMat);
        carMesh.position.set(0, 0, 0); // initial position
        scene.add(carMesh);
        oreCars.push(carMesh);
    }

    // --- Create payload geometry ---
    payload = [];
    const payloadGeometry = new THREE.BoxGeometry(orecarlength*0.9, 1.5, 1.5);  // width, height, depth
    const payloadMaterial = new THREE.MeshPhongMaterial({ color: 0x6F4E37 });

    for (let i = 1; i <= 18; i++) {
        const payloadMesh = new THREE.Mesh(payloadGeometry, payloadMaterial);
        payloadMesh.position.set(0, 0, 0); // initial position
        scene.add(payloadMesh);
        payload.push(payloadMesh);
    }

    camera.position.set(0, 0, 0);
    camera.lookAt(0,0,0);
  }

  // ----------------------------------------------------------------------------------------
  // --- INITIALIZE PLOT ---
  function initPlot() {
    const time = simData.map(d => d.time_s);

    const traceSpeed = {
      x: time,
      y: simData.map(d => d.Vehicle_0_speed_kph),
      name: 'Speed (kph)',
      line: {color: 'teal'},
      yaxis: 'y1'
    };

    const traceElevation = {
      x: time,
      y: simData.map(d => d.Vehicle_0_elevation_m),
      name: 'Elevation (m)',
      line: {color: 'purple'},
      yaxis: 'y2'
    };

    const traceSOC = {
      x: time,
      y: simData.map(d => d.Vehicle_0_battery_soc_perc),
      name: 'SOC (%)',
      line: {color: 'orange'},
      yaxis: 'y3'
    };

    // Create empty bar chart initially
    const firstRow = simData[0];
    const drawbarNames = Object.keys(firstRow).filter(k => k.startsWith('Drawbar_') && k.endsWith('_force_kN'));
    const initialForces = drawbarNames.map(() => 0);
    const xLabels = drawbarNames.map(name => name.match(/Drawbar_(\d+)_/)[1]);
    const traceBars = {
        x: xLabels,
        y: initialForces,
        type: 'bar',
        name: 'Drawbar Forces',
        marker: { color: '#0096aa' },
        xaxis: 'x2',
        yaxis: 'y5'
    };

    const layout = {
      title: 'Simulation Data',
      showlegend: false,
      height: 600,
      margin: {t: 40, b: 40, l: 50, r: 10},
      grid: {rows: 4, columns: 1, pattern: 'independent'},
      xaxis: {title: {text: 'Time (s)'}, domain: [0, 1]},
      yaxis: {title: {text: 'Speed (kph)'}, domain: [0.84, 1.0]},
      yaxis2: {title: {text: 'Elevation (m)'}, domain: [0.63, 0.79]},
      yaxis3: {title: {text: 'SOC (%)'}, domain: [0.42, 0.58]},
      yaxis5: { title: {text: 'Force (kN)'}, range: [-200, 200], domain: [0.0, 0.37] },
      xaxis2: { title: {text: 'Drawbars'}, anchor: 'y5' },
      shapes: [
        {
          type: 'line',
          x0: 0, x1: 0,
          y0: 0, y1: 1,
          xref: 'x',
          yref: 'paper',
          line: {color: 'red', width: 2, dash: 'dot'}
        }
      ],
      annotations: []
    };

    const data = [traceSpeed, traceSOC, traceElevation, traceBars];
    Plotly.newPlot('plot', data, layout);
  }
  
  // ----------------------------------------------------------------------------------------
  // --- UPDATE PLOT ---
  function updatePlot(currentSimTime) {
    const idx = simData.findIndex(d => d.time_s >= currentSimTime);
    if (idx <= 0 || idx >= simData.length) return;

    const d1 = simData[idx - 1];
    const d2 = simData[idx];
    const t = (currentSimTime - d1.time_s) / (d2.time_s - d1.time_s);

    const speed = d1.Vehicle_0_speed_kph + (d2.Vehicle_0_speed_kph - d1.Vehicle_0_speed_kph) * t;
    const soc = d1.Vehicle_0_battery_soc_perc + (d2.Vehicle_0_battery_soc_perc - d1.Vehicle_0_battery_soc_perc) * t;
    const grade = d1.Vehicle_0_trackgrade_perc + (d2.Vehicle_0_trackgrade_perc - d1.Vehicle_0_trackgrade_perc) * t;
    const power = d1.Vehicle_0_battery_power_kW + (d2.Vehicle_0_battery_power_kW - d1.Vehicle_0_battery_power_kW) * t;

    // Extract drawbar forces dynamically
    const drawbarKeys = Object.keys(d2).filter(k => k.startsWith("Drawbar_") && k.endsWith("_force_kN"));
    const drawbarValues = drawbarKeys.map(k => d2[k]);

    // Update the bar chart dynamically
    Plotly.update('plot', {
        y: [drawbarValues]  // update bar chart y-values
        }, {}, [3]); // index 3 = fourth trace (bar chart)
    
    const update = {
      'shapes[0].x0': currentSimTime,
      'shapes[0].x1': currentSimTime,
      'annotations': [
        {
          x: 0.5,
          y: 1.05,
          xref: 'paper',
          yref: 'paper',
          text: `
            <b>t = ${currentSimTime.toFixed(2)}s</b> 
            Speed = ${speed.toFixed(1)} kph
            SOC = ${soc.toFixed(1)}% 
            Power = ${power.toFixed(1)}kW 
            Gradient = ${grade.toFixed(2)}%
          `,
          showarrow: false,
          align: 'center',
          font: {size: 12, color: '#333'}
        }
      ]
    };

    Plotly.relayout('plot', update);
  }

  // ----------------------------------------------------------------------------------------
  // --- Smooth chase camera that follows a moving vehicle ---
  function updateChaseCamera(car, camera, deltaTime, options = {}) {
    // Default configuration
    const {
      offset = new THREE.Vector3(40, 20, 40),   // Camera offset in car local space
      lookAhead = new THREE.Vector3(0, 0, 20),  // Point ahead of the car to look at
      followStrength = 4.0,                     // Higher = faster follow (LERP factor)
      rotationLag = 0.15,                       // How much the camera lags behind car rotation
      orbitSpeed = 0.01,                        // Orbit speed in rad/s
      introHeightBoost = 500,                    // How much higher to start
      introDistanceLag = 1000,                  // How much further back to start
      introDuration = 20.0                       // Duration in seconds to settle to normal height
    } = options;

    // --- Step 0: Compute time since start ---
    const elapsed = (performance.now() - cameraStartTime) / 1000.0;
    const t = Math.min(elapsed / introDuration, 1.0); // Normalized 0→1 over introDuration

    // Smooth interpolation (ease-out)
    const ease = 1 - Math.pow(1 - t, 3); // smooth cubic easing

    // --- Step 1: Compute dynamic height offset ---
    const currentY = offset.y + (1 - ease) * introHeightBoost;
    const currentZ = (1 - ease) * introDistanceLag;

    // --- Step 2: Update the orbit angle ---
    cameraOrbitAngle = cameraOrbitAngle + (orbitSpeed * deltaTime);

    // --- Step 3: Compute the orbiting camera position: ---
    const radius = Math.sqrt(offset.x ** 2 + offset.z ** 2);
    const orbitX = Math.sin(cameraOrbitAngle) * radius;
    const orbitZ = (Math.cos(cameraOrbitAngle) * radius) + currentZ;
    const newOffset = new THREE.Vector3(orbitX, currentY, orbitZ);

    // --- Step 4: Compute desired camera position ---
    const desiredOffset = newOffset.clone().applyQuaternion(car.quaternion);
    const desiredPosition = car.position.clone().add(desiredOffset);

    if (!isNaN(desiredPosition.x) && !isNaN(desiredPosition.y) && !isNaN(desiredPosition.z)){
      // --- Step 5: Smoothly move the camera towards that position ---
      camera.position.lerp(desiredPosition, 1 - Math.exp(-followStrength * deltaTime));
    }
    // --- Step 6: Compute look-ahead target ---
    const lookAtTarget = car.position.clone().add(
      lookAhead.clone().applyQuaternion(car.quaternion)
    );

    // --- Step 7: Smoothly rotate camera towards target (optional rotation lag) ---
    const currentDir = new THREE.Vector3();
    camera.getWorldDirection(currentDir);

    const desiredDir = lookAtTarget.clone().sub(camera.position).normalize();
    currentDir.lerp(desiredDir, rotationLag);

    if (!isNaN(currentDir.x) && !isNaN(currentDir.y) && !isNaN(currentDir.z)){
      const finalTarget = camera.position.clone().add(currentDir);
      camera.lookAt(finalTarget);
    }
  }

  // ----------------------------------------------------------------------------------------
  // --- UPDATE PAYLOAD ---
  function updatePayload(oreCars, payload, showPayload) {
    for (let i = 1; i <= 18; i++) {
      const thisPayload = payload[i - 1]; // mesh index starts at 0
      const thisOreCar = oreCars[i - 1]; // mesh index starts at 0
      // Compute payload position in world space
      const worldOffset = payloadOffset.clone().applyQuaternion(thisOreCar.quaternion);
      thisPayload.position.copy(thisOreCar.position.clone().add(worldOffset));

      // Make the payload follow car’s rotation (optional)
      thisPayload.quaternion.copy(thisOreCar.quaternion);

      // Show/hide based on signal
      thisPayload.visible = !!showPayload;
    }
  }

  // ----------------------------------------------------------------------------------------
  // --- ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);

      if (isLoaded) {

        if (simData.length === 0) return;

        // How much real time has passed since last frame
        const delta = clock.getDelta();
        const deltaTime = (currentSimTime + delta * playbackSpeed) - currentSimTime
        currentSimTime += delta * playbackSpeed;

        // Advance to the correct point in the data based on time
        while (
          currentIndex < simData.length - 2 &&
          currentSimTime > simData[currentIndex + 1].time_s
        ) {
          currentIndex++;
        }

        // Get current and next points
        const d1 = simData[currentIndex];
        const d2 = simData[currentIndex + 1];

        // Compute interpolation factor between 0 and 1
        const t = (currentSimTime - d1.time_s) / (d2.time_s - d1.time_s);

        // Linear interpolation of position
        car.position.x = d1.Vehicle_0_cycledistance_m + (d2.Vehicle_0_cycledistance_m - d1.Vehicle_0_cycledistance_m) * t;
        car.position.y = d1.Vehicle_0_elevation_m + (d2.Vehicle_0_elevation_m - d1.Vehicle_0_elevation_m) * t;

        // Rotate:
        let heading = truckRotationY + ((Math.PI / 180) * (d1.Vehicle_0_heading_deg + (d2.Vehicle_0_heading_deg - d1.Vehicle_0_heading_deg) * t));
        if (heading >= (2 * Math.PI)){
          heading = heading - (2 * Math.PI)
        }
        car.rotation.y = heading;

        // Update Ore Car Positions:
        for (let i = 1; i <= 18; i++) {
            const thisOreCar = oreCars[i - 1]; // mesh index starts at 0

            thisOreCar.position.x = d1[`Vehicle_${i}_cycledistance_m`] + (d2[`Vehicle_${i}_cycledistance_m`] - d1[`Vehicle_${i}_cycledistance_m`]) * t;
            thisOreCar.position.y = 1 + d1[`Vehicle_${i}_elevation_m`] + (d2[`Vehicle_${i}_elevation_m`] - d1[`Vehicle_${i}_elevation_m`]) * t;

        }

        // Update the LAST car:
        lastcar.position.x = d1.Vehicle_19_cycledistance_m + (d2.Vehicle_19_cycledistance_m - d1.Vehicle_19_cycledistance_m) * t;
        lastcar.position.y = d1.Vehicle_19_elevation_m + (d2.Vehicle_19_elevation_m - d1.Vehicle_19_elevation_m) * t;

        // Rotate:
        heading = truckRotationY + ((Math.PI / 180) * (d1.Vehicle_19_heading_deg + (d2.Vehicle_19_heading_deg - d1.Vehicle_19_heading_deg) * t));
        if (heading >= (2 * Math.PI)){
          heading = heading - (2 * Math.PI)
        }
        lastcar.rotation.y = heading;

        // Update payload:
        const showPayload = d1.Vehicle_1_payloadpresent > 0;
        updatePayload(oreCars, payload, showPayload);

        // Update the chase camera
        updateChaseCamera(car, camera, deltaTime, {
          offset: new THREE.Vector3(40, 20, 40),
          lookAhead: new THREE.Vector3(0, 0, 20),
          followStrength: 3.5,
          rotationLag: 0.2,
          orbitSpeed: 0.01
        });

        // update chart cursor
        updatePlot(currentSimTime);

        // Optional: restart when reaching end
        if (currentIndex >= simData.length - 2) {
          currentIndex = 0;
          currentSimTime = 0;
          clock.start();
        }

        renderer.render(scene, camera);
      }
  }

  // ----------------------------------------------------------------------------------------
  // --- RESIZE HANDLER ---
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

});
